from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.evaluation_service import evaluation_service
from app.models.classical_baselines import baselines_manager

router = APIRouter(prefix="/api/evaluation", tags=["Evaluation"])

class EvalRequest(BaseModel):
    model_type: str = "cnn"
    max_test_samples: Optional[int] = None

@router.post("/run")
def run_evaluation(req: EvalRequest):
    """Run full evaluation on untouched speaker-independent test split."""
    try:
        report = evaluation_service.evaluate_model(
            model_type=req.model_type,
            max_test_samples=req.max_test_samples
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/latest")
def get_latest_evaluation():
    """Get the most recent evaluation report."""
    report = evaluation_service.load_latest_eval_if_exists()
    if not report:
        return {
            "has_evaluated": False,
            "message": "No model evaluated yet. Train the model and click 'Run Evaluation'."
        }
    return {"has_evaluated": True, **report}

@router.get("/leaderboard")
def get_leaderboard():
    """Retrieve model leaderboard comparison table."""
    try:
        return {"leaderboard": evaluation_service.get_leaderboard()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/explainability")
def get_explainability():
    """Return acoustic feature importances and explainability metrics."""
    try:
        importances = baselines_manager.get_feature_importances()
        return {
            "feature_importances": importances,
            "description": "Random Forest Mean Decrease in Impurity (MDI) across 40+ acoustic time, spectral, and MFCC features."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
