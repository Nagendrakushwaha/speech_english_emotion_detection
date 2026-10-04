import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.services.dataset_service import dataset_service
from app.utils.config import settings

router = APIRouter(prefix="/api/dataset", tags=["Dataset"])

class ScanRequest(BaseModel):
    directory: Optional[str] = None

class SplitRequest(BaseModel):
    val_ratio: float = 0.15
    test_ratio: float = 0.15
    random_seed: int = 42

@router.get("/summary")
def get_dataset_summary():
    """Retrieve full dataset KPI summary, distributions, and speaker metadata."""
    try:
        summary = dataset_service.get_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/scan")
def scan_dataset(req: ScanRequest):
    """Trigger complete scan and validation of audio files and generate metadata.csv."""
    try:
        res = dataset_service.scan_and_generate_metadata(dataset_dir=req.directory)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-splits")
def create_splits(req: SplitRequest):
    """Generate speaker-independent train/val/test splits with 0 speaker leakage."""
    try:
        split_info = dataset_service.create_speaker_independent_splits(
            val_ratio=req.val_ratio,
            test_ratio=req.test_ratio,
            random_seed=req.random_seed
        )
        return split_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sample-audio")
def get_sample_audio(limit: int = 50, emotion: Optional[str] = None):
    """Return sample audio records for dataset explorer and error analysis audio players."""
    records = dataset_service.get_sample_records(limit=limit, emotion=emotion)
    return {"samples": records, "count": len(records)}

@router.get("/audio-file/{file_name}")
def stream_audio_file(file_name: str):
    """Stream audio file for in-browser playback."""
    # Search in dataset directory
    target_path = None
    if settings.DATASET_DIR.exists():
        direct = settings.DATASET_DIR / file_name
        if direct.exists():
            target_path = direct
        else:
            # Check subfolder
            matches = list(settings.DATASET_DIR.glob(f"**/{file_name}"))
            if matches:
                target_path = matches[0]

    if not target_path or not target_path.exists():
        # Check raw or data dir
        matches = list(settings.BASE_DIR.glob(f"**/{file_name}"))
        if matches:
            target_path = matches[0]

    if not target_path or not target_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        path=str(target_path),
        media_type="audio/wav",
        filename=file_name
    )
