import os
from dotenv import load_dotenv

load_dotenv()

# Database Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/attendance_system")
DB_NAME = os.getenv("DB_NAME", "attendance_system")

# Model Configuration
YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "weights/yolov8n-face.pt")
ARCFACE_MODEL_PATH = os.getenv("ARCFACE_MODEL_PATH", "weights/arcface_resnet50.pth")
LIVENESS_MODEL_PATH = os.getenv("LIVENESS_MODEL_PATH", "weights/liveness_cnn.pth")

# Recognition Thresholds
MIN_CONFIDENCE = float(os.getenv("FACE_RECOGNITION_THRESHOLD", "0.6"))
LIVENESS_THRESHOLD = float(os.getenv("LIVENESS_THRESHOLD", "0.7"))
DETECTION_CONFIDENCE = float(os.getenv("FACE_DETECTION_CONFIDENCE", "0.7"))

# API Configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("FACE_API_PORT", "8000"))
