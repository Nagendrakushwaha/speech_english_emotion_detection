import os
import time
import tempfile
from pathlib import Path
from typing import Optional
import numpy as np
import torch
import librosa
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.utils.config import settings
from app.utils.constants import EMOTIONS
from app.models.cnn_emotion_model import EmotionCNN
from app.preprocessing.audio_pipeline import load_audio, generate_mel_spectrogram, extract_waveform_samples
from app.services.sensevoice_service import sensevoice_service
from app.utils.logger import logger

router = APIRouter(prefix="/api/inference", tags=["Inference"])

_cached_cnn_model = None

def get_cnn_model():
    global _cached_cnn_model
    if _cached_cnn_model is None:
        model = EmotionCNN(num_classes=len(EMOTIONS))
        if settings.BEST_MODEL_PATH.exists():
            try:
                state_dict = torch.load(settings.BEST_MODEL_PATH, map_location="cpu")
                model.load_state_dict(state_dict)
                logger.info("Loaded custom trained CNN weights for inference.")
            except Exception as e:
                logger.warning(f"Could not load best_model.pt: {e}")
        model.eval()
        _cached_cnn_model = model
    return _cached_cnn_model

@router.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    """Comprehensive audio analysis: custom emotion recognition, waveforms, spectrograms, MFCCs, and SenseVoice transcription."""
    t0 = time.time()
    
    # 1. Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS and ext != ".blob":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '{ext}'. Supported: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # 2. Save to safe temporary file
    temp_dir = Path(tempfile.gettempdir()) / "cognivision_temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_file = temp_dir / f"upload_{int(time.time()*1000)}{ext if ext != '.blob' else '.wav'}"

    try:
        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB}MB.")
        if len(content) < 100:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty or too short.")

        with open(temp_file, "wb") as f:
            f.write(content)

        # 3. Audio pipeline: load & convert to 16kHz mono
        y, sr = load_audio(temp_file, target_sr=16000)
        duration = round(float(len(y) / sr), 3)

        # Decimated waveform for frontend chart (400 points)
        waveform_data = extract_waveform_samples(y, num_points=400)

        # 4. Generate Spectrogram and MFCC for visualization
        S = np.abs(librosa.stft(y, n_fft=1024, hop_length=512))
        S_db = librosa.amplitude_to_db(S, ref=np.max)
        
        # Decimate spectrogram to manageable 2D grid for Plotly (e.g. 40 freq bins x 60 time frames)
        freq_indices = np.linspace(0, S_db.shape[0] - 1, 40).astype(int)
        time_indices = np.linspace(0, S_db.shape[1] - 1, 60).astype(int)
        spectrogram_grid = S_db[np.ix_(freq_indices, time_indices)]
        spectrogram_data = [
            [round(float(val), 2) for val in row] for row in spectrogram_grid
        ]

        # MFCC heatmap (13 coefficients x 60 time frames)
        mfcc = librosa.feature.mfcc(S=S_db, sr=sr, n_mfcc=13)
        mfcc_time_indices = np.linspace(0, mfcc.shape[1] - 1, 60).astype(int)
        mfcc_grid = mfcc[:, mfcc_time_indices]
        mfcc_data = [
            [round(float(val), 2) for val in row] for row in mfcc_grid
        ]

        # 5. Custom Emotion Recognizer Inference
        mel = generate_mel_spectrogram(y, sr)
        tensor_x = torch.from_numpy(mel).unsqueeze(0).unsqueeze(0) # (1, 1, 64, 94)
        cnn = get_cnn_model()
        with torch.no_grad():
            probs = cnn.predict_proba(tensor_x).squeeze(0).numpy()

        pred_idx = int(np.argmax(probs))
        predicted_emotion = EMOTIONS[pred_idx]
        confidence = float(np.max(probs))

        emotion_probabilities = [
            {
                "emotion": emo,
                "probability": round(float(p), 4),
                "percentage": round(float(p * 100), 1)
            }
            for emo, p in zip(EMOTIONS, probs)
        ]
        # Sort descending by probability
        emotion_probabilities.sort(key=lambda x: x["probability"], reverse=True)

        # 6. SenseVoice Pretrained Speech Intelligence
        sensevoice_output = sensevoice_service.transcribe_and_analyze(temp_file)

        processing_time = round(time.time() - t0, 3)

        return {
            "file_name": file.filename,
            "duration_seconds": duration,
            "sample_rate": sr,
            "processing_time_seconds": processing_time,
            "custom_emotion_result": {
                "predicted_emotion": predicted_emotion,
                "confidence": round(confidence, 4),
                "confidence_percent": round(confidence * 100, 1),
                "probabilities": emotion_probabilities
            },
            "speech_intelligence": sensevoice_output,
            "visualizations": {
                "waveform": waveform_data,
                "spectrogram": spectrogram_data,
                "mfcc": mfcc_data
            }
        }

    except HTTPException:
        raise
    except ValueError as ve:
        logger.warning(f"Audio decoding error for {file.filename}: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Inference analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
    finally:
        # 7. Guaranteed temp file cleanup
        if temp_file.exists():
            try:
                temp_file.unlink()
            except Exception:
                pass

@router.get("/sensevoice-status")
def get_sensevoice_status():
    """Check loading and ready status of SenseVoiceSmall."""
    return sensevoice_service.get_status()
