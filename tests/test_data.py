import pytest
from pathlib import Path
import pandas as pd

from app.services.dataset_service import dataset_service
from app.utils.constants import EMOTION_CODE_MAP, EMOTIONS

def test_emotion_code_mapping():
    """Verify CREMA-D emotion code mapping contains all 6 core categories."""
    assert "ANG" in EMOTION_CODE_MAP and EMOTION_CODE_MAP["ANG"] == "Angry"
    assert "DIS" in EMOTION_CODE_MAP and EMOTION_CODE_MAP["DIS"] == "Disgust"
    assert "FEA" in EMOTION_CODE_MAP and EMOTION_CODE_MAP["FEA"] == "Fear"
    assert "HAP" in EMOTION_CODE_MAP and EMOTION_CODE_MAP["HAP"] == "Happy"
    assert "NEU" in EMOTION_CODE_MAP and EMOTION_CODE_MAP["NEU"] == "Neutral"
    assert "SAD" in EMOTION_CODE_MAP and EMOTION_CODE_MAP["SAD"] == "Sad"
    assert len(EMOTIONS) == 6

def test_metadata_dataframe_integrity():
    """Verify metadata.csv exists, is loaded, and contains required fields without corruption."""
    df = dataset_service.load_metadata_if_exists()
    assert df is not None, "metadata.csv could not be loaded"
    assert len(df) > 0, "metadata.csv is empty"
    
    required_cols = ["file_path", "file_name", "actor_id", "sentence_id", "emotion", "duration", "sample_rate"]
    for col in required_cols:
        assert col in df.columns, f"Missing required column: {col}"
    
    unique_emotions = set(df["emotion"].unique())
    for emo in unique_emotions:
        assert emo in EMOTIONS or emo == "unknown"

def test_speaker_independent_splits_integrity():
    """Verify speaker splits have zero actor leakage across train, val, and test."""
    splits = dataset_service.create_speaker_independent_splits(val_ratio=0.15, test_ratio=0.15, random_seed=42)
    assert splits["speaker_leakage"] == 0, "Speaker leakage detected in splits!"
    assert splits["train_samples"] > 0
    assert splits["val_samples"] > 0
    assert splits["test_samples"] > 0
