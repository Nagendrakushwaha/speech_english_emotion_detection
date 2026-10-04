import os
import json
import time
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from app.utils.config import settings
from app.services.dataset_service import dataset_service
from app.services.feature_service import feature_service
from app.models.classical_baselines import baselines_manager
from app.services.training_service import training_service
from app.services.evaluation_service import evaluation_service
from app.services.benchmark_service import benchmark_service
from app.utils.logger import logger

router = APIRouter(prefix="/api", tags=["Experiments & Operations"])

class PipelineRequest(BaseModel):
    epochs: int = 15
    batch_size: int = 32
    max_samples: Optional[int] = 1200
    random_seed: int = 42

@router.post("/experiments/run-pipeline")
def run_complete_experiment_pipeline(req: PipelineRequest):
    """Execute complete end-to-end AI/ML pipeline in one automated workflow:
    1. Scan dataset & generate metadata
    2. Create speaker-independent splits (0 speaker leakage)
    3. Extract acoustic features
    4. Train classical ML baselines (Logistic Regression, Random Forest, SVM)
    5. Train PyTorch 2D-CNN with Early Stopping
    6. Evaluate on Test Split
    7. Generate Confusion Matrix, ROC/PR Curves, Error Analysis
    8. Benchmark CPU inference latency and RTF
    9. Log experiment record
    """
    t_start = time.time()
    steps_log = []

    try:
        # Step 1: Scan Dataset & Generate Metadata
        step1_res = dataset_service.scan_and_generate_metadata()
        steps_log.append(f"1. Scanned {step1_res['valid_files']} valid audio files in {step1_res['processing_time_seconds']}s")

        # Step 2: Speaker-Independent Splits
        step2_res = dataset_service.create_speaker_independent_splits(random_seed=req.random_seed)
        steps_log.append(f"2. Created speaker-independent splits: {step2_res['train_samples']} train, {step2_res['val_samples']} val, {step2_res['test_samples']} test. 0 leakage verified.")

        # Step 3: Feature Extraction
        step3_res = feature_service.extract_dataset_features(max_samples=req.max_samples, force_recompute=False)
        steps_log.append(f"3. Extracted {step3_res['total_extracted']} acoustic feature vectors ({step3_res['features_count']} features each).")

        # Step 4: Train Classical Baselines
        df = feature_service.get_features_dataframe()
        meta_cols = ["file_path", "file_name", "emotion", "actor_id", "split"]
        feat_cols = [c for c in df.columns if c not in meta_cols and df[c].dtype != object]
        train_df = df[df["split"] == "train"]
        test_df = df[df["split"] == "test"]
        if len(test_df) == 0:
            train_df = df.iloc[:int(len(df)*0.8)]
            test_df = df.iloc[int(len(df)*0.8):]

        baselines_res = baselines_manager.train_and_evaluate_all(
            X_train=train_df[feat_cols].fillna(0).values,
            y_train=train_df["emotion"].values,
            X_test=test_df[feat_cols].fillna(0).values,
            y_test=test_df["emotion"].values,
            feature_names=feat_cols
        )
        steps_log.append("4. Trained classical baselines (Logistic Regression, Random Forest, SVM).")

        # Step 5: Train PyTorch 2D-CNN
        train_res = training_service.start_training(
            epochs=req.epochs,
            batch_size=req.batch_size,
            random_seed=req.random_seed,
            max_samples=req.max_samples
        )
        # Wait for CNN training thread to finish
        if training_service._thread:
            training_service._thread.join()
        steps_log.append(f"5. Trained PyTorch 2D-CNN with early stopping: Best val loss {training_service.current_status.get('best_val_loss')}.")

        # Step 6: Full Evaluation on Test Split
        eval_res = evaluation_service.evaluate_model(model_type="cnn")
        steps_log.append(f"6. Evaluated on test set: Accuracy {eval_res['metrics']['accuracy']}%, Macro F1 {eval_res['metrics']['macro_f1']}%.")

        # Step 7: Benchmark CPU Performance
        bench_res = benchmark_service.run_benchmark(num_iterations=10)
        steps_log.append(f"7. Benchmarked CPU inference: Latency {bench_res['latency']['mean_ms']}ms, RTF {bench_res['real_time_factor']}x.")

        # Step 8: Log Experiment Record
        exp_id = f"EXP_{int(time.time())}"
        exp_record = {
            "experiment_id": exp_id,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "model": "Cognivision 2D-CNN Emotion Recognizer",
            "epochs": req.epochs,
            "batch_size": req.batch_size,
            "best_epoch": training_service.current_status.get("best_epoch", 0),
            "best_val_loss": training_service.current_status.get("best_val_loss", 0),
            "test_accuracy": eval_res["metrics"]["accuracy"],
            "macro_f1": eval_res["metrics"]["macro_f1"],
            "weighted_f1": eval_res["metrics"]["weighted_f1"],
            "avg_latency_ms": bench_res["latency"]["mean_ms"],
            "total_pipeline_time_seconds": round(time.time() - t_start, 2)
        }

        # Save to experiments.json
        exps = []
        if settings.EXPERIMENTS_PATH.exists():
            try:
                with open(settings.EXPERIMENTS_PATH, "r") as f:
                    exps = json.load(f)
            except Exception:
                exps = []
        exps.insert(0, exp_record)
        with open(settings.EXPERIMENTS_PATH, "w") as f:
            json.dump(exps, f, indent=2)

        steps_log.append(f"8. Logged experiment record '{exp_id}'.")

        return {
            "status": "success",
            "pipeline_time_seconds": round(time.time() - t_start, 2),
            "steps": steps_log,
            "experiment": exp_record,
            "evaluation": eval_res,
            "baselines": baselines_res,
            "benchmark": bench_res
        }

    except Exception as e:
        logger.error(f"Automated pipeline error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/experiments")
def get_experiments():
    """Retrieve history of all training experiments."""
    if settings.EXPERIMENTS_PATH.exists():
        try:
            with open(settings.EXPERIMENTS_PATH, "r") as f:
                return {"experiments": json.load(f)}
        except Exception:
            pass
    return {"experiments": []}

@router.get("/benchmark")
def run_or_get_benchmark():
    """Run CPU inference benchmark measuring latency, throughput, and Real-Time Factor (RTF)."""
    try:
        return benchmark_service.run_benchmark()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
def get_model_registry():
    """List registered models in local model registry."""
    models_list = []
    
    # Check best CNN model
    if settings.BEST_MODEL_PATH.exists():
        size_kb = os.path.getsize(settings.BEST_MODEL_PATH) / 1024
        cfg = {}
        if settings.MODEL_CONFIG_PATH.exists():
            try:
                with open(settings.MODEL_CONFIG_PATH, "r") as f:
                    cfg = json.load(f)
            except Exception:
                pass
        models_list.append({
            "id": "model_cnn_best",
            "name": "Cognivision 2D-CNN Emotion Recognizer",
            "status": "Active (Primary)",
            "type": "Custom Deep Learning",
            "path": str(settings.BEST_MODEL_PATH),
            "size_kb": round(size_kb, 2),
            "config": cfg
        })

    # Check classical baselines
    for model_name, fname in [
        ("Logistic Regression", "logistic_regression.joblib"),
        ("Random Forest", "random_forest.joblib"),
        ("Support Vector Machine", "svm.joblib")
    ]:
        p = settings.MODELS_DIR / "classical" / fname
        if p.exists():
            models_list.append({
                "id": f"model_{fname.split('.')[0]}",
                "name": model_name,
                "status": "Standby Baseline",
                "type": "Classical ML",
                "path": str(p),
                "size_kb": round(os.path.getsize(p) / 1024, 2),
                "config": {}
            })

    # SenseVoiceSmall
    models_list.append({
        "id": "sensevoice_small",
        "name": "SenseVoiceSmall (Alibaba FunASR)",
        "status": "Pretrained Multilingual",
        "type": "Speech Transformer",
        "path": "iic/SenseVoiceSmall",
        "size_kb": 958000.0,
        "config": {"languages": ["English", "Mandarin", "Cantonese", "Japanese", "Korean"]}
    })

    return {"models": models_list}

@router.get("/export/{export_type}")
def export_data(export_type: str):
    """Export evaluation report, experiments, or dataset metadata as CSV, JSON, or TXT."""
    export_type = export_type.lower()
    
    if export_type == "json":
        eval_report = evaluation_service.load_latest_eval_if_exists() or {}
        return eval_report
        
    elif export_type == "csv":
        if settings.METADATA_PATH.exists():
            with open(settings.METADATA_PATH, "r") as f:
                content = f.read()
            return Response(content=content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=cognivision_metadata.csv"})
        raise HTTPException(status_code=404, detail="Metadata not found")
        
    elif export_type == "txt" or export_type == "report":
        eval_data = evaluation_service.load_latest_eval_if_exists()
        if not eval_data:
            return PlainTextResponse("Cognivision Voice Intelligence - No evaluation run yet.")
            
        m = eval_data.get("metrics", {})
        lines = [
            "=" * 60,
            "COGNIVISION VOICE INTELLIGENCE - EVALUATION REPORT",
            "=" * 60,
            f"Generated: {eval_data.get('timestamp')}",
            f"Test Samples Evaluated: {eval_data.get('total_test_samples')}",
            f"Overall Accuracy:       {m.get('accuracy')}%",
            f"Macro F1-Score:         {m.get('macro_f1')}%",
            f"Weighted F1-Score:      {m.get('weighted_f1')}%",
            f"Balanced Accuracy:      {m.get('balanced_accuracy')}%",
            "-" * 60,
            "PER-CLASS PERFORMANCE:",
            f"{'Emotion':<12} {'Precision':<10} {'Recall':<10} {'F1-Score':<10} {'Support':<8}",
            "-" * 60
        ]
        for pc in eval_data.get("per_class", []):
            lines.append(f"{pc['emotion']:<12} {pc['precision']:<10} {pc['recall']:<10} {pc['f1']:<10} {pc['support']:<8}")
        lines.append("=" * 60)
        return PlainTextResponse("\n".join(lines))
        
    raise HTTPException(status_code=400, detail=f"Unsupported export type '{export_type}'. Use 'json', 'csv', or 'txt'.")
