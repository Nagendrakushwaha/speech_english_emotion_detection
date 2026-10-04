from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.feature_service import feature_service

router = APIRouter(prefix="/api/features", tags=["Features"])

class ExtractRequest(BaseModel):
    max_samples: Optional[int] = 1200
    force_recompute: bool = False

@router.post("/extract")
def extract_features(req: ExtractRequest):
    """Extract acoustic features across dataset files and save cache."""
    try:
        res = feature_service.extract_dataset_features(
            max_samples=req.max_samples,
            force_recompute=req.force_recompute
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pca-3d")
def get_3d_pca():
    """Return 3D PCA coordinates (PCA 1, PCA 2, PCA 3) of acoustic features for interactive 3D scatter."""
    try:
        data = feature_service.get_3d_pca_data()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/acoustic-3d")
def get_3d_acoustic_space():
    """Return 3D acoustic feature space (MFCC-1, Spectral Centroid, RMS Energy) colored by emotion."""
    try:
        data = feature_service.get_3d_acoustic_space()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/distributions")
def get_feature_distributions():
    """Return boxplot/distribution statistics and MFCC heatmap grouped by emotion."""
    try:
        data = feature_service.get_feature_distributions()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
