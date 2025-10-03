"""
Enhanced FastAPI Service for Face Recognition
Integrates YOLO, ArcFace, and Liveness Detection with existing Node.js backend
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import cv2
import numpy as np
import io
import base64
from PIL import Image
import asyncio
import logging
from typing import List, Dict, Any, Optional
import os
from datetime import datetime
import json
from pydantic import BaseModel

# Import our custom modules
from models.unified_pipeline import AttendanceRecognitionPipeline
from models.yolo_face_detector import YOLOFaceDetector
from models.arcface_recognizer import ArcFaceRecognizer
from models.liveness_cnn_detector import LivenessDetector

# Import database models
from ..models import StudentModel
from db import get_database
from config import *

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Smart Attendance Face Recognition API",
    description="Enhanced face recognition service with YOLO, ArcFace, and Liveness Detection",
    version="2.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global pipeline instance
recognition_pipeline: AttendanceRecognitionPipeline = None

# Pydantic models for API requests/responses
class FaceRecognitionRequest(BaseModel):
    image_base64: str
    session_id: Optional[str] = None
    course_id: Optional[str] = None

class FaceRegistrationRequest(BaseModel):
    student_id: str
    images_base64: List[str]

class AttendanceResponse(BaseModel):
    success: bool
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    confidence: float
    is_live: bool
    liveness_confidence: float
    attendance_marked: bool
    timestamp: str
    bbox: Optional[List[int]] = None

class StudentRegistrationResponse(BaseModel):
    success: bool
    message: str
    encodings_count: int

class LivenessCheckRequest(BaseModel):
    image_base64: str

class LivenessCheckResponse(BaseModel):
    is_live: bool
    confidence: float
    analysis: Dict[str, Any]

def decode_base64_image(base64_string: str) -> np.ndarray:
    """
    Decode base64 image to OpenCV format
    
    Args:
        base64_string: Base64 encoded image
        
    Returns:
        Image in BGR format
    """
    try:
        # Remove data URL prefix if present
        if "data:image" in base64_string:
            base64_string = base64_string.split(",")[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to OpenCV format (BGR)
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        return image_cv
    
    except Exception as e:
        logger.error(f"Error decoding base64 image: {e}")
        raise HTTPException(status_code=400, detail="Invalid image format")

def encode_image_to_base64(image: np.ndarray) -> str:
    """
    Encode OpenCV image to base64
    
    Args:
        image: Image in BGR format
        
    Returns:
        Base64 encoded image
    """
    _, buffer = cv2.imencode('.jpg', image)
    img_str = base64.b64encode(buffer).decode()
    return f"data:image/jpeg;base64,{img_str}"

@app.on_event("startup")
async def startup_event():
    """Initialize the face recognition pipeline on startup"""
    global recognition_pipeline
    
    try:
        logger.info("Initializing Face Recognition Pipeline...")
        
        # Configuration for the pipeline
        config = {
            "face_detection": {
                "model_path": os.getenv("YOLO_MODEL_PATH", "models/yolov8n-face.pt"),
                "confidence_threshold": float(os.getenv("FACE_DETECTION_CONFIDENCE", "0.7"))
            },
            "face_recognition": {
                "model_path": os.getenv("ARCFACE_MODEL_PATH", "models/arcface_resnet50.pth"),
                "similarity_threshold": float(os.getenv("FACE_RECOGNITION_THRESHOLD", "0.6")),
                "database_path": os.getenv("FACE_DATABASE_PATH", "data/face_database.pkl")
            },
            "liveness_detection": {
                "model_path": os.getenv("LIVENESS_MODEL_PATH", "models/liveness_cnn.pth"),
                "confidence_threshold": float(os.getenv("LIVENESS_THRESHOLD", "0.7"))
            }
        }
        
        recognition_pipeline = AttendanceRecognitionPipeline(config)
        
        # Load existing student encodings from database
        await load_student_encodings()
        
        logger.info("Face Recognition Pipeline initialized successfully!")
        
    except Exception as e:
        logger.error(f"Failed to initialize pipeline: {e}")
        raise

async def load_student_encodings():
    """Load existing student face encodings from MongoDB"""
    try:
        students = await StudentModel.find_with_encodings()
        
        for student in students:
            student_id = str(student["_id"])
            name = student.get("name", "Unknown")
            
            # Convert stored encodings to face images (if available)
            # In production, you might store face images separately
            face_encodings = student.get("faceEncodings", [])
            
            if face_encodings and recognition_pipeline:
                # Add to pipeline database
                # Note: This is simplified - in production, you'd need actual face images
                recognition_pipeline.face_recognizer.known_embeddings[student_id] = [
                    np.array(enc["encoding"]) for enc in face_encodings
                ]
                recognition_pipeline.face_recognizer.known_names[student_id] = name
        
        logger.info(f"Loaded encodings for {len(students)} students")
        
    except Exception as e:
        logger.error(f"Error loading student encodings: {e}")

@app.post("/api/face/detect", response_model=Dict[str, Any])
async def detect_faces(request: FaceRecognitionRequest):
    """
    Detect faces in image using YOLO
    
    Args:
        request: Face detection request
        
    Returns:
        Detection results
    """
    try:
        if not recognition_pipeline:
            raise HTTPException(status_code=503, detail="Pipeline not initialized")
        
        # Decode image
        image = decode_base64_image(request.image_base64)
        
        # Detect faces
        faces = recognition_pipeline.face_detector.detect_faces(image)
        
        return {
            "success": True,
            "faces_detected": len(faces),
            "faces": [
                {
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    "confidence": float(conf)
                }
                for x1, y1, x2, y2, conf in faces
            ],
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Face detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/face/liveness", response_model=LivenessCheckResponse)
async def check_liveness(request: LivenessCheckRequest):
    """
    Check if face is live (anti-spoofing)
    
    Args:
        request: Liveness check request
        
    Returns:
        Liveness detection results
    """
    try:
        if not recognition_pipeline:
            raise HTTPException(status_code=503, detail="Pipeline not initialized")
        
        # Decode image
        image = decode_base64_image(request.image_base64)
        
        # Check liveness
        is_live, confidence = recognition_pipeline.liveness_detector.detect_liveness(image)
        
        # Additional texture analysis
        texture_score = recognition_pipeline.liveness_detector._texture_analysis(image)
        
        return LivenessCheckResponse(
            is_live=is_live,
            confidence=float(confidence),
            analysis={
                "texture_score": float(texture_score),
                "method": "CNN + Texture Analysis",
                "timestamp": datetime.now().isoformat()
            }
        )
    
    except Exception as e:
        logger.error(f"Liveness detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/face/recognize", response_model=AttendanceResponse)
async def recognize_face(request: FaceRecognitionRequest, background_tasks: BackgroundTasks):
    """
    Recognize face and mark attendance
    
    Args:
        request: Face recognition request
        background_tasks: Background tasks for async processing
        
    Returns:
        Recognition and attendance results
    """
    try:
        if not recognition_pipeline:
            raise HTTPException(status_code=503, detail="Pipeline not initialized")
        
        # Decode image
        image = decode_base64_image(request.image_base64)
        
        # Process frame through complete pipeline
        result = recognition_pipeline.process_frame(image, datetime.now().timestamp())
        
        if result["status"] != "processed" or not result.get("faces"):
            return AttendanceResponse(
                success=False,
                confidence=0.0,
                is_live=False,
                liveness_confidence=0.0,
                attendance_marked=False,
                timestamp=datetime.now().isoformat()
            )
        
        # Get best face result
        best_face = max(result["faces"], key=lambda f: f.get("detection_confidence", 0))
        
        # Extract results
        recognition = best_face.get("recognition", {})
        liveness = best_face.get("liveness", {})
        attendance_marked = best_face.get("attendance_marked", False)
        
        # If attendance was marked, update database in background
        if attendance_marked and recognition.get("person_id"):
            background_tasks.add_task(
                update_attendance_record,
                recognition["person_id"],
                request.session_id,
                request.course_id,
                recognition["confidence"]
            )
        
        return AttendanceResponse(
            success=bool(recognition.get("person_id")),
            student_id=recognition.get("person_id"),
            student_name=recognition.get("name"),
            confidence=float(recognition.get("confidence", 0)),
            is_live=liveness.get("is_live", False),
            liveness_confidence=float(liveness.get("confidence", 0)),
            attendance_marked=attendance_marked,
            timestamp=datetime.now().isoformat(),
            bbox=list(best_face["bbox"]) if "bbox" in best_face else None
        )
    
    except Exception as e:
        logger.error(f"Face recognition error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/face/register", response_model=StudentRegistrationResponse)
async def register_student_faces(request: FaceRegistrationRequest):
    """
    Register student faces for recognition
    
    Args:
        request: Student registration request
        
    Returns:
        Registration results
    """
    try:
        if not recognition_pipeline:
            raise HTTPException(status_code=503, detail="Pipeline not initialized")
        
        # Get student from database
        student = await StudentModel.find_by_id(request.student_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Decode images
        face_images = []
        for img_b64 in request.images_base64:
            image = decode_base64_image(img_b64)
            face_images.append(image)
        
        # Add to recognition pipeline
        student_name = student.get("name", "Unknown")
        recognition_pipeline.add_person_to_database(
            request.student_id,
            student_name,
            face_images
        )
        
        # Update database with new encodings
        encodings = []
        for face_image in face_images:
            embedding = recognition_pipeline.face_recognizer.extract_embedding(face_image)
            if np.any(embedding):
                encodings.append({
                    "encoding": embedding.tolist(),
                    "capturedAt": datetime.now(),
                    "imageUrl": ""  # Could store image URL here
                })
        
        # Update student record in MongoDB
        await StudentModel.update_face_encodings(request.student_id, encodings)
        
        return StudentRegistrationResponse(
            success=True,
            message=f"Successfully registered {len(encodings)} face encodings for {student_name}",
            encodings_count=len(encodings)
        )
    
    except Exception as e:
        logger.error(f"Student registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/face/retrain")
async def retrain_pipeline():
    """
    Retrain/reload the face recognition pipeline
    """
    try:
        if not recognition_pipeline:
            raise HTTPException(status_code=503, detail="Pipeline not initialized")
        
        # Reload student encodings
        await load_student_encodings()
        
        # Reload face recognition database
        db_path = recognition_pipeline.config["face_recognition"]["database_path"]
        if os.path.exists(db_path):
            recognition_pipeline.face_recognizer.load_database(db_path)
        
        return {"success": True, "message": "Pipeline reloaded successfully"}
    
    except Exception as e:
        logger.error(f"Pipeline retrain error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/face/statistics")
async def get_statistics():
    """
    Get face recognition pipeline statistics
    
    Returns:
        Comprehensive pipeline statistics
    """
    try:
        if not recognition_pipeline:
            raise HTTPException(status_code=503, detail="Pipeline not initialized")
        
        pipeline_info = recognition_pipeline.get_pipeline_info()
        
        return {
            "success": True,
            "statistics": pipeline_info["statistics"],
            "database_stats": pipeline_info["database_info"],
            "model_info": pipeline_info["model_info"],
            "attendance_log": pipeline_info["attendance_log"][-50:],  # Last 50 entries
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/face/student/{student_id}")
async def remove_student_faces(student_id: str):
    """
    Remove student from face recognition database
    
    Args:
        student_id: Student ID to remove
        
    Returns:
        Removal confirmation
    """
    try:
        if not recognition_pipeline:
            raise HTTPException(status_code=503, detail="Pipeline not initialized")
        
        # Remove from pipeline
        recognition_pipeline.remove_person_from_database(student_id)
        
        # Update database
        await StudentModel.clear_face_encodings(student_id)
        
        return {
            "success": True,
            "message": f"Student {student_id} removed from face recognition database"
        }
    
    except Exception as e:
        logger.error(f"Student removal error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def update_attendance_record(student_id: str, session_id: Optional[str], 
                                 course_id: Optional[str], confidence: float):
    """
    Update attendance record in database (background task)
    
    Args:
        student_id: Student ID
        session_id: Attendance session ID
        course_id: Course ID
        confidence: Recognition confidence
    """
    try:
        # This would integrate with your existing Node.js backend
        # For now, we'll log the attendance
        logger.info(f"Attendance marked: Student {student_id}, "
                   f"Session {session_id}, Course {course_id}, "
                   f"Confidence {confidence:.3f}")
        
        # In production, you would:
        # 1. Call your Node.js API to mark attendance
        # 2. Or directly update MongoDB attendance collection
        # 3. Send notifications, update reports, etc.
        
    except Exception as e:
        logger.error(f"Error updating attendance record: {e}")

@app.get("/api/face/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "pipeline_ready": recognition_pipeline is not None,
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "timestamp": datetime.now().isoformat()
        }
    )

if __name__ == "__main__":
    # Run the FastAPI server
    uvicorn.run(
        "enhanced_face_api:app",
        host="0.0.0.0",
        port=int(os.getenv("FACE_API_PORT", "8000")),
        reload=True,
        log_level="info"
    )