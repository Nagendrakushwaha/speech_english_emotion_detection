import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health_endpoint(client):
    """Verify health endpoint returns status healthy and CPU device info."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "CPU" in data["device"]
    assert "service" in data

def test_dataset_summary_endpoint(client):
    """Verify dataset summary endpoint returns valid counts and statistics."""
    response = client.get("/api/dataset/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_files" in data
    assert "valid_files" in data
    assert "duration_stats" in data

def test_models_registry_endpoint(client):
    """Verify models endpoint returns registered models list."""
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert len(data["models"]) > 0

def test_benchmark_endpoint(client):
    """Verify CPU benchmark endpoint returns latency and Real-Time Factor (RTF)."""
    response = client.get("/api/benchmark")
    assert response.status_code == 200
    data = response.json()
    assert "latency" in data
    assert "real_time_factor" in data
    assert data["real_time_factor"] > 0
