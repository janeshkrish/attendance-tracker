"""
CNN-based Liveness Detection Module
Implements anti-spoofing for face recognition attendance system
"""

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Optional, List
import logging
import os
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LivenessCNN(nn.Module):
    """
    Lightweight CNN for liveness detection (anti-spoofing)
    """
    
    def __init__(self, input_size: Tuple[int, int] = (64, 64), num_classes: int = 2):
        super(LivenessCNN, self).__init__()
        self.input_size = input_size
        
        # Feature extraction layers
        self.conv1 = nn.Conv2d(3, 32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        self.pool1 = nn.MaxPool2d(2, 2)
        
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        self.pool2 = nn.MaxPool2d(2, 2)
        
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(128)
        self.pool3 = nn.MaxPool2d(2, 2)
        
        self.conv4 = nn.Conv2d(128, 256, kernel_size=3, padding=1)
        self.bn4 = nn.BatchNorm2d(256)
        self.pool4 = nn.MaxPool2d(2, 2)
        
        # Calculate the size after convolutions and pooling
        # For input size 64x64: 64/2/2/2/2 = 4x4
        conv_output_size = (input_size[0] // 16) * (input_size[1] // 16) * 256
        
        # Classification layers
        self.dropout1 = nn.Dropout(0.5)
        self.fc1 = nn.Linear(conv_output_size, 512)
        self.dropout2 = nn.Dropout(0.5)
        self.fc2 = nn.Linear(512, 128)
        self.fc3 = nn.Linear(128, num_classes)
        
    def forward(self, x):
        # Feature extraction
        x = F.relu(self.bn1(self.conv1(x)))
        x = self.pool1(x)
        
        x = F.relu(self.bn2(self.conv2(x)))
        x = self.pool2(x)
        
        x = F.relu(self.bn3(self.conv3(x)))
        x = self.pool3(x)
        
        x = F.relu(self.bn4(self.conv4(x)))
        x = self.pool4(x)
        
        # Flatten for fully connected layers
        x = x.view(x.size(0), -1)
        
        # Classification
        x = self.dropout1(x)
        x = F.relu(self.fc1(x))
        x = self.dropout2(x)
        x = F.relu(self.fc2(x))
        x = self.fc3(x)
        
        return x

class LivenessDetector:
    """
    Liveness detection system for anti-spoofing
    """
    
    def __init__(self, model_path: Optional[str] = None, input_size: Tuple[int, int] = (64, 64)):
        """
        Initialize liveness detector
        
        Args:
            model_path: Path to trained liveness model
            input_size: Input image size for the model
        """
        self.input_size = input_size
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Initialize model
        self.model = LivenessCNN(input_size=input_size)
        self.model.to(self.device)
        self.model.eval()
        
        # Load trained weights if available
        if model_path and os.path.exists(model_path):
            self._load_model(model_path)
        else:
            logger.warning("No trained liveness model found. Using random weights.")
        
        # Texture analysis for additional anti-spoofing
        self.lbp_radius = 1
        self.lbp_n_points = 8
        
    def _load_model(self, model_path: str):
        """Load trained model weights"""
        try:
            checkpoint = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(checkpoint)
            logger.info(f"Liveness model loaded from {model_path}")
        except Exception as e:
            logger.error(f"Error loading liveness model: {e}")
    
    def _preprocess_image(self, image: np.ndarray) -> torch.Tensor:
        """
        Preprocess image for liveness detection
        
        Args:
            image: Input face image in BGR format
            
        Returns:
            Preprocessed tensor
        """
        # Resize to model input size
        resized = cv2.resize(image, self.input_size)
        
        # Convert BGR to RGB
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        
        # Normalize to [0, 1]
        normalized = rgb.astype(np.float32) / 255.0
        
        # Convert to tensor and add batch dimension
        tensor = torch.from_numpy(normalized.transpose(2, 0, 1)).unsqueeze(0).to(self.device)
        
        return tensor
    
    def _calculate_lbp(self, image: np.ndarray) -> np.ndarray:
        """
        Calculate Local Binary Pattern for texture analysis
        
        Args:
            image: Grayscale image
            
        Returns:
            LBP image
        """
        height, width = image.shape
        lbp = np.zeros((height, width), dtype=np.uint8)
        
        for i in range(self.lbp_radius, height - self.lbp_radius):
            for j in range(self.lbp_radius, width - self.lbp_radius):
                center = image[i, j]
                code = 0
                
                # Sample points around the center
                for p in range(self.lbp_n_points):
                    angle = 2 * np.pi * p / self.lbp_n_points
                    x = int(j + self.lbp_radius * np.cos(angle))
                    y = int(i - self.lbp_radius * np.sin(angle))
                    
                    if 0 <= y < height and 0 <= x < width:
                        if image[y, x] >= center:
                            code |= (1 << p)
                
                lbp[i, j] = code
        
        return lbp
    
    def _texture_analysis(self, image: np.ndarray) -> float:
        """
        Perform texture analysis for liveness detection
        
        Args:
            image: Input face image in BGR format
            
        Returns:
            Texture score (higher = more likely to be real)
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Calculate LBP
        lbp = self._calculate_lbp(gray)
        
        # Calculate texture features
        lbp_hist, _ = np.histogram(lbp.flatten(), bins=256, range=(0, 256), density=True)
        
        # Calculate entropy as texture measure
        entropy = -np.sum(lbp_hist * np.log2(lbp_hist + 1e-7))
        
        # Normalize entropy (typical range 0-8)
        texture_score = min(entropy / 8.0, 1.0)
        
        return texture_score
    
    def _motion_analysis(self, frames: List[np.ndarray]) -> float:
        """
        Analyze motion between consecutive frames
        
        Args:
            frames: List of consecutive frames
            
        Returns:
            Motion score (higher = more likely to be real)
        """
        if len(frames) < 2:
            return 0.5  # Neutral score
        
        motion_scores = []
        
        for i in range(1, len(frames)):
            # Convert to grayscale
            prev_gray = cv2.cvtColor(frames[i-1], cv2.COLOR_BGR2GRAY)
            curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)
            
            # Calculate optical flow
            flow = cv2.calcOpticalFlowPyrLK(
                prev_gray, curr_gray, 
                np.array([[32, 32]], dtype=np.float32),  # Simple corner points
                None
            )[0]
            
            # Calculate motion magnitude
            if flow is not None and len(flow) > 0:
                motion_mag = np.linalg.norm(flow[0] - np.array([32, 32]))
                motion_scores.append(motion_mag)
        
        if motion_scores:
            avg_motion = np.mean(motion_scores)
            # Normalize motion score (typical range 0-10)
            return min(avg_motion / 10.0, 1.0)
        
        return 0.5
    
    def detect_liveness(self, face_image: np.ndarray, confidence_threshold: float = 0.7) -> Tuple[bool, float]:
        """
        Detect if face is live (anti-spoofing)
        
        Args:
            face_image: Input face image in BGR format
            confidence_threshold: Threshold for liveness detection
            
        Returns:
            Tuple of (is_live, confidence_score)
        """
        try:
            # CNN-based liveness detection
            with torch.no_grad():
                input_tensor = self._preprocess_image(face_image)
                outputs = self.model(input_tensor)
                probabilities = F.softmax(outputs, dim=1)
                
                # Get liveness probability (assuming class 1 is 'live')
                liveness_prob = float(probabilities[0][1])
            
            # Texture analysis
            texture_score = self._texture_analysis(face_image)
            
            # Combine scores (weighted average)
            combined_score = 0.7 * liveness_prob + 0.3 * texture_score
            
            is_live = combined_score >= confidence_threshold
            
            return is_live, combined_score
            
        except Exception as e:
            logger.error(f"Error in liveness detection: {e}")
            return False, 0.0
    
    def detect_liveness_sequence(self, face_frames: List[np.ndarray], confidence_threshold: float = 0.7) -> Tuple[bool, float]:
        """
        Detect liveness using sequence of frames
        
        Args:
            face_frames: List of consecutive face images
            confidence_threshold: Threshold for liveness detection
            
        Returns:
            Tuple of (is_live, confidence_score)
        """
        if not face_frames:
            return False, 0.0
        
        try:
            # Get liveness scores for individual frames
            frame_scores = []
            for frame in face_frames:
                is_live, score = self.detect_liveness(frame, confidence_threshold=0.0)
                frame_scores.append(score)
            
            # Motion analysis
            motion_score = self._motion_analysis(face_frames)
            
            # Combine all scores
            avg_frame_score = np.mean(frame_scores)
            combined_score = 0.6 * avg_frame_score + 0.4 * motion_score
            
            is_live = combined_score >= confidence_threshold
            
            return is_live, combined_score
            
        except Exception as e:
            logger.error(f"Error in sequence liveness detection: {e}")
            return False, 0.0
    
    def train_model(self, train_loader, val_loader, epochs: int = 20, learning_rate: float = 0.001):
        """
        Train the liveness detection model
        
        Args:
            train_loader: Training data loader
            val_loader: Validation data loader
            epochs: Number of training epochs
            learning_rate: Learning rate for training
        """
        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=learning_rate)
        scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=7, gamma=0.1)
        
        self.model.train()
        
        for epoch in range(epochs):
            train_loss = 0.0
            train_correct = 0
            train_total = 0
            
            # Training loop
            for batch_idx, (data, targets) in enumerate(train_loader):
                data, targets = data.to(self.device), targets.to(self.device)
                
                optimizer.zero_grad()
                outputs = self.model(data)
                loss = criterion(outputs, targets)
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item()
                _, predicted = outputs.max(1)
                train_total += targets.size(0)
                train_correct += predicted.eq(targets).sum().item()
            
            # Validation
            val_loss, val_acc = self._validate(val_loader, criterion)
            
            scheduler.step()
            
            logger.info(f'Epoch {epoch+1}/{epochs}:')
            logger.info(f'  Train Loss: {train_loss/len(train_loader):.4f}, '
                       f'Train Acc: {100.*train_correct/train_total:.2f}%')
            logger.info(f'  Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%')
    
    def _validate(self, val_loader, criterion):
        """Validate the model"""
        self.model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for data, targets in val_loader:
                data, targets = data.to(self.device), targets.to(self.device)
                outputs = self.model(data)
                loss = criterion(outputs, targets)
                
                val_loss += loss.item()
                _, predicted = outputs.max(1)
                val_total += targets.size(0)
                val_correct += predicted.eq(targets).sum().item()
        
        self.model.train()
        return val_loss/len(val_loader), 100.*val_correct/val_total
    
    def save_model(self, save_path: str):
        """Save the trained model"""
        torch.save(self.model.state_dict(), save_path)
        logger.info(f"Model saved to {save_path}")
    
    def get_model_info(self) -> dict:
        """Get information about the liveness model"""
        return {
            "input_size": self.input_size,
            "device": str(self.device),
            "model_parameters": sum(p.numel() for p in self.model.parameters()),
            "model_size_mb": sum(p.numel() * p.element_size() for p in self.model.parameters()) / (1024 * 1024)
        }

# Example usage and testing
if __name__ == "__main__":
    # Initialize detector
    detector = LivenessDetector()
    
    # Test with webcam
    cap = cv2.VideoCapture(0)
    
    print("Press 'q' to quit, 's' to test liveness")
    frames_buffer = []
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Maintain buffer of recent frames
        frames_buffer.append(frame.copy())
        if len(frames_buffer) > 5:
            frames_buffer.pop(0)
        
        cv2.imshow('Liveness Detection', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            # Test liveness detection
            is_live, confidence = detector.detect_liveness(frame)
            print(f"Liveness: {'LIVE' if is_live else 'SPOOF'} (Confidence: {confidence:.3f})")
            
            # Test with sequence
            if len(frames_buffer) >= 3:
                is_live_seq, confidence_seq = detector.detect_liveness_sequence(frames_buffer)
                print(f"Sequence Liveness: {'LIVE' if is_live_seq else 'SPOOF'} (Confidence: {confidence_seq:.3f})")
    
    cap.release()
    cv2.destroyAllWindows()
    
    # Print model info
    print(detector.get_model_info())