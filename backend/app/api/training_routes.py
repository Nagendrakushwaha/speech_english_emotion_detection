from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.training_service import training_service
from app.models.classical_baselines import baselines_manager
from app.services.feature_service import feature_service
from app.utils.constants import MAX_EPOCHS_LIMIT, DEFAULT_EPOCHS, DEFAULT_BATCH_SIZE, DEFAULT_PATIENCE
from app.utils.logger import logger

router = APIRouter(prefix="/api/training", tags=["Training"])

class TrainingRequest(BaseModel):
    epochs: int = Field(default=DEFAULT_EPOCHS, ge=1, le=MAX_EPOCHS_LIMIT)
    batch_size: int = Field(default=DEFAULT_BATCH_SIZE, ge=8, le=128)
    learning_rate: float = Field(default=0.001, gt=0, le=0.1)
    optimizer: str = "adam"
    weight_decay: float = 1e-4
    dropout: float = 0.25
    patience: int = Field(default=DEFAULT_PATIENCE, ge=2, le=30)
    random_seed: int = 42
    max_samples: Optional[int] = None

@router.post("/start")
def start_training(req: TrainingRequest):
    """Start training the PyTorch 2D-CNN Emotion Recognizer in a background thread."""
    res = training_service.start_training(
        epochs=req.epochs,
        batch_size=req.batch_size,
        learning_rate=req.learning_rate,
        optimizer_name=req.optimizer,
        weight_decay=req.weight_decay,
        dropout=req.dropout,
        patience=req.patience,
        random_seed=req.random_seed,
        max_samples=req.max_samples
    )
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.post("/stop")
def stop_training():
    """Cancel/stop current training loop gracefully after the current epoch."""
    return training_service.stop_training()

@router.get("/status")
def get_training_status():
    """Get real-time epoch, loss, accuracy, and telemetry status."""
    return training_service.get_status()

@router.get("/history")
def get_training_history():
    """Get complete training loss, accuracy, and learning rate curves."""
    return training_service.get_history()

@router.post("/train-baselines")
def train_classical_baselines():
    """Train classical ML models: Logistic Regression, Random Forest, SVM on acoustic features."""
    try:
        df = feature_service.get_features_dataframe()
        if df is None or len(df) == 0:
            raise HTTPException(status_code=400, detail="No extracted features available. Please run feature extraction.")

        train_df = df[df["split"] == "train"]
        test_df = df[df["split"] == "test"]
        if len(test_df) == 0:
            train_df = df.iloc[:int(len(df)*0.8)]
            test_df = df.iloc[int(len(df)*0.8):]

        meta_cols = ["file_path", "file_name", "emotion", "actor_id", "split"]
        feat_cols = [c for c in df.columns if c not in meta_cols and df[c].dtype != object]

        X_train = train_df[feat_cols].fillna(0).values
        y_train = train_df["emotion"].values
        X_test = test_df[feat_cols].fillna(0).values
        y_test = test_df["emotion"].values

        results = baselines_manager.train_and_evaluate_all(
            X_train=X_train,
            y_train=y_train,
            X_test=X_test,
            y_test=y_test,
            feature_names=feat_cols
        )
        return {
            "status": "success",
            "message": "Classical ML baselines trained and saved.",
            "results": results
        }
    except Exception as e:
        logger.error(f"Error training baselines: {e}")
        raise HTTPException(status_code=500, detail=str(e))
