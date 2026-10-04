import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env if present
env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"
REPORTS_DIR = PROJECT_ROOT / "reports"

# Default dataset path resolution
env_dataset_dir = os.getenv("DATASET_DIR", "")
if env_dataset_dir and Path(env_dataset_dir).exists():
    resolved_dataset_dir = Path(env_dataset_dir)
elif (PROJECT_ROOT / "dataset" / "AudioWAV").exists():
    resolved_dataset_dir = PROJECT_ROOT / "dataset" / "AudioWAV"
elif (PROJECT_ROOT / "dataset").exists():
    resolved_dataset_dir = PROJECT_ROOT / "dataset"
else:
    resolved_dataset_dir = PROJECT_ROOT / "dataset"

class Settings:
    PROJECT_NAME: str = "Cognivision Voice Intelligence"
    PROJECT_SUBTITLE: str = "Multilingual Speech Intelligence & Emotion Analytics Platform"
    VERSION: str = "1.0.0"
    
    BASE_DIR: Path = PROJECT_ROOT
    DATASET_DIR: Path = resolved_dataset_dir
    DATA_DIR: Path = DATA_DIR
    MODELS_DIR: Path = MODELS_DIR
    REPORTS_DIR: Path = REPORTS_DIR
    
    METADATA_PATH: Path = DATA_DIR / "metadata.csv"
    FEATURES_PATH: Path = DATA_DIR / "processed" / "features.parquet"
    FEATURES_CSV_PATH: Path = DATA_DIR / "processed" / "features.csv"
    SPLITS_PATH: Path = DATA_DIR / "splits" / "speaker_splits.json"
    EXPERIMENTS_PATH: Path = DATA_DIR / "experiments.json"
    
    BEST_MODEL_PATH: Path = MODELS_DIR / "best_model.pt"
    MODEL_CONFIG_PATH: Path = MODELS_DIR / "model_config.json"
    CLASS_MAPPING_PATH: Path = MODELS_DIR / "class_mapping.json"
    TRAINING_HISTORY_PATH: Path = MODELS_DIR / "training_history.json"
    EVALUATION_PATH: Path = REPORTS_DIR / "evaluation_reports" / "latest_evaluation.json"

    MAX_FILE_SIZE_MB: int = 25
    ALLOWED_EXTENSIONS: list[str] = [".wav", ".mp3", ".flac", ".ogg"]

settings = Settings()
