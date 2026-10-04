import sys
import time
from pathlib import Path

# Setup paths
project_root = Path(__file__).resolve().parent.parent
backend_dir = project_root / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

print("=" * 60)
print("COGNIVISION VOICE INTELLIGENCE - TEST RUNNER")
print("=" * 60)

passed = 0
failed = 0

def run_test(name, fn):
    global passed, failed
    try:
        t0 = time.time()
        fn()
        elapsed = round(time.time() - t0, 3)
        print(f" [PASS] {name} ({elapsed}s)")
        passed += 1
    except Exception as e:
        print(f" [FAIL] {name}: {e}")
        failed += 1

# 1. Data Tests
print("\n--- Running Dataset & Metadata Tests ---")
from tests.test_data import test_emotion_code_mapping, test_metadata_dataframe_integrity, test_speaker_independent_splits_integrity
run_test("test_emotion_code_mapping", test_emotion_code_mapping)
run_test("test_metadata_dataframe_integrity", test_metadata_dataframe_integrity)
run_test("test_speaker_independent_splits_integrity", test_speaker_independent_splits_integrity)

# 2. Preprocessing Tests
print("\n--- Running Audio Preprocessing & Feature Tests ---")
from tests.test_preprocessing import test_audio_pipeline_synthetic_signal, test_waveform_decimation, test_feature_extraction
run_test("test_audio_pipeline_synthetic_signal", test_audio_pipeline_synthetic_signal)
run_test("test_waveform_decimation", test_waveform_decimation)
run_test("test_feature_extraction", test_feature_extraction)

# 3. Model Tests
print("\n--- Running PyTorch 2D-CNN & Model Tests ---")
from tests.test_model import test_cnn_model_architecture, test_cnn_parameter_budget
run_test("test_cnn_model_architecture", test_cnn_model_architecture)
run_test("test_cnn_parameter_budget", test_cnn_parameter_budget)

# 4. API Endpoint Tests
print("\n--- Running API Integration Tests ---")
from fastapi.testclient import TestClient
from app.main import app

with TestClient(app) as client:
    from tests.test_api import test_health_endpoint, test_dataset_summary_endpoint, test_models_registry_endpoint, test_benchmark_endpoint
    run_test("test_health_endpoint", lambda: test_health_endpoint(client))
    run_test("test_dataset_summary_endpoint", lambda: test_dataset_summary_endpoint(client))
    run_test("test_models_registry_endpoint", lambda: test_models_registry_endpoint(client))
    run_test("test_benchmark_endpoint", lambda: test_benchmark_endpoint(client))

print("\n" + "=" * 60)
print(f"TOTAL TESTS: {passed + failed} | PASSED: {passed} | FAILED: {failed}")
print("=" * 60)

if failed > 0:
    sys.exit(1)
