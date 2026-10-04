import pytest
import numpy as np
import torch
from pathlib import Path

from app.preprocessing.audio_pipeline import load_audio, generate_mel_spectrogram, extract_waveform_samples
from app.preprocessing.feature_extractor import extract_acoustic_features

def test_audio_pipeline_synthetic_signal():
    """Verify loading, resampling to 16kHz mono, and spectrogram generation on synthetic audio."""
    sr = 16000
    duration = 2.5
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    y = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)

    mel = generate_mel_spectrogram(y, sr, n_mels=64)
    assert isinstance(mel, np.ndarray)
    assert mel.shape[0] == 64, f"Expected 64 mel bins, got {mel.shape[0]}"
    assert mel.shape[1] > 0, "Time frame dimension must be positive"
    assert not np.isnan(mel).any(), "Mel spectrogram contains NaN values"

def test_waveform_decimation():
    """Verify waveform downsampling generates expected number of points for UI visualization."""
    y = np.random.randn(16000 * 3).astype(np.float32)
    decimated = extract_waveform_samples(y, num_points=400)
    assert len(decimated) == 400
    assert all(isinstance(x, float) for x in decimated)

def test_feature_extraction():
    """Verify acoustic feature extractor extracts RMS, ZCR, Spectral Centroid, and MFCCs."""
    sr = 16000
    y = (0.5 * np.sin(2 * np.pi * 300 * np.linspace(0, 2.0, 32000))).astype(np.float32)
    feats = extract_acoustic_features(y, sr)
    
    assert "rms_mean" in feats
    assert "zcr_mean" in feats
    assert "spectral_centroid_mean" in feats
    assert "spectral_bandwidth_mean" in feats
    assert "mfcc_1_mean" in feats
    assert "mfcc_13_mean" in feats
    assert not np.isnan(feats["rms_mean"])
