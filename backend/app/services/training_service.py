import os
import json
import time
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import accuracy_score, f1_score

from app.utils.config import settings
from app.utils.constants import EMOTIONS, MAX_EPOCHS_LIMIT, DEFAULT_EPOCHS, DEFAULT_BATCH_SIZE, DEFAULT_PATIENCE
from app.models.cnn_emotion_model import EmotionCNN
from app.preprocessing.audio_pipeline import load_audio, generate_mel_spectrogram
from app.services.dataset_service import dataset_service
from app.utils.logger import logger

class SpectrogramDataset(Dataset):
    """PyTorch Dataset loading Log-Mel spectrograms on the fly with in-memory caching."""
    def __init__(self, records: List[Dict[str, Any]], class_to_idx: Dict[str, int]):
        self.records = records
        self.class_to_idx = class_to_idx
        self.cache: Dict[str, torch.Tensor] = {}

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx):
        rec = self.records[idx]
        fpath = rec["file_path"]
        
        if fpath in self.cache:
            x = self.cache[fpath]
        else:
            y, sr = load_audio(fpath)
            mel = generate_mel_spectrogram(y, sr)
            # Add channel dimension: (1, n_mels, time_frames)
            x = torch.from_numpy(mel).unsqueeze(0)
            if len(self.cache) < 2000: # Cache up to 2000 samples in RAM safely (~40MB)
                self.cache[fpath] = x

        label_idx = self.class_to_idx[rec["emotion"]]
        return x, label_idx

class TrainingService:
    def __init__(self):
        self.is_training: bool = False
        self.stop_requested: bool = False
        self.current_status: Dict[str, Any] = {
            "status": "idle",
            "epoch": 0,
            "total_epochs": 0,
            "train_loss": 0.0,
            "val_loss": 0.0,
            "train_accuracy": 0.0,
            "val_accuracy": 0.0,
            "learning_rate": 0.0,
            "best_epoch": 0,
            "best_val_loss": float("inf"),
            "elapsed_seconds": 0.0,
            "remaining_seconds": 0.0,
            "message": "Model not trained yet"
        }
        self.history: Dict[str, List[Any]] = {
            "epochs": [],
            "train_loss": [],
            "val_loss": [],
            "train_acc": [],
            "val_acc": [],
            "learning_rates": [],
            "epoch_times": []
        }
        self.class_to_idx = {emo: i for i, emo in enumerate(EMOTIONS)}
        self.idx_to_class = {i: emo for emo, i in self.class_to_idx.items()}
        self._thread: Optional[threading.Thread] = None

    def get_status(self) -> Dict[str, Any]:
        """Return real-time training progress for live UI updates."""
        return self.current_status

    def get_history(self) -> Dict[str, Any]:
        """Return full training history curves."""
        # If history file exists, load it
        if settings.TRAINING_HISTORY_PATH.exists() and not self.is_training:
            try:
                with open(settings.TRAINING_HISTORY_PATH, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        return self.history

    def stop_training(self) -> Dict[str, str]:
        """Request training cancellation safely after current epoch."""
        if self.is_training:
            self.stop_requested = True
            logger.info("Training cancellation requested by user.")
            return {"status": "stopping", "message": "Training will stop after current epoch finishes."}
        return {"status": "idle", "message": "No training in progress."}

    def start_training(
        self,
        epochs: int = DEFAULT_EPOCHS,
        batch_size: int = DEFAULT_BATCH_SIZE,
        learning_rate: float = 0.001,
        optimizer_name: str = "adam",
        weight_decay: float = 1e-4,
        dropout: float = 0.25,
        patience: int = DEFAULT_PATIENCE,
        random_seed: int = 42,
        max_samples: Optional[int] = None
    ) -> Dict[str, Any]:
        """Start model training in a non-blocking background thread."""
        if self.is_training:
            return {"error": "Training already in progress."}

        # Enforce maximum epoch limit
        if epochs > MAX_EPOCHS_LIMIT:
            epochs = MAX_EPOCHS_LIMIT
        if epochs < 1:
            epochs = 1

        self.stop_requested = False
        self.is_training = True
        
        # Reset tracking
        self.current_status = {
            "status": "running",
            "epoch": 0,
            "total_epochs": epochs,
            "train_loss": 0.0,
            "val_loss": 0.0,
            "train_accuracy": 0.0,
            "val_accuracy": 0.0,
            "learning_rate": learning_rate,
            "best_epoch": 0,
            "best_val_loss": float("inf"),
            "elapsed_seconds": 0.0,
            "remaining_seconds": 0.0,
            "message": "Initializing CPU training pipeline..."
        }
        self.history = {
            "epochs": [],
            "train_loss": [],
            "val_loss": [],
            "train_acc": [],
            "val_acc": [],
            "learning_rates": [],
            "epoch_times": []
        }

        # Launch background thread
        self._thread = threading.Thread(
            target=self._run_training_loop,
            args=(epochs, batch_size, learning_rate, optimizer_name, weight_decay, dropout, patience, random_seed, max_samples),
            daemon=True
        )
        self._thread.start()

        return {
            "status": "started",
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": learning_rate,
            "patience": patience,
            "max_epoch_limit": MAX_EPOCHS_LIMIT
        }

    def _run_training_loop(
        self,
        epochs: int,
        batch_size: int,
        learning_rate: float,
        optimizer_name: str,
        weight_decay: float,
        dropout: float,
        patience: int,
        random_seed: int,
        max_samples: Optional[int]
    ):
        """Execute the PyTorch CPU training loop with Early Stopping."""
        torch.manual_seed(random_seed)
        np.random.seed(random_seed)

        start_time = time.time()
        logger.info(f"Starting CNN Emotion Training: {epochs} epochs on CPU.")

        try:
            # 1. Prepare datasets
            if dataset_service._df is None:
                dataset_service.load_metadata_if_exists()
            df = dataset_service._df[dataset_service._df["is_valid"] == True].copy()
            
            if "split" not in df.columns:
                dataset_service.create_speaker_independent_splits()
                df = dataset_service._df[dataset_service._df["is_valid"] == True]

            train_df = df[df["split"] == "train"]
            val_df = df[df["split"] == "val"]

            if max_samples and max_samples < len(train_df):
                train_df = train_df.groupby("emotion", group_keys=False).apply(
                    lambda x: x.sample(min(len(x), max_samples // 6), random_state=random_seed)
                ).reset_index(drop=True)
                val_df = val_df.groupby("emotion", group_keys=False).apply(
                    lambda x: x.sample(min(len(x), max(10, max_samples // 24)), random_state=random_seed)
                ).reset_index(drop=True)

            train_records = train_df.to_dict(orient="records")
            val_records = val_df.to_dict(orient="records")

            train_dataset = SpectrogramDataset(train_records, self.class_to_idx)
            val_dataset = SpectrogramDataset(val_records, self.class_to_idx)

            train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, drop_last=False)
            val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

            # 2. Build model
            model = EmotionCNN(num_classes=len(EMOTIONS), dropout=dropout)
            criterion = nn.CrossEntropyLoss()

            if optimizer_name.lower() == "adamw":
                optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=weight_decay)
            elif optimizer_name.lower() == "sgd":
                optimizer = torch.optim.SGD(model.parameters(), lr=learning_rate, momentum=0.9, weight_decay=weight_decay)
            else:
                optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate, weight_decay=weight_decay)

            scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode="min", factor=0.5, patience=3
            )

            best_val_loss = float("inf")
            best_epoch = 0
            best_val_acc = 0.0
            patience_counter = 0
            best_state_dict = None

            epoch_durations = []

            for epoch in range(1, epochs + 1):
                if self.stop_requested:
                    logger.info(f"Training stopped by user request at epoch {epoch - 1}.")
                    break

                epoch_start = time.time()
                
                # --- Train Phase ---
                model.train()
                running_train_loss = 0.0
                all_train_preds = []
                all_train_targets = []

                for batch_x, batch_y in train_loader:
                    optimizer.zero_grad()
                    outputs = model(batch_x)
                    loss = criterion(outputs, batch_y)
                    loss.backward()
                    optimizer.step()

                    running_train_loss += loss.item() * batch_x.size(0)
                    preds = torch.argmax(outputs, dim=-1)
                    all_train_preds.extend(preds.cpu().numpy())
                    all_train_targets.extend(batch_y.cpu().numpy())

                train_loss = running_train_loss / len(train_dataset)
                train_acc = accuracy_score(all_train_targets, all_train_preds)

                # --- Validation Phase ---
                model.eval()
                running_val_loss = 0.0
                all_val_preds = []
                all_val_targets = []

                with torch.no_grad():
                    for batch_x, batch_y in val_loader:
                        outputs = model(batch_x)
                        loss = criterion(outputs, batch_y)
                        running_val_loss += loss.item() * batch_x.size(0)
                        preds = torch.argmax(outputs, dim=-1)
                        all_val_preds.extend(preds.cpu().numpy())
                        all_val_targets.extend(batch_y.cpu().numpy())

                val_loss = running_val_loss / len(val_dataset)
                val_acc = accuracy_score(all_val_targets, all_val_preds)
                scheduler.step(val_loss)

                current_lr = optimizer.param_groups[0]["lr"]
                epoch_time = time.time() - epoch_start
                epoch_durations.append(epoch_time)
                elapsed_total = time.time() - start_time
                avg_epoch_time = np.mean(epoch_durations)
                remaining_epochs = epochs - epoch
                est_remaining = round(avg_epoch_time * remaining_epochs, 1)

                # Update history
                self.history["epochs"].append(epoch)
                self.history["train_loss"].append(round(float(train_loss), 4))
                self.history["val_loss"].append(round(float(val_loss), 4))
                self.history["train_acc"].append(round(float(train_acc), 4))
                self.history["val_acc"].append(round(float(val_acc), 4))
                self.history["learning_rates"].append(round(float(current_lr), 6))
                self.history["epoch_times"].append(round(float(epoch_time), 2))

                # Early Stopping and Best Model check
                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    best_epoch = epoch
                    best_val_acc = val_acc
                    best_state_dict = model.state_dict().copy()
                    patience_counter = 0
                else:
                    patience_counter += 1

                # Update live status
                self.current_status = {
                    "status": "running",
                    "epoch": epoch,
                    "total_epochs": epochs,
                    "train_loss": round(float(train_loss), 4),
                    "val_loss": round(float(val_loss), 4),
                    "train_accuracy": round(float(train_acc * 100), 2),
                    "val_accuracy": round(float(val_acc * 100), 2),
                    "learning_rate": current_lr,
                    "best_epoch": best_epoch,
                    "best_val_loss": round(float(best_val_loss), 4),
                    "elapsed_seconds": round(elapsed_total, 1),
                    "remaining_seconds": est_remaining,
                    "patience_left": patience - patience_counter,
                    "message": f"Epoch {epoch}/{epochs} complete. Val Loss: {val_loss:.4f} (Best: {best_val_loss:.4f} at epoch {best_epoch})"
                }

                if patience_counter >= patience:
                    logger.info(f"Early stopping triggered at epoch {epoch}. No validation loss improvement for {patience} epochs.")
                    break

            # 3. Save best model and artifacts
            settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
            if best_state_dict is not None:
                torch.save(best_state_dict, settings.BEST_MODEL_PATH)
                logger.info(f"Saved best model weights to {settings.BEST_MODEL_PATH}")

            # Save configs and mapping
            model_config = {
                "model_name": "Cognivision 2D-CNN Emotion Recognizer",
                "trained_epochs": len(self.history["epochs"]),
                "best_epoch": best_epoch,
                "best_val_loss": round(float(best_val_loss), 4),
                "best_val_accuracy": round(float(best_val_acc * 100), 2),
                "batch_size": batch_size,
                "initial_learning_rate": learning_rate,
                "optimizer": optimizer_name,
                "weight_decay": weight_decay,
                "dropout": dropout,
                "num_classes": len(EMOTIONS),
                "classes": EMOTIONS,
                "architecture": model.get_model_info(),
                "training_time_seconds": round(time.time() - start_time, 2),
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            with open(settings.MODEL_CONFIG_PATH, "w") as f:
                json.dump(model_config, f, indent=2)

            with open(settings.CLASS_MAPPING_PATH, "w") as f:
                json.dump({"class_to_idx": self.class_to_idx, "idx_to_class": self.idx_to_class}, f, indent=2)

            with open(settings.TRAINING_HISTORY_PATH, "w") as f:
                json.dump(self.history, f, indent=2)

            self.current_status["status"] = "completed" if not self.stop_requested else "stopped"
            self.current_status["message"] = f"Training finished! Best model saved from epoch {best_epoch} with val loss {best_val_loss:.4f}."
            logger.info("Training cycle finished successfully.")

        except Exception as e:
            logger.error(f"Error during training loop: {e}", exc_info=True)
            self.current_status["status"] = "failed"
            self.current_status["message"] = f"Training failed: {str(e)}"
        finally:
            self.is_training = False

training_service = TrainingService()
