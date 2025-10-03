"""
ArcFace Face Recognition Module with ResNet-50 Backbone
Implements state-of-the-art face recognition for attendance system
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict
import os
import pickle
import logging
from pathlib import Path
import insightface
from sklearn.metrics.pairwise import cosine_similarity

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ArcMarginProduct(nn.Module):
    """
    ArcFace: Additive Angular Margin Loss for Deep Face Recognition
    """
    def __init__(self, in_features, out_features, scale=64.0, margin=0.50, easy_margin=False, ls_eps=0.0):
        super(ArcMarginProduct, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.scale = scale
        self.margin = margin
        self.ls_eps = ls_eps  # label smoothing
        self.weight = nn.Parameter(torch.FloatTensor(out_features, in_features))
        nn.init.xavier_uniform_(self.weight)

        self.easy_margin = easy_margin
        self.cos_m = np.cos(margin)
        self.sin_m = np.sin(margin)
        self.th = np.cos(np.pi - margin)
        self.mm = np.sin(np.pi - margin) * margin

    def forward(self, input, label):
        # --------------------------- cos(theta) & phi(theta) ---------------------------
        cosine = F.linear(F.normalize(input), F.normalize(self.weight))
        sine = torch.sqrt(1.0 - torch.pow(cosine, 2))
        phi = cosine * self.cos_m - sine * self.sin_m
        if self.easy_margin:
            phi = torch.where(cosine > 0, phi, cosine)
        else:
            phi = torch.where(cosine > self.th, phi, cosine - self.mm)
        # --------------------------- convert label to one-hot ---------------------------
        one_hot = torch.zeros(cosine.size(), device='cuda')
        one_hot.scatter_(1, label.view(-1, 1).long(), 1)
        if self.ls_eps > 0:
            one_hot = (1 - self.ls_eps) * one_hot + self.ls_eps / self.out_features
        # -------------torch.where(out_i = {x_i if condition_i else y_i) -------------
        output = (one_hot * phi) + ((1.0 - one_hot) * cosine)
        output *= self.scale

        return output

class ResNet50ArcFace(nn.Module):
    """
    ResNet-50 backbone with ArcFace head for face recognition
    """
    def __init__(self, num_classes=512, embedding_size=512):
        super(ResNet50ArcFace, self).__init__()
        self.embedding_size = embedding_size
        
        # Load ResNet-50 backbone
        import torchvision.models as models
        resnet = models.resnet50(pretrained=True)
        
        # Remove the final classification layer
        self.backbone = nn.Sequential(*list(resnet.children())[:-1])
        
        # Add custom layers
        self.bn1 = nn.BatchNorm2d(2048)
        self.dropout = nn.Dropout(0.4)
        self.fc = nn.Linear(2048, embedding_size)
        self.bn2 = nn.BatchNorm1d(embedding_size)
        
        # ArcFace layer for training
        self.arc_margin = ArcMarginProduct(embedding_size, num_classes)
    
    def forward(self, x, labels=None):
        # Extract features using ResNet-50 backbone
        x = self.backbone(x)
        x = x.view(x.size(0), -1)
        
        x = self.bn1(x.unsqueeze(-1).unsqueeze(-1)).squeeze(-1).squeeze(-1)
        x = self.dropout(x)
        x = self.fc(x)
        embeddings = self.bn2(x)
        
        if labels is not None:
            # Training mode with ArcFace loss
            return self.arc_margin(embeddings, labels), embeddings
        else:
            # Inference mode - return normalized embeddings
            return F.normalize(embeddings)

class ArcFaceRecognizer:
    """
    ArcFace-based face recognition system
    """
    
    def __init__(self, model_path: Optional[str] = None, embedding_size: int = 512):
        """
        Initialize ArcFace recognizer
        
        Args:
            model_path: Path to trained model weights
            embedding_size: Size of face embeddings
        """
        self.embedding_size = embedding_size
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Initialize model
        self.model = None
        self.model_path = model_path
        
        # Face database for known identities
        self.known_embeddings = {}  # {person_id: [embeddings]}
        self.known_names = {}  # {person_id: name}
        
        # Load pre-trained InsightFace model as fallback
        self._load_insightface_model()
        
        if model_path and os.path.exists(model_path):
            self._load_custom_model()
    
    def _load_insightface_model(self):
        """Load pre-trained InsightFace model"""
        try:
            self.app = insightface.app.FaceAnalysis(providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("InsightFace model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading InsightFace model: {e}")
            self.app = None
    
    def _load_custom_model(self):
        """Load custom ResNet-50 ArcFace model"""
        try:
            self.model = ResNet50ArcFace(embedding_size=self.embedding_size)
            self.model.load_state_dict(torch.load(self.model_path, map_location=self.device))
            self.model.to(self.device)
            self.model.eval()
            logger.info("Custom ArcFace model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading custom model: {e}")
            self.model = None
    
    def _preprocess_face(self, face_image: np.ndarray) -> torch.Tensor:
        """
        Preprocess face image for model input
        
        Args:
            face_image: Face image in BGR format
            
        Returns:
            Preprocessed tensor
        """
        # Resize to 112x112 (standard for face recognition)
        face_resized = cv2.resize(face_image, (112, 112))
        
        # Convert BGR to RGB
        face_rgb = cv2.cvtColor(face_resized, cv2.COLOR_BGR2RGB)
        
        # Normalize
        face_normalized = (face_rgb - 127.5) / 128.0
        
        # Convert to tensor and add batch dimension
        face_tensor = torch.from_numpy(face_normalized.transpose(2, 0, 1)).float()
        face_tensor = face_tensor.unsqueeze(0).to(self.device)
        
        return face_tensor
    
    def extract_embedding(self, face_image: np.ndarray) -> np.ndarray:
        """
        Extract face embedding using ArcFace
        
        Args:
            face_image: Face image in BGR format
            
        Returns:
            Face embedding vector
        """
        try:
            if self.model is not None:
                # Use custom ResNet-50 ArcFace model
                face_tensor = self._preprocess_face(face_image)
                with torch.no_grad():
                    embedding = self.model(face_tensor)
                    embedding = embedding.cpu().numpy().flatten()
                return embedding
            
            elif self.app is not None:
                # Use InsightFace model
                faces = self.app.get(face_image)
                if faces:
                    embedding = faces[0].embedding
                    return embedding / np.linalg.norm(embedding)  # Normalize
                else:
                    return np.zeros(self.embedding_size)
            
            else:
                logger.error("No face recognition model available")
                return np.zeros(self.embedding_size)
                
        except Exception as e:
            logger.error(f"Error extracting embedding: {e}")
            return np.zeros(self.embedding_size)
    
    def add_person(self, person_id: str, name: str, face_images: List[np.ndarray]):
        """
        Add a person to the recognition database
        
        Args:
            person_id: Unique identifier for the person
            name: Person's name
            face_images: List of face images for the person
        """
        embeddings = []
        
        for face_image in face_images:
            embedding = self.extract_embedding(face_image)
            if np.any(embedding):  # Check if embedding is valid
                embeddings.append(embedding)
        
        if embeddings:
            self.known_embeddings[person_id] = embeddings
            self.known_names[person_id] = name
            logger.info(f"Added person {name} with {len(embeddings)} embeddings")
        else:
            logger.warning(f"No valid embeddings found for {name}")
    
    def recognize_face(self, face_image: np.ndarray, threshold: float = 0.6) -> Tuple[Optional[str], Optional[str], float]:
        """
        Recognize a face against the known database
        
        Args:
            face_image: Face image in BGR format
            threshold: Similarity threshold for recognition
            
        Returns:
            Tuple of (person_id, name, confidence) or (None, None, 0) if not recognized
        """
        # Extract embedding for the input face
        query_embedding = self.extract_embedding(face_image)
        
        if not np.any(query_embedding):
            return None, None, 0.0
        
        best_match = None
        best_similarity = 0.0
        
        # Compare against all known persons
        for person_id, embeddings in self.known_embeddings.items():
            # Calculate similarity with all embeddings of this person
            similarities = []
            for known_embedding in embeddings:
                similarity = cosine_similarity([query_embedding], [known_embedding])[0][0]
                similarities.append(similarity)
            
            # Use the maximum similarity
            max_similarity = max(similarities) if similarities else 0.0
            
            if max_similarity > best_similarity:
                best_similarity = max_similarity
                best_match = person_id
        
        # Check if similarity meets threshold
        if best_similarity >= threshold:
            return best_match, self.known_names.get(best_match), best_similarity
        else:
            return None, None, best_similarity
    
    def update_person_embeddings(self, person_id: str, new_face_images: List[np.ndarray]):
        """
        Update embeddings for an existing person
        
        Args:
            person_id: Person's ID
            new_face_images: New face images to add
        """
        if person_id not in self.known_embeddings:
            logger.warning(f"Person {person_id} not found in database")
            return
        
        new_embeddings = []
        for face_image in new_face_images:
            embedding = self.extract_embedding(face_image)
            if np.any(embedding):
                new_embeddings.append(embedding)
        
        # Add new embeddings to existing ones
        self.known_embeddings[person_id].extend(new_embeddings)
        logger.info(f"Added {len(new_embeddings)} new embeddings for person {person_id}")
    
    def remove_person(self, person_id: str):
        """Remove a person from the database"""
        if person_id in self.known_embeddings:
            del self.known_embeddings[person_id]
            del self.known_names[person_id]
            logger.info(f"Removed person {person_id}")
        else:
            logger.warning(f"Person {person_id} not found in database")
    
    def save_database(self, file_path: str):
        """Save the face database to file"""
        database = {
            'embeddings': self.known_embeddings,
            'names': self.known_names
        }
        with open(file_path, 'wb') as f:
            pickle.dump(database, f)
        logger.info(f"Database saved to {file_path}")
    
    def load_database(self, file_path: str):
        """Load face database from file"""
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                database = pickle.load(f)
            self.known_embeddings = database['embeddings']
            self.known_names = database['names']
            logger.info(f"Database loaded from {file_path}")
        else:
            logger.warning(f"Database file not found: {file_path}")
    
    def get_database_stats(self) -> Dict:
        """Get statistics about the face database"""
        stats = {
            'total_persons': len(self.known_embeddings),
            'total_embeddings': sum(len(embeddings) for embeddings in self.known_embeddings.values()),
            'persons': {}
        }
        
        for person_id, embeddings in self.known_embeddings.items():
            stats['persons'][person_id] = {
                'name': self.known_names.get(person_id),
                'embedding_count': len(embeddings)
            }
        
        return stats

# Example usage and testing
if __name__ == "__main__":
    # Initialize recognizer
    recognizer = ArcFaceRecognizer()
    
    # Test with webcam
    cap = cv2.VideoCapture(0)
    
    print("Press 'q' to quit, 'a' to add person, 'r' to recognize")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        cv2.imshow('ArcFace Recognition', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('a'):
            # Add person example
            person_id = input("Enter person ID: ")
            name = input("Enter name: ")
            print("Capturing face in 3 seconds...")
            cv2.waitKey(3000)
            ret, capture_frame = cap.read()
            if ret:
                recognizer.add_person(person_id, name, [capture_frame])
                print(f"Added {name}")
        elif key == ord('r'):
            # Recognize face
            person_id, name, confidence = recognizer.recognize_face(frame)
            if person_id:
                print(f"Recognized: {name} (ID: {person_id}, Confidence: {confidence:.3f})")
            else:
                print(f"Unknown person (Confidence: {confidence:.3f})")
    
    cap.release()
    cv2.destroyAllWindows()
    
    # Print database stats
    print(recognizer.get_database_stats())