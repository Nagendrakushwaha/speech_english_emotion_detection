import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Any

class EmotionCNN(nn.Module):
    """Lightweight 2D CNN for speech emotion recognition from Log-Mel Spectrograms.
    Optimized for high CPU efficiency and fast inference on AMD Ryzen 5 / modern x86.
    """
    def __init__(self, num_classes: int = 6, in_channels: int = 1, dropout: float = 0.25):
        super().__init__()
        
        # Conv Block 1: 1 -> 32
        self.conv1 = nn.Conv2d(in_channels, 32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        
        # Conv Block 2: 32 -> 64
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        
        # Conv Block 3: 64 -> 64
        self.conv3 = nn.Conv2d(64, 64, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(64)
        
        self.pool = nn.MaxPool2d(2, 2)
        self.adaptive_pool = nn.AdaptiveAvgPool2d((2, 2))
        self.dropout = nn.Dropout(dropout)
        
        # Fully connected layers
        self.fc1 = nn.Linear(64 * 2 * 2, 128)
        self.fc2 = nn.Linear(128, num_classes)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Input: (batch, 1, n_mels, time_frames)
        x = self.pool(F.relu(self.bn1(self.conv1(x))))
        x = self.dropout(x)
        
        x = self.pool(F.relu(self.bn2(self.conv2(x))))
        x = self.dropout(x)
        
        x = self.adaptive_pool(F.relu(self.bn3(self.conv3(x))))
        x = self.dropout(x)
        
        x = x.view(x.size(0), -1)
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        logits = self.fc2(x)
        return logits

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            probs = F.softmax(logits, dim=-1)
        return probs

    def get_model_info(self) -> Dict[str, Any]:
        """Return architecture parameters and size."""
        total_params = sum(p.numel() for p in self.parameters())
        trainable_params = sum(p.numel() for p in self.parameters() if p.requires_grad)
        return {
            "model_name": "Cognivision 2D-CNN Emotion Recognizer",
            "architecture": "Log-Mel Spectrogram -> 3x Conv2D/BN/MaxPool -> AdaptiveAvgPool -> Dense -> Dropout -> 6-class Logits",
            "total_parameters": total_params,
            "trainable_parameters": trainable_params,
            "size_mb": round(total_params * 4 / (1024 * 1024), 3),
            "device_target": "CPU (PyTorch)"
        }
