import time
from pathlib import Path
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from concurrent.futures import ThreadPoolExecutor

from app.utils.config import settings
from app.preprocessing.feature_extractor import extract_features_from_file
from app.services.dataset_service import dataset_service
from app.utils.logger import logger

class FeatureService:
    def __init__(self):
        self.features_path = settings.FEATURES_PATH
        self.features_csv_path = settings.FEATURES_CSV_PATH
        self._features_df: Optional[pd.DataFrame] = None
        self.load_features_if_exists()

    def load_features_if_exists(self) -> Optional[pd.DataFrame]:
        """Load extracted features from disk if available."""
        if self.features_path.exists():
            try:
                self._features_df = pd.read_parquet(self.features_path)
                logger.info(f"Loaded features from parquet: {len(self._features_df)} records.")
                return self._features_df
            except Exception as e:
                logger.warning(f"Could not load parquet, trying CSV: {e}")
        
        if self.features_csv_path.exists():
            try:
                self._features_df = pd.read_csv(self.features_csv_path)
                logger.info(f"Loaded features from csv: {len(self._features_df)} records.")
                return self._features_df
            except Exception as e:
                logger.error(f"Error loading features csv: {e}")
        return None

    def extract_dataset_features(self, max_samples: Optional[int] = None, force_recompute: bool = False) -> Dict[str, Any]:
        """Extract acoustic features for dataset files and cache to disk."""
        if not force_recompute and self._features_df is not None:
            return {
                "status": "ready",
                "total_extracted": len(self._features_df),
                "features_count": len([c for c in self._features_df.columns if c not in ["file_path", "file_name", "emotion", "actor_id", "split"]])
            }

        t0 = time.time()
        if dataset_service._df is None:
            dataset_service.load_metadata_if_exists()
            if dataset_service._df is None:
                dataset_service.scan_and_generate_metadata()
                
        df = dataset_service._df
        valid_df = df[df["is_valid"] == True].copy()
        if max_samples and max_samples < len(valid_df):
            # Stratified sample across emotions to be fast yet representative
            valid_df = valid_df.groupby("emotion", group_keys=False).apply(
                lambda x: x.sample(min(len(x), max(1, max_samples // 6)), random_state=42)
            ).reset_index(drop=True)

        logger.info(f"Extracting acoustic features for {len(valid_df)} audio files...")
        
        results = []
        def _process_row(row):
            fpath = row["file_path"]
            try:
                feats = extract_features_from_file(fpath)
                feats["file_path"] = fpath
                feats["file_name"] = row["file_name"]
                feats["emotion"] = row["emotion"]
                feats["actor_id"] = row["actor_id"]
                feats["split"] = row.get("split", "train")
                return feats
            except Exception as e:
                logger.warning(f"Feature extraction failed for {fpath}: {e}")
                return None

        # Multithreaded extraction for speed on multicore CPU
        with ThreadPoolExecutor(max_workers=4) as executor:
            for res in executor.map(_process_row, [r for _, r in valid_df.iterrows()]):
                if res is not None:
                    results.append(res)

        feats_df = pd.DataFrame(results)
        settings.DATA_DIR.joinpath("processed").mkdir(parents=True, exist_ok=True)
        try:
            feats_df.to_parquet(self.features_path, index=False)
        except Exception:
            pass
        feats_df.to_csv(self.features_csv_path, index=False)
        
        self._features_df = feats_df
        duration = round(time.time() - t0, 2)
        logger.info(f"Feature extraction completed in {duration}s. Extracted {len(feats_df)} rows with {len(feats_df.columns)} columns.")

        return {
            "status": "ready",
            "total_extracted": len(feats_df),
            "features_count": len([c for c in feats_df.columns if c not in ["file_path", "file_name", "emotion", "actor_id", "split"]]),
            "elapsed_seconds": duration
        }

    def get_features_dataframe(self) -> pd.DataFrame:
        """Return the active features DataFrame or extract default batch if none exists."""
        if self._features_df is None:
            self.load_features_if_exists()
        if self._features_df is None:
            # Extract standard representative subset (e.g. 1200 files for instantaneous EDA/Baselines)
            self.extract_dataset_features(max_samples=1200)
        return self._features_df

    def get_3d_pca_data(self) -> Dict[str, Any]:
        """Compute 3D PCA projection of acoustic features for interactive 3D visualization."""
        df = self.get_features_dataframe()
        if df is None or len(df) == 0:
            return {"error": "No feature data available"}

        meta_cols = ["file_path", "file_name", "emotion", "actor_id", "split"]
        feat_cols = [c for c in df.columns if c not in meta_cols and np.issubdtype(df[c].dtype, np.number)]
        
        X = df[feat_cols].fillna(0).values
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        pca = PCA(n_components=3, random_state=42)
        X_pca = pca.fit_transform(X_scaled)

        explained_var = [round(float(v) * 100, 2) for v in pca.explained_variance_ratio_]

        points = []
        for i in range(len(df)):
            points.append({
                "x": round(float(X_pca[i, 0]), 3),
                "y": round(float(X_pca[i, 1]), 3),
                "z": round(float(X_pca[i, 2]), 3),
                "emotion": str(df.iloc[i]["emotion"]),
                "actor": str(df.iloc[i]["actor_id"]),
                "file_name": str(df.iloc[i]["file_name"])
            })

        return {
            "pca_points": points,
            "explained_variance_ratio": explained_var,
            "total_variance_explained": round(float(sum(explained_var)), 2),
            "total_points": len(points),
            "feature_count": len(feat_cols)
        }

    def get_3d_acoustic_space(self) -> Dict[str, Any]:
        """Return 3D acoustic feature space (X=MFCC-1, Y=Spectral Centroid, Z=RMS Energy) colored by emotion."""
        df = self.get_features_dataframe()
        if df is None or len(df) == 0:
            return {"error": "No feature data available"}

        points = []
        for _, row in df.iterrows():
            points.append({
                "x": round(float(row.get("mfcc_1_mean", 0)), 3),
                "y": round(float(row.get("spectral_centroid_mean", 0)), 3),
                "z": round(float(row.get("rms_mean", 0)), 4),
                "emotion": str(row["emotion"]),
                "actor": str(row["actor_id"]),
                "file_name": str(row["file_name"])
            })

        return {
            "acoustic_points": points,
            "axes": {
                "x": "MFCC-1 Mean (Timbral shape)",
                "y": "Spectral Centroid Mean (Hz, Brightness)",
                "z": "RMS Energy Mean (Loudness)"
            },
            "total_points": len(points)
        }

    def get_feature_distributions(self) -> Dict[str, Any]:
        """Aggregate feature distributions grouped by emotion for boxplots and statistical comparison."""
        df = self.get_features_dataframe()
        if df is None or len(df) == 0:
            return {"error": "No feature data available"}

        features_to_group = [
            "rms_mean", "zcr_mean", "spectral_centroid_mean", "spectral_bandwidth_mean",
            "spectral_rolloff_mean", "pitch_f0_mean", "mfcc_1_mean", "mfcc_2_mean"
        ]

        grouped = {}
        for feat in features_to_group:
            if feat not in df.columns:
                continue
            grouped[feat] = {}
            for emo, group in df.groupby("emotion"):
                vals = group[feat].dropna().values
                grouped[feat][str(emo)] = {
                    "mean": round(float(np.mean(vals)), 4),
                    "std": round(float(np.std(vals)), 4),
                    "min": round(float(np.min(vals)), 4),
                    "max": round(float(np.max(vals)), 4),
                    "median": round(float(np.median(vals)), 4),
                    "q25": round(float(np.percentile(vals, 25)), 4),
                    "q75": round(float(np.percentile(vals, 75)), 4),
                    "samples": [round(float(v), 4) for v in vals[:60]] # Sample points for jitter
                }

        # MFCC 1-13 Means by Emotion for heatmap
        mfcc_heatmap = {}
        for emo, group in df.groupby("emotion"):
            mfcc_heatmap[str(emo)] = [
                round(float(group[f"mfcc_{i+1}_mean"].mean()), 3) for i in range(13)
            ]

        return {
            "grouped_distributions": grouped,
            "mfcc_heatmap": mfcc_heatmap
        }

feature_service = FeatureService()
