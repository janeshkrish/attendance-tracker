import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "attendance_system")
FACE_COMPARE_TOLERANCE = float(os.getenv("FACE_COMPARE_TOLERANCE", "0.5"))
MIN_CONFIDENCE = float(os.getenv("MIN_CONFIDENCE", "0.55"))
EXPORT_DIR = os.getenv("EXPORT_DIR", "exports")
CAPTURE_DIR = os.getenv("CAPTURE_DIR", "captures")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8001"))
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "http://localhost:5173")