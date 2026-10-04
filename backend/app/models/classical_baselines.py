import os
import joblib
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

from app.utils.config import settings
from app.utils.constants import EMOTIONS
from app.utils.logger import logger

class ClassicalBaselinesManager:
    def __init__(self):
        self.save_dir = settings.MODELS_DIR / "classical"
        self.save_dir.mkdir(parents=True, exist_ok=True)
        self.models: Dict[str, Any] = {}
        self.metrics: Dict[str, Dict[str, float]] = {}

    def train_and_evaluate_all(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_test: np.ndarray,
        y_test: np.ndarray,
        feature_names: list[str]
    ) -> Dict[str, Any]:
        """Train Logistic Regression, Random Forest, and SVM on acoustic features."""
        logger.info(f"Training Classical Baselines on {len(X_train)} train and {len(X_test)} test samples...")
        
        results = {}

        # 1. Logistic Regression Pipeline
        lr_pipe = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=500, random_state=42, C=1.0))
        ])
        lr_pipe.fit(X_train, y_train)
        y_pred_lr = lr_pipe.predict(X_test)
        self.models["Logistic Regression"] = lr_pipe
        joblib.dump(lr_pipe, self.save_dir / "logistic_regression.joblib")
        
        results["Logistic Regression"] = {
            "accuracy": round(float(accuracy_score(y_test, y_pred_lr)), 4),
            "macro_f1": round(float(f1_score(y_test, y_pred_lr, average="macro", zero_division=0)), 4),
            "weighted_f1": round(float(f1_score(y_test, y_pred_lr, average="weighted", zero_division=0)), 4),
            "model_size_kb": round(os.path.getsize(self.save_dir / "logistic_regression.joblib") / 1024, 2)
        }

        # 2. Random Forest Classifier
        rf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
        rf.fit(X_train, y_train)
        y_pred_rf = rf.predict(X_test)
        self.models["Random Forest"] = rf
        joblib.dump(rf, self.save_dir / "random_forest.joblib")
        
        # Feature importances for explainability
        rf_importances = sorted(
            [{"feature": name, "importance": round(float(imp), 4)}
             for name, imp in zip(feature_names, rf.feature_importances_)],
            key=lambda x: x["importance"],
            reverse=True
        )[:15]

        results["Random Forest"] = {
            "accuracy": round(float(accuracy_score(y_test, y_pred_rf)), 4),
            "macro_f1": round(float(f1_score(y_test, y_pred_rf, average="macro", zero_division=0)), 4),
            "weighted_f1": round(float(f1_score(y_test, y_pred_rf, average="weighted", zero_division=0)), 4),
            "model_size_kb": round(os.path.getsize(self.save_dir / "random_forest.joblib") / 1024, 2),
            "top_features": rf_importances
        }

        # 3. Support Vector Classifier
        svm_pipe = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", SVC(kernel="rbf", C=2.0, probability=True, random_state=42))
        ])
        svm_pipe.fit(X_train, y_train)
        y_pred_svm = svm_pipe.predict(X_test)
        self.models["SVM (RBF)"] = svm_pipe
        joblib.dump(svm_pipe, self.save_dir / "svm.joblib")

        results["SVM (RBF)"] = {
            "accuracy": round(float(accuracy_score(y_test, y_pred_svm)), 4),
            "macro_f1": round(float(f1_score(y_test, y_pred_svm, average="macro", zero_division=0)), 4),
            "weighted_f1": round(float(f1_score(y_test, y_pred_svm, average="weighted", zero_division=0)), 4),
            "model_size_kb": round(os.path.getsize(self.save_dir / "svm.joblib") / 1024, 2)
        }

        self.metrics = results
        logger.info(f"Classical baselines trained. Results: {results}")
        return results

    def get_feature_importances(self) -> list[Dict[str, Any]]:
        """Return Random Forest feature importances for explainability."""
        rf_path = self.save_dir / "random_forest.joblib"
        if not rf_path.exists():
            return []
        rf = joblib.load(rf_path)
        # Load feature names from features df if available
        from app.services.feature_service import feature_service
        df = feature_service.get_features_dataframe()
        meta_cols = ["file_path", "file_name", "emotion", "actor_id", "split"]
        feat_cols = [c for c in df.columns if c not in meta_cols and np.issubdtype(df[c].dtype, np.number)]
        
        if hasattr(rf, "feature_importances_") and len(feat_cols) == len(rf.feature_importances_):
            return sorted(
                [{"feature": name, "importance": round(float(imp), 4)}
                 for name, imp in zip(feat_cols, rf.feature_importances_)],
                key=lambda x: x["importance"],
                reverse=True
            )[:15]
        return []

baselines_manager = ClassicalBaselinesManager()
