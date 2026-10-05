#!/usr/bin/env python3
"""Cognivision Voice Intelligence - Automated CLI Pipeline Runner

Executes the complete end-to-end AI/ML workflow:
1. Scan CREMA-D dataset & validate audio files
2. Generate metadata.csv
3. Create speaker-independent splits (zero leakage)
4. Extract 40 acoustic features
5. Train classical baselines (Logistic Regression, Random Forest, SVM)
6. Train custom PyTorch 2D-CNN with Early Stopping
7. Evaluate on untouched speaker-independent test split
8. Benchmark CPU inference latency and RTF
9. Log experiment record
"""

import sys
import time
from pathlib import Path

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

# pyrefly: ignore [missing-import]
from app.api.experiment_routes import run_complete_experiment_pipeline, PipelineRequest
from app.utils.logger import logger

def main():
    print("=" * 70)
    print("COGNIVISION VOICE INTELLIGENCE - AUTOMATED PIPELINE EXECUTION")
    print("=" * 70)

    req = PipelineRequest(
        epochs=15,
        batch_size=32,
        max_samples=1200,
        random_seed=42
    )

    t0 = time.time()
    try:
        res = run_complete_experiment_pipeline(req)
        print("\nPIPELINE EXECUTION SUMMARY:")
        print("-" * 70)
        for step in res["steps"]:
            print(f" -> {step}")
        print("-" * 70)
        print(f"Total Pipeline Runtime: {res['pipeline_time_seconds']} seconds")
        print(f"Test Accuracy:         {res['evaluation']['metrics']['accuracy']}%")
        print(f"Macro F1 Score:        {res['evaluation']['metrics']['macro_f1']}%")
        print(f"Real-Time Factor:      {res['benchmark']['real_time_factor']}x")
        print("=" * 70)
        print("Pipeline completed successfully! Results updated across platform.")
    except Exception as e:
        logger.error(f"Pipeline execution failed: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
