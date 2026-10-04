"""Constants and configurations for Cognivision Voice Intelligence."""

EMOTION_CODE_MAP = {
    "ANG": "Angry",
    "DIS": "Disgust",
    "FEA": "Fear",
    "HAP": "Happy",
    "NEU": "Neutral",
    "SAD": "Sad"
}

EMOTIONS = ["Angry", "Disgust", "Fear", "Happy", "Neutral", "Sad"]

EMOTION_COLORS = {
    "Angry": "#ef4444",
    "Disgust": "#a855f7",
    "Fear": "#f59e0b",
    "Happy": "#10b981",
    "Neutral": "#64748b",
    "Sad": "#3b82f6"
}

SENTENCE_MAP = {
    "DFA": "Don't forget a jacket",
    "IEO": "It's eleven o'clock",
    "IOM": "I'm on my way to the meeting",
    "ITH": "I thought the meeting was tomorrow",
    "ITS": "I think I have a fever",
    "IWL": "I would like to see you again",
    "IWW": "I wonder what this is about",
    "MTI": "Maybe this is a good idea",
    "TAI": "The apple is on the table",
    "TIE": "That is exactly what happened",
    "TSI": "The surface is slick",
    "WSI": "We'll stop in a couple of minutes"
}

INTENSITY_MAP = {
    "LO": "Low",
    "MD": "Medium",
    "HI": "High",
    "XX": "Unspecified"
}

SUPPORTED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}

TARGET_SAMPLE_RATE = 16000
TARGET_DURATION_SECONDS = 3.0
N_MELS = 64
N_FFT = 1024
HOP_LENGTH = 512
MAX_EPOCHS_LIMIT = 100
DEFAULT_EPOCHS = 30
DEFAULT_BATCH_SIZE = 32
DEFAULT_PATIENCE = 7
