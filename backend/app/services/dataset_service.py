import os
import json
import time
from pathlib import Path
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
import soundfile as sf

from app.utils.config import settings
from app.utils.constants import EMOTION_CODE_MAP, EMOTIONS, SENTENCE_MAP, INTENSITY_MAP
from app.utils.logger import logger

class DatasetService:
    def __init__(self):
        self.metadata_path = settings.METADATA_PATH
        self.splits_path = settings.SPLITS_PATH
        self._df: Optional[pd.DataFrame] = None
        self._splits: Optional[Dict[str, Any]] = None
        self.load_metadata_if_exists()

    def load_metadata_if_exists(self) -> Optional[pd.DataFrame]:
        """Load metadata from CSV cache if present."""
        if self.metadata_path.exists():
            try:
                self._df = pd.read_csv(self.metadata_path)
                logger.info(f"Loaded existing metadata with {len(self._df)} records.")
                if self.splits_path.exists():
                    with open(self.splits_path, "r") as f:
                        self._splits = json.load(f)
                return self._df
            except Exception as e:
                logger.error(f"Error loading metadata.csv: {e}")
                self._df = None
        return None

    def scan_and_generate_metadata(self, dataset_dir: Optional[str] = None) -> Dict[str, Any]:
        """Inspect actual dataset directory, parse WAV files, validate headers, and generate metadata.csv."""
        t0 = time.time()
        target_dir = Path(dataset_dir) if dataset_dir else settings.DATASET_DIR
        
        # If directory contains an AudioWAV subfolder, use that
        if (target_dir / "AudioWAV").exists():
            target_dir = target_dir / "AudioWAV"
            
        logger.info(f"Scanning dataset in directory: {target_dir}")
        if not target_dir.exists():
            raise FileNotFoundError(f"Dataset directory not found: {target_dir}")

        records = []
        corrupted_count = 0
        valid_count = 0
        total_files = 0

        # Scan for all unique wav files
        seen_paths = set()
        wav_files = []
        for p in sorted(target_dir.glob("*.wav")):
            resolved = p.resolve()
            if resolved not in seen_paths:
                seen_paths.add(resolved)
                wav_files.append(p)
        total_files = len(wav_files)

        for p in wav_files:
            file_name = p.name
            stem = p.stem
            parts = stem.split("_")
            
            # Check CREMA-D naming pattern: Actor_Sentence_Emotion_Intensity
            if len(parts) >= 4:
                actor_id = parts[0]
                sentence_id = parts[1]
                emotion_code = parts[2]
                intensity_code = parts[3]
                emotion = EMOTION_CODE_MAP.get(emotion_code, emotion_code)
                sentence = SENTENCE_MAP.get(sentence_id, sentence_id)
                intensity = INTENSITY_MAP.get(intensity_code, intensity_code)
            else:
                actor_id = "unknown"
                sentence_id = "unknown"
                emotion = "unknown"
                intensity = "unknown"
                sentence = "unknown"

            # Inspect audio header safely
            try:
                info = sf.info(str(p))
                if info.duration > 0.05:
                    is_valid = True
                    duration = round(float(info.duration), 4)
                    sample_rate = int(info.samplerate)
                    channels = int(info.channels)
                    format_str = str(info.format)
                    valid_count += 1
                else:
                    is_valid = False
                    duration = round(float(info.duration), 4)
                    sample_rate = int(info.samplerate)
                    channels = int(info.channels)
                    format_str = str(info.format)
                    corrupted_count += 1
            except Exception as e:
                is_valid = False
                duration = 0.0
                sample_rate = 0
                channels = 0
                format_str = "CORRUPTED"
                corrupted_count += 1

            records.append({
                "file_path": str(p.resolve()).replace("\\", "/"),
                "file_name": file_name,
                "actor_id": actor_id,
                "sentence_id": sentence_id,
                "sentence_text": sentence,
                "emotion": emotion,
                "intensity": intensity,
                "duration": duration,
                "sample_rate": sample_rate,
                "channels": channels,
                "format": format_str,
                "is_valid": is_valid
            })

        df = pd.DataFrame(records)
        settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
        df.to_csv(self.metadata_path, index=False)
        self._df = df
        
        processing_time = round(time.time() - t0, 3)
        logger.info(f"Metadata generation complete. {valid_count} valid, {corrupted_count} corrupted in {processing_time}s.")
        
        # Auto-create speaker-independent splits
        self.create_speaker_independent_splits(val_ratio=0.15, test_ratio=0.15, random_seed=42)

        return {
            "total_files": total_files,
            "valid_files": valid_count,
            "corrupted_files": corrupted_count,
            "processing_time_seconds": processing_time,
            "dataset_directory": str(target_dir).replace("\\", "/")
        }

    def get_summary(self) -> Dict[str, Any]:
        """Compute live, non-hardcoded dataset statistics from metadata."""
        if self._df is None:
            self.load_metadata_if_exists()
            
        if self._df is None or len(self._df) == 0:
            # Fall back to quick scan if dataset directory exists
            if settings.DATASET_DIR.exists():
                self.scan_and_generate_metadata()
            else:
                return {
                    "is_ready": False,
                    "message": "Dataset not yet scanned. Please select dataset directory."
                }

        df = self._df
        valid_df = df[df["is_valid"] == True]

        # Emotion distribution
        emotion_counts = valid_df["emotion"].value_counts().to_dict()
        
        # Actor distribution
        actor_counts = valid_df["actor_id"].value_counts().to_dict()
        
        # Sample rate distribution
        sr_counts = valid_df["sample_rate"].value_counts().to_dict()
        
        # Intensity distribution
        intensity_counts = valid_df["intensity"].value_counts().to_dict()

        # Sentence distribution
        sentence_counts = valid_df["sentence_id"].value_counts().to_dict()

        # Duration statistics
        durations = valid_df["duration"].values
        duration_stats = {
            "total_hours": round(float(np.sum(durations) / 3600.0), 3),
            "mean": round(float(np.mean(durations)), 3),
            "std": round(float(np.std(durations)), 3),
            "min": round(float(np.min(durations)), 3),
            "max": round(float(np.max(durations)), 3),
            "median": round(float(np.median(durations)), 3)
        }

        # Emotion by duration stats
        duration_by_emotion = {}
        for emo, group in valid_df.groupby("emotion"):
            duration_by_emotion[str(emo)] = {
                "mean": round(float(group["duration"].mean()), 3),
                "std": round(float(group["duration"].std()), 3),
                "count": int(len(group))
            }

        # Splits counts if available
        split_counts = {}
        if "split" in valid_df.columns:
            split_counts = valid_df["split"].value_counts().to_dict()

        return {
            "is_ready": True,
            "total_files": int(len(df)),
            "valid_files": int(len(valid_df)),
            "corrupted_files": int(len(df) - len(valid_df)),
            "num_speakers": int(valid_df["actor_id"].nunique()),
            "num_emotions": int(valid_df["emotion"].nunique()),
            "duration_stats": duration_stats,
            "emotion_counts": emotion_counts,
            "actor_counts": {str(k): int(v) for k, v in list(actor_counts.items())[:20]},
            "sample_rate_distribution": {str(k): int(v) for k, v in sr_counts.items()},
            "intensity_distribution": intensity_counts,
            "sentence_distribution": sentence_counts,
            "duration_by_emotion": duration_by_emotion,
            "splits": split_counts,
            "split_info": self._splits or {}
        }

    def create_speaker_independent_splits(
        self,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
        random_seed: int = 42
    ) -> Dict[str, Any]:
        """Create reproducible speaker-independent train/val/test splits."""
        if self._df is None:
            self.load_metadata_if_exists()
        if self._df is None:
            raise ValueError("No metadata available to split. Scan dataset first.")

        df = self._df.copy()
        valid_df = df[df["is_valid"] == True]
        unique_actors = sorted(valid_df["actor_id"].unique())
        
        # Set seed for reproducibility
        rng = np.random.default_rng(random_seed)
        shuffled_actors = rng.permutation(unique_actors)
        
        n_total = len(shuffled_actors)
        n_test = max(1, int(round(n_total * test_ratio)))
        n_val = max(1, int(round(n_total * val_ratio)))
        n_train = n_total - n_test - n_val
        
        test_actors = sorted([str(a) for a in shuffled_actors[:n_test]])
        val_actors = sorted([str(a) for a in shuffled_actors[n_test:n_test + n_val]])
        train_actors = sorted([str(a) for a in shuffled_actors[n_test + n_val:]])

        # Strict speaker leakage verification
        leakage_train_test = set(train_actors) & set(test_actors)
        leakage_train_val = set(train_actors) & set(val_actors)
        leakage_val_test = set(val_actors) & set(test_actors)
        
        assert len(leakage_train_test) == 0, "Speaker leakage detected between Train and Test!"
        assert len(leakage_train_val) == 0, "Speaker leakage detected between Train and Val!"
        assert len(leakage_val_test) == 0, "Speaker leakage detected between Val and Test!"

        # Assign split column
        actor_to_split = {}
        for a in train_actors:
            actor_to_split[a] = "train"
        for a in val_actors:
            actor_to_split[a] = "val"
        for a in test_actors:
            actor_to_split[a] = "test"

        df["split"] = df["actor_id"].astype(str).map(lambda a: actor_to_split.get(a, "train"))
        df.to_csv(self.metadata_path, index=False)
        self._df = df

        split_info = {
            "random_seed": int(random_seed),
            "train_actors": train_actors,
            "val_actors": val_actors,
            "test_actors": test_actors,
            "train_actor_count": len(train_actors),
            "val_actor_count": len(val_actors),
            "test_actor_count": len(test_actors),
            "train_samples": int((df["split"] == "train").sum()),
            "val_samples": int((df["split"] == "val").sum()),
            "test_samples": int((df["split"] == "test").sum()),
            "speaker_leakage": 0,
            "zero_speaker_leakage_verified": True
        }

        settings.DATA_DIR.joinpath("splits").mkdir(parents=True, exist_ok=True)
        with open(self.splits_path, "w") as f:
            json.dump(split_info, f, indent=2)
            
        self._splits = split_info
        logger.info(f"Speaker-independent splits created: {split_info['train_samples']} train, {split_info['val_samples']} val, {split_info['test_samples']} test. 0 leakage verified.")
        return split_info

    def get_sample_records(self, limit: int = 50, emotion: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return sample audio records for explorer and error analysis audio players."""
        if self._df is None:
            self.load_metadata_if_exists()
        if self._df is None:
            return []
            
        df = self._df[self._df["is_valid"] == True]
        if emotion and emotion != "All":
            df = df[df["emotion"] == emotion]
            
        sample = df.head(limit).to_dict(orient="records")
        return sample

dataset_service = DatasetService()
