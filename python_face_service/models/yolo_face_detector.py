"""
YOLO Face Detection Module
Integrates YOLOv8 for real-time face detection in attendance system
"""

import cv2
import torch
import numpy as np
from ultralytics import YOLO
from typing import List, Tuple, Optional
import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YOLOFaceDetector:
    """
    YOLO-based face detection optimized for attendance systems
    """
    
    def __init__(self, model_path: Optional[str] = None, confidence_threshold: float = 0.5):
        """
        Initialize YOLO face detector
        
        Args:
            model_path: Path to YOLO model weights
            confidence_threshold: Minimum confidence for face detection
        """
        self.confidence_threshold = confidence_threshold
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
        # Model paths
        if model_path is None:
            # Use pre-trained YOLOv8n model or face-specific model
            model_path = "yolov8n-face.pt"  # Face-specific YOLO model
            if not os.path.exists(model_path):
                model_path = "yolov8n.pt"  # Fallback to general YOLO model
                
        self.model_path = model_path
        self.model = None
        self._load_model()
        
    def _load_model(self):
        """Load YOLO model"""
        try:
            self.model = YOLO(self.model_path)
            self.model.to(self.device)
            logger.info(f"YOLO model loaded successfully on {self.device}")
        except Exception as e:
            logger.error(f"Error loading YOLO model: {e}")
            raise
    
    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int, float]]:
        """
        Detect faces in image using YOLO
        
        Args:
            image: Input image in BGR format
            
        Returns:
            List of tuples (x1, y1, x2, y2, confidence) for each detected face
        """
        if self.model is None:
            raise RuntimeError("YOLO model not loaded")
            
        try:
            # Run YOLO detection
            results = self.model(image, verbose=False)
            
            faces = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Get box coordinates and confidence
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0])
                        
                        # Filter by confidence and class (person class = 0 for general YOLO)
                        if confidence >= self.confidence_threshold:
                            faces.append((int(x1), int(y1), int(x2), int(y2), confidence))
            
            return faces
            
        except Exception as e:
            logger.error(f"Error in face detection: {e}")
            return []
    
    def detect_faces_batch(self, images: List[np.ndarray]) -> List[List[Tuple[int, int, int, int, float]]]:
        """
        Detect faces in batch of images
        
        Args:
            images: List of input images in BGR format
            
        Returns:
            List of face detections for each image
        """
        if self.model is None:
            raise RuntimeError("YOLO model not loaded")
            
        try:
            # Run batch detection
            results = self.model(images, verbose=False)
            
            batch_faces = []
            for result in results:
                faces = []
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0])
                        
                        if confidence >= self.confidence_threshold:
                            faces.append((int(x1), int(y1), int(x2), int(y2), confidence))
                
                batch_faces.append(faces)
            
            return batch_faces
            
        except Exception as e:
            logger.error(f"Error in batch face detection: {e}")
            return [[] for _ in images]
    
    def extract_face_regions(self, image: np.ndarray, padding: int = 20) -> List[Tuple[np.ndarray, Tuple[int, int, int, int]]]:
        """
        Extract face regions from image
        
        Args:
            image: Input image in BGR format
            padding: Padding around detected face
            
        Returns:
            List of tuples (face_region, bbox) for each detected face
        """
        faces = self.detect_faces(image)
        face_regions = []
        
        h, w = image.shape[:2]
        
        for x1, y1, x2, y2, confidence in faces:
            # Add padding
            x1_pad = max(0, x1 - padding)
            y1_pad = max(0, y1 - padding)
            x2_pad = min(w, x2 + padding)
            y2_pad = min(h, y2 + padding)
            
            # Extract face region
            face_region = image[y1_pad:y2_pad, x1_pad:x2_pad]
            
            if face_region.size > 0:
                face_regions.append((face_region, (x1_pad, y1_pad, x2_pad, y2_pad)))
        
        return face_regions
    
    def visualize_detections(self, image: np.ndarray, save_path: Optional[str] = None) -> np.ndarray:
        """
        Visualize face detections on image
        
        Args:
            image: Input image in BGR format
            save_path: Optional path to save visualization
            
        Returns:
            Image with face detections drawn
        """
        faces = self.detect_faces(image)
        vis_image = image.copy()
        
        for x1, y1, x2, y2, confidence in faces:
            # Draw bounding box
            cv2.rectangle(vis_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Draw confidence score
            label = f'Face: {confidence:.2f}'
            cv2.putText(vis_image, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        if save_path:
            cv2.imwrite(save_path, vis_image)
            
        return vis_image
    
    def update_model(self, new_model_path: str):
        """
        Update YOLO model with new weights
        
        Args:
            new_model_path: Path to new model weights
        """
        if os.path.exists(new_model_path):
            self.model_path = new_model_path
            self._load_model()
            logger.info(f"Model updated: {new_model_path}")
        else:
            logger.error(f"Model file not found: {new_model_path}")
    
    def get_model_info(self) -> dict:
        """Get information about loaded model"""
        return {
            "model_path": self.model_path,
            "device": self.device,
            "confidence_threshold": self.confidence_threshold,
            "model_loaded": self.model is not None
        }

# Example usage and testing
if __name__ == "__main__":
    # Initialize detector
    detector = YOLOFaceDetector()
    
    # Test with webcam
    cap = cv2.VideoCapture(0)
    
    print("Press 'q' to quit, 's' to save screenshot")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Detect faces
        faces = detector.detect_faces(frame)
        print(f"Detected {len(faces)} faces")
        
        # Visualize
        vis_frame = detector.visualize_detections(frame)
        
        cv2.imshow('YOLO Face Detection', vis_frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            cv2.imwrite('yolo_detection.jpg', vis_frame)
            print("Screenshot saved!")
    
    cap.release()
    cv2.destroyAllWindows()
    
    # Print model info
    print(detector.get_model_info())