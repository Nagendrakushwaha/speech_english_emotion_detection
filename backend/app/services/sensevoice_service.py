import re
import time
import threading
from pathlib import Path
from typing import Dict, Any, Optional
from app.utils.logger import logger

class SenseVoiceService:
    def __init__(self):
        self.model = None
        self.status: str = "unloaded" # unloaded, loading, ready, error
        self.error_message: Optional[str] = None
        self.device: str = "cpu"
        self._lock = threading.Lock()

    def start_background_loading(self):
        """Asynchronously load SenseVoiceSmall in a background thread."""
        with self._lock:
            if self.status in ["loading", "ready"]:
                return
            self.status = "loading"

        def _loader():
            try:
                logger.info("Initializing SenseVoiceSmall on CPU...")
                from funasr import AutoModel
                self.model = AutoModel(
                    model="iic/SenseVoiceSmall",
                    device=self.device,
                    disable_update=True
                )
                self.status = "ready"
                logger.info("SenseVoiceSmall loaded and ready for multilingual inference!")
            except Exception as e:
                logger.error(f"Failed to load SenseVoiceSmall: {e}")
                self.status = "error"
                self.error_message = str(e)

        thread = threading.Thread(target=_loader, daemon=True)
        thread.start()

    def get_status(self) -> Dict[str, Any]:
        """Return loading and readiness status of SenseVoiceSmall."""
        return {
            "status": self.status,
            "device": self.device,
            "model_name": "iic/SenseVoiceSmall",
            "supported_languages": ["English", "Mandarin", "Cantonese", "Japanese", "Korean"],
            "capabilities": ["ASR Transcription", "Language Identification (LID)", "Audio Event Detection (AED)", "Emotion Recognition (SER)"],
            "error_message": self.error_message
        }

    def transcribe_and_analyze(self, audio_path: str | Path) -> Dict[str, Any]:
        """Run SenseVoiceSmall speech intelligence inference on audio file."""
        if self.status != "ready" or self.model is None:
            # If not yet started, trigger background load
            if self.status == "unloaded":
                self.start_background_loading()
            return {
                "is_ready": False,
                "status": self.status,
                "message": "SenseVoiceSmall model is currently initializing/downloading. Custom emotion analysis is available immediately below."
            }

        t0 = time.time()
        try:
            res = self.model.generate(
                input=str(audio_path),
                language="auto",
                use_itn=True
            )
            elapsed = round(time.time() - t0, 3)

            if not res or len(res) == 0:
                return {
                    "is_ready": True,
                    "transcription": "",
                    "detected_language": "Unknown",
                    "emotion": "Neutral",
                    "audio_events": [],
                    "inference_time_seconds": elapsed
                }

            raw_text = res[0].get("text", "")
            
            # Parse language, emotions, and audio events from rich SenseVoice tags
            lang_match = re.search(r"<\|([a-zA-Z]{2,4})\|>", raw_text)
            detected_lang_code = lang_match.group(1).lower() if lang_match else "en"
            
            lang_map = {
                "en": "English",
                "zh": "Mandarin Chinese",
                "yue": "Cantonese",
                "ja": "Japanese",
                "ko": "Korean"
            }
            detected_language = lang_map.get(detected_lang_code, detected_lang_code.upper())

            # Detect emotion tag
            emo_match = re.search(r"<\|(HAPPY|SAD|ANGRY|NEUTRAL|FEARFUL|DISGUSTED)\|>", raw_text)
            detected_emo = emo_match.group(1).capitalize() if emo_match else "Neutral"

            # Detect audio events
            events = []
            if "<|laughter|>" in raw_text.lower():
                events.append("Laughter")
            if "<|applause|>" in raw_text.lower():
                events.append("Applause")
            if "<|music|>" in raw_text.lower():
                events.append("Music")
            if "<|cough|>" in raw_text.lower():
                events.append("Cough")
            if not events:
                events.append("Clean Speech")

            # Clean transcription text using funasr postprocess utility
            try:
                from funasr.utils.postprocess_utils import rich_transcription_postprocess
                clean_text = rich_transcription_postprocess(raw_text).strip()
            except Exception:
                clean_text = re.sub(r"<\|.*?\|>", "", raw_text).strip()

            return {
                "is_ready": True,
                "transcription": clean_text if clean_text else "(No speech detected)",
                "raw_output": raw_text,
                "detected_language": detected_language,
                "detected_emotion": detected_emo,
                "audio_events": events,
                "inference_time_seconds": elapsed
            }
        except Exception as e:
            logger.error(f"SenseVoice inference error on {audio_path}: {e}")
            return {
                "is_ready": False,
                "status": "error",
                "message": f"Inference error: {str(e)}"
            }

sensevoice_service = SenseVoiceService()
