import pytest
import torch
import numpy as np

from app.models.cnn_emotion_model import EmotionCNN
from app.utils.constants import EMOTIONS

def test_cnn_model_architecture():
    """Verify EmotionCNN model instantiation, parameter count, and output shapes."""
    model = EmotionCNN(num_classes=len(EMOTIONS))
    model.eval()

    dummy_input = torch.randn(2, 1, 64, 94)
    with torch.no_grad():
        logits = model(dummy_input)
        probs = model.predict_proba(dummy_input)

    assert logits.shape == (2, 6), f"Expected logits shape (2, 6), got {logits.shape}"
    assert probs.shape == (2, 6), f"Expected probs shape (2, 6), got {probs.shape}"
    
    prob_sums = probs.sum(dim=1).numpy()
    np.testing.assert_allclose(prob_sums, [1.0, 1.0], atol=1e-5)

def test_cnn_parameter_budget():
    """Verify model is CPU friendly with fewer than 150,000 parameters."""
    model = EmotionCNN(num_classes=6)
    total_params = sum(p.numel() for p in model.parameters())
    assert total_params < 150000, f"Model is too large for fast CPU inference ({total_params} parameters)"
