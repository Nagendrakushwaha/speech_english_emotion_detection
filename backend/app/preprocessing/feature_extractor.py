import numpy as np
import librosa
from typing import Dict, Any, Optional
from app.preprocessing.audio_pipeline import load_audio

def extract_acoustic_features(y: np.ndarray, sr: int = 16000) -> Dict[str, float]:
    """Extract acoustic and prosodic features from audio array.
    Features:
    - Time domain: duration, RMS (mean, std, max), Zero Crossing Rate (mean, std)
    - Spectral: Spectral centroid (mean, std), Spectral bandwidth (mean, std),
                Spectral rolloff (mean, std), Spectral contrast (mean, std),
                Spectral flatness (mean, std)
    - MFCC: 1-13 means and standard deviations (26 features)
    - Pitch: Fundamental frequency (F0) mean, std, max (voiced only, no fabrication)
    """
    duration = float(len(y) / sr) if sr > 0 else 0.0
    
    # 1. Time-Domain Features
    rms = librosa.feature.rms(y=y)
    zcr = librosa.feature.zero_crossing_rate(y=y)
    
    features: Dict[str, float] = {
        "duration": duration,
        "rms_mean": float(np.mean(rms)),
        "rms_std": float(np.std(rms)),
        "rms_max": float(np.max(rms)),
        "zcr_mean": float(np.mean(zcr)),
        "zcr_std": float(np.std(zcr)),
    }
    
    # 2. Spectral Features
    # Precompute magnitude spectrogram to share across spectral features
    S = np.abs(librosa.stft(y, n_fft=1024, hop_length=512))
    sc = librosa.feature.spectral_centroid(S=S, sr=sr)
    sb = librosa.feature.spectral_bandwidth(S=S, sr=sr)
    sroll = librosa.feature.spectral_rolloff(S=S, sr=sr)
    sflat = librosa.feature.spectral_flatness(S=S)
    
    features["spectral_centroid_mean"] = float(np.mean(sc))
    features["spectral_centroid_std"] = float(np.std(sc))
    features["spectral_bandwidth_mean"] = float(np.mean(sb))
    features["spectral_bandwidth_std"] = float(np.std(sb))
    features["spectral_rolloff_mean"] = float(np.mean(sroll))
    features["spectral_rolloff_std"] = float(np.std(sroll))
    features["spectral_flatness_mean"] = float(np.mean(sflat))
    features["spectral_flatness_std"] = float(np.std(sflat))
    
    # Spectral contrast (calculated on power spectrogram)
    try:
        scont = librosa.feature.spectral_contrast(S=S, sr=sr)
        features["spectral_contrast_mean"] = float(np.mean(scont))
        features["spectral_contrast_std"] = float(np.std(scont))
    except Exception:
        features["spectral_contrast_mean"] = 0.0
        features["spectral_contrast_std"] = 0.0
        
    # 3. MFCCs (1-13)
    S_db = librosa.amplitude_to_db(S)
    mfcc = librosa.feature.mfcc(S=S_db, sr=sr, n_mfcc=13)
    for i in range(13):
        features[f"mfcc_{i+1}_mean"] = float(np.mean(mfcc[i]))
        features[f"mfcc_{i+1}_std"] = float(np.std(mfcc[i]))
        
    # 4. Prosodic / Pitch (F0) estimation via YIN
    try:
        f0 = librosa.yin(y, fmin=60, fmax=500, sr=sr, frame_length=1024, hop_length=512)
        # Filter unvoiced or out-of-range frames
        voiced_f0 = f0[(f0 >= 60) & (f0 <= 500) & (~np.isnan(f0))]
        if len(voiced_f0) > 0:
            features["pitch_f0_mean"] = float(np.mean(voiced_f0))
            features["pitch_f0_std"] = float(np.std(voiced_f0))
            features["pitch_f0_max"] = float(np.max(voiced_f0))
            features["voiced_fraction"] = float(len(voiced_f0) / len(f0))
        else:
            features["pitch_f0_mean"] = 0.0
            features["pitch_f0_std"] = 0.0
            features["pitch_f0_max"] = 0.0
            features["voiced_fraction"] = 0.0
    except Exception:
        features["pitch_f0_mean"] = 0.0
        features["pitch_f0_std"] = 0.0
        features["pitch_f0_max"] = 0.0
        features["voiced_fraction"] = 0.0
        
    return features

def extract_features_from_file(file_path: str, sr: int = 16000) -> Dict[str, float]:
    """Load audio and extract all acoustic features."""
    y, sr = load_audio(file_path, target_sr=sr)
    return extract_acoustic_features(y, sr)
