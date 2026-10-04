import os
from pathlib import Path
from typing import Tuple, Dict, Any, Optional
import numpy as np
import soundfile as sf
import librosa
import torch

from app.utils.constants import TARGET_SAMPLE_RATE, TARGET_DURATION_SECONDS, N_MELS, N_FFT, HOP_LENGTH
from app.utils.logger import logger

def validate_audio_file(file_path: str | Path) -> Tuple[bool, str, Dict[str, Any]]:
    """Validate that an audio file exists, is non-empty, and has a valid readable header."""
    p = Path(file_path)
    if not p.exists():
        return False, "File does not exist", {}
    if p.stat().st_size == 0:
        return False, "File is empty (0 bytes)", {}
    
    try:
        info = sf.info(str(p))
        if info.duration <= 0.05:
            return False, f"Audio duration too short ({info.duration:.3f}s)", {}
        
        meta = {
            "duration": float(info.duration),
            "sample_rate": int(info.samplerate),
            "channels": int(info.channels),
            "frames": int(info.frames),
            "format": str(info.format),
            "subtype": str(info.subtype)
        }
        return True, "Valid", meta
    except Exception as e:
        return False, f"Corrupted or unsupported format: {str(e)}", {}

def load_audio(file_path: str | Path, target_sr: int = TARGET_SAMPLE_RATE) -> Tuple[np.ndarray, int]:
    """Load audio file safely, convert to mono, and resample if necessary."""
    try:
        y, sr = sf.read(str(file_path), dtype="float32")
        if y.ndim > 1:
            y = np.mean(y, axis=1)
            
        if sr != target_sr:
            y = librosa.resample(y, orig_sr=sr, target_sr=target_sr)
            sr = target_sr
            
        # Peak normalization
        max_val = np.max(np.abs(y))
        if max_val > 1e-6:
            y = y / max_val
            
        return y, sr
    except Exception as e:
        logger.warning(f"Soundfile failed on {file_path}, falling back to librosa: {e}")
        y, sr = librosa.load(str(file_path), sr=target_sr, mono=True)
        max_val = np.max(np.abs(y))
        if max_val > 1e-6:
            y = y / max_val
        return y, sr

def generate_mel_spectrogram(
    y: np.ndarray,
    sr: int = TARGET_SAMPLE_RATE,
    target_duration: float = TARGET_DURATION_SECONDS,
    n_mels: int = N_MELS,
    n_fft: int = N_FFT,
    hop_length: int = HOP_LENGTH
) -> np.ndarray:
    """Generate normalized Log-Mel spectrogram with fixed time length."""
    target_samples = int(target_duration * sr)
    
    # Pad or truncate to fixed duration
    if len(y) < target_samples:
        pad_width = target_samples - len(y)
        y = np.pad(y, (0, pad_width), mode="constant")
    else:
        y = y[:target_samples]
        
    mel = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_fft=n_fft,
        hop_length=hop_length,
        n_mels=n_mels,
        power=2.0
    )
    log_mel = librosa.power_to_db(mel, ref=np.max)
    
    # Normalize between 0 and 1
    min_val, max_val = log_mel.min(), log_mel.max()
    if max_val - min_val > 1e-6:
        log_mel_norm = (log_mel - min_val) / (max_val - min_val)
    else:
        log_mel_norm = np.zeros_like(log_mel)
        
    return log_mel_norm.astype(np.float32)

def extract_waveform_samples(y: np.ndarray, num_points: int = 400) -> list[float]:
    """Downsample audio waveform for rapid frontend rendering."""
    if len(y) <= num_points:
        return [float(x) for x in y]
    indices = np.linspace(0, len(y) - 1, num_points).astype(int)
    return [round(float(y[i]), 4) for i in indices]
