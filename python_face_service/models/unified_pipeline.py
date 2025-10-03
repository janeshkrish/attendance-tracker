"""
Unified Face Recognition Pipeline
Integrates YOLO face detection, ArcFace recognition, and CNN liveness detection
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict, Any
import logging
import time
import json
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading

# Import custom modules
from .yolo_face_detector import YOLOFaceDetector
from .arcface_recognizer import ArcFaceRecognizer
from .liveness_cnn_detector import LivenessDetector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AttendanceRecognitionPipeline:
    """
    Unified pipeline for real-time face recognition attendance system
    Combines YOLO detection, ArcFace recognition, and liveness detection
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize the recognition pipeline
        
        Args:
            config: Configuration dictionary
        """
        # Default configuration
        self.config = {
            "face_detection": {
                "model_path": "models/yolov8n-face.pt",
                "confidence_threshold": 0.7,
                "max_faces_per_frame": 10
            },
            "face_recognition": {
                "model_path": "models/arcface_resnet50.pth",
                "embedding_size": 512,
                "similarity_threshold": 0.6,
                "database_path": "data/face_database.pkl"
            },
            "liveness_detection": {
                "model_path": "models/liveness_cnn.pth",
                "input_size": (64, 64),
                "confidence_threshold": 0.7,
                "sequence_length": 5
            },
            "pipeline": {
                "processing_fps": 5,  # Process every N frames
                "min_face_size": 50,
                "max_processing_time": 2.0,  # seconds
                "enable_async": True
            }
        }
        
        # Update with provided config
        if config:
            self._update_config(config)
        
        # Initialize components
        self.face_detector = None
        self.face_recognizer = None
        self.liveness_detector = None
        
        # State management
        self.frame_count = 0
        self.last_recognition_time = {}  # {person_id: timestamp}
        self.recognition_cooldown = 3.0  # seconds between recognitions
        
        # Thread pool for async processing
        self.executor = ThreadPoolExecutor(max_workers=3)
        
        # Frame buffer for sequence processing
        self.frame_buffer = []
        self.face_sequence_buffer = {}  # {face_track_id: [face_images]}
        
        # Statistics
        self.stats = {
            "total_frames": 0,
            "faces_detected": 0,
            "faces_recognized": 0,
            "live_faces": 0,
            "spoofed_faces": 0,
            "processing_times": []
        }
        
        # Initialize pipeline
        self._initialize_pipeline()
    
    def _update_config(self, new_config: Dict):
        """Update configuration recursively"""
        def update_dict(d: Dict, u: Dict):
            for k, v in u.items():
                if isinstance(v, dict):
                    d[k] = update_dict(d.get(k, {}), v)
                else:
                    d[k] = v
            return d
        
        self.config = update_dict(self.config, new_config)
    
    def _initialize_pipeline(self):
        """Initialize all pipeline components"""
        try:
            # Initialize face detector
            logger.info("Initializing YOLO face detector...")
            self.face_detector = YOLOFaceDetector(
                model_path=self.config["face_detection"]["model_path"],
                confidence_threshold=self.config["face_detection"]["confidence_threshold"]
            )
            
            # Initialize face recognizer
            logger.info("Initializing ArcFace recognizer...")
            self.face_recognizer = ArcFaceRecognizer(
                model_path=self.config["face_recognition"]["model_path"],
                embedding_size=self.config["face_recognition"]["embedding_size"]
            )
            
            # Load face database
            db_path = self.config["face_recognition"]["database_path"]
            if Path(db_path).exists():
                self.face_recognizer.load_database(db_path)
            
            # Initialize liveness detector
            logger.info("Initializing liveness detector...")
            self.liveness_detector = LivenessDetector(
                model_path=self.config["liveness_detection"]["model_path"],
                input_size=self.config["liveness_detection"]["input_size"]
            )
            
            logger.info("Pipeline initialization complete!")
            
        except Exception as e:
            logger.error(f"Error initializing pipeline: {e}")
            raise
    
    def process_frame(self, frame: np.ndarray, timestamp: Optional[float] = None) -> Dict[str, Any]:
        """
        Process a single frame for attendance recognition
        
        Args:
            frame: Input frame in BGR format
            timestamp: Frame timestamp
            
        Returns:
            Dictionary containing detection results
        """
        if timestamp is None:
            timestamp = time.time()
        
        start_time = time.time()
        self.frame_count += 1
        self.stats["total_frames"] += 1
        
        # Skip frames based on processing FPS
        if self.frame_count % (30 // self.config["pipeline"]["processing_fps"]) != 0:
            return {"status": "skipped", "timestamp": timestamp}
        
        result = {
            "status": "processed",
            "timestamp": timestamp,
            "faces": [],
            "processing_time": 0.0
        }
        
        try:
            # Step 1: Face Detection with YOLO
            faces = self.face_detector.detect_faces(frame)
            self.stats["faces_detected"] += len(faces)
            
            if not faces:
                result["processing_time"] = time.time() - start_time
                return result
            
            # Filter faces by minimum size
            min_size = self.config["pipeline"]["min_face_size"]
            valid_faces = []
            
            for x1, y1, x2, y2, conf in faces:
                w, h = x2 - x1, y2 - y1
                if w >= min_size and h >= min_size:
                    valid_faces.append((x1, y1, x2, y2, conf))
            
            # Limit number of faces to process
            max_faces = self.config["face_detection"]["max_faces_per_frame"]
            if len(valid_faces) > max_faces:
                valid_faces = sorted(valid_faces, key=lambda x: x[4], reverse=True)[:max_faces]
            
            # Process each detected face
            for face_idx, (x1, y1, x2, y2, det_conf) in enumerate(valid_faces):
                face_result = self._process_single_face(
                    frame, (x1, y1, x2, y2), det_conf, timestamp, face_idx
                )
                result["faces"].append(face_result)
            
            result["processing_time"] = time.time() - start_time
            self.stats["processing_times"].append(result["processing_time"])
            
            # Maintain buffer for sequence processing
            self.frame_buffer.append((frame.copy(), timestamp))
            if len(self.frame_buffer) > self.config["liveness_detection"]["sequence_length"]:
                self.frame_buffer.pop(0)
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing frame: {e}")
            result["status"] = "error"
            result["error"] = str(e)
            return result
    
    def _process_single_face(self, frame: np.ndarray, bbox: Tuple[int, int, int, int], 
                           det_conf: float, timestamp: float, face_idx: int) -> Dict[str, Any]:
        """
        Process a single detected face
        
        Args:
            frame: Input frame
            bbox: Face bounding box (x1, y1, x2, y2)
            det_conf: Detection confidence
            timestamp: Frame timestamp
            face_idx: Face index in current frame
            
        Returns:
            Face processing results
        """
        x1, y1, x2, y2 = bbox
        face_result = {
            "bbox": bbox,
            "detection_confidence": det_conf,
            "recognition": None,
            "liveness": None,
            "attendance_marked": False
        }
        
        try:
            # Extract face region
            face_region = frame[y1:y2, x1:x2]
            
            if face_region.size == 0:
                return face_result
            
            # Step 2: Liveness Detection
            is_live, liveness_conf = self.liveness_detector.detect_liveness(
                face_region, 
                confidence_threshold=self.config["liveness_detection"]["confidence_threshold"]
            )
            
            face_result["liveness"] = {
                "is_live": is_live,
                "confidence": liveness_conf
            }
            
            if is_live:
                self.stats["live_faces"] += 1
            else:
                self.stats["spoofed_faces"] += 1
                return face_result  # Skip recognition for spoofed faces
            
            # Step 3: Face Recognition with ArcFace
            person_id, name, recognition_conf = self.face_recognizer.recognize_face(
                face_region,
                threshold=self.config["face_recognition"]["similarity_threshold"]
            )
            
            face_result["recognition"] = {
                "person_id": person_id,
                "name": name,
                "confidence": recognition_conf
            }
            
            # Step 4: Attendance Logic
            if person_id and self._should_mark_attendance(person_id, timestamp):
                face_result["attendance_marked"] = True
                self.last_recognition_time[person_id] = timestamp
                self.stats["faces_recognized"] += 1
                
                logger.info(f"Attendance marked for {name} (ID: {person_id}) "
                           f"at {timestamp:.2f}")
            
            return face_result
            
        except Exception as e:
            logger.error(f"Error processing face {face_idx}: {e}")
            face_result["error"] = str(e)
            return face_result
    
    def _should_mark_attendance(self, person_id: str, current_time: float) -> bool:
        """
        Check if attendance should be marked for a person
        
        Args:
            person_id: Person's ID
            current_time: Current timestamp
            
        Returns:
            True if attendance should be marked
        """
        last_time = self.last_recognition_time.get(person_id, 0)
        return (current_time - last_time) >= self.recognition_cooldown
    
    def process_video_stream(self, video_source: Any = 0, save_results: bool = False) -> None:
        """
        Process real-time video stream
        
        Args:
            video_source: Video source (camera index, video file, etc.)
            save_results: Whether to save processing results
        """
        cap = cv2.VideoCapture(video_source)
        results_log = []
        
        try:
            logger.info("Starting video stream processing...")
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process frame
                result = self.process_frame(frame, time.time())
                
                if save_results and result["status"] == "processed":
                    results_log.append(result)
                
                # Visualize results
                vis_frame = self.visualize_results(frame, result)
                cv2.imshow('Attendance Recognition', vis_frame)
                
                # Display statistics
                self._display_stats()
                
                # Handle keyboard input
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    # Save current frame
                    cv2.imwrite(f'capture_{int(time.time())}.jpg', vis_frame)
                    logger.info("Frame saved!")
                elif key == ord('r'):
                    # Reset statistics
                    self.reset_stats()
                    logger.info("Statistics reset!")
        
        except KeyboardInterrupt:
            logger.info("Processing interrupted by user")
        
        finally:
            cap.release()
            cv2.destroyAllWindows()
            
            if save_results and results_log:
                self._save_results_log(results_log)
    
    def visualize_results(self, frame: np.ndarray, result: Dict[str, Any]) -> np.ndarray:
        """
        Visualize processing results on frame
        
        Args:
            frame: Input frame
            result: Processing results
            
        Returns:
            Frame with visualizations
        """
        vis_frame = frame.copy()
        
        if result.get("faces"):
            for face in result["faces"]:
                x1, y1, x2, y2 = face["bbox"]
                
                # Determine box color based on liveness and recognition
                color = (0, 0, 255)  # Red (default)
                
                liveness = face.get("liveness")
                recognition = face.get("recognition")
                
                if liveness and liveness["is_live"]:
                    if recognition and recognition["person_id"]:
                        if face.get("attendance_marked"):
                            color = (0, 255, 0)  # Green (attendance marked)
                        else:
                            color = (0, 255, 255)  # Yellow (recognized)
                    else:
                        color = (255, 0, 0)  # Blue (live but unknown)
                
                # Draw bounding box
                cv2.rectangle(vis_frame, (x1, y1), (x2, y2), color, 2)
                
                # Prepare label
                labels = []
                
                if liveness:
                    live_status = "LIVE" if liveness["is_live"] else "SPOOF"
                    labels.append(f"{live_status}:{liveness['confidence']:.2f}")
                
                if recognition and recognition["person_id"]:
                    labels.append(f"{recognition['name']}")
                    labels.append(f"Conf:{recognition['confidence']:.2f}")
                
                if face.get("attendance_marked"):
                    labels.append("ATTENDANCE MARKED")
                
                # Draw labels
                y_offset = y1 - 10
                for label in labels:
                    cv2.putText(vis_frame, label, (x1, y_offset), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                    y_offset -= 20
        
        # Add pipeline statistics
        stats_text = [
            f"Frames: {self.stats['total_frames']}",
            f"Faces: {self.stats['faces_detected']}",
            f"Recognized: {self.stats['faces_recognized']}",
            f"Live: {self.stats['live_faces']}",
            f"Spoof: {self.stats['spoofed_faces']}"
        ]
        
        for i, text in enumerate(stats_text):
            cv2.putText(vis_frame, text, (10, 30 + i * 25), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        return vis_frame
    
    def add_person_to_database(self, person_id: str, name: str, face_images: List[np.ndarray]):
        """
        Add a person to the recognition database
        
        Args:
            person_id: Unique person identifier
            name: Person's name
            face_images: List of face images
        """
        self.face_recognizer.add_person(person_id, name, face_images)
        
        # Save updated database
        db_path = self.config["face_recognition"]["database_path"]
        self.face_recognizer.save_database(db_path)
        
        logger.info(f"Added {name} to database with {len(face_images)} images")
    
    def remove_person_from_database(self, person_id: str):
        """Remove a person from the database"""
        self.face_recognizer.remove_person(person_id)
        
        # Save updated database
        db_path = self.config["face_recognition"]["database_path"]
        self.face_recognizer.save_database(db_path)
        
        logger.info(f"Removed person {person_id} from database")
    
    def get_attendance_log(self) -> List[Dict]:
        """Get attendance log from recognition history"""
        attendance_log = []
        
        for person_id, timestamp in self.last_recognition_time.items():
            name = self.face_recognizer.known_names.get(person_id, "Unknown")
            attendance_log.append({
                "person_id": person_id,
                "name": name,
                "timestamp": timestamp,
                "datetime": time.ctime(timestamp)
            })
        
        return sorted(attendance_log, key=lambda x: x["timestamp"])
    
    def reset_stats(self):
        """Reset pipeline statistics"""
        self.stats = {
            "total_frames": 0,
            "faces_detected": 0,
            "faces_recognized": 0,
            "live_faces": 0,
            "spoofed_faces": 0,
            "processing_times": []
        }
        self.last_recognition_time.clear()
        logger.info("Statistics reset complete")
    
    def _display_stats(self):
        """Display current statistics"""
        if self.stats["total_frames"] % 30 == 0:  # Display every 30 frames
            avg_processing_time = np.mean(self.stats["processing_times"][-10:]) if self.stats["processing_times"] else 0
            
            logger.info(f"Stats - Frames: {self.stats['total_frames']}, "
                       f"Faces: {self.stats['faces_detected']}, "
                       f"Recognized: {self.stats['faces_recognized']}, "
                       f"Avg Time: {avg_processing_time:.3f}s")
    
    def _save_results_log(self, results_log: List[Dict]):
        """Save processing results to file"""
        timestamp = int(time.time())
        filename = f"attendance_log_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(results_log, f, indent=2, default=str)
        
        logger.info(f"Results saved to {filename}")
    
    def get_pipeline_info(self) -> Dict[str, Any]:
        """Get comprehensive pipeline information"""
        return {
            "config": self.config,
            "statistics": self.stats,
            "database_info": self.face_recognizer.get_database_stats() if self.face_recognizer else {},
            "model_info": {
                "face_detector": self.face_detector.get_model_info() if self.face_detector else {},
                "liveness_detector": self.liveness_detector.get_model_info() if self.liveness_detector else {}
            },
            "attendance_log": self.get_attendance_log()
        }

# Example usage
if __name__ == "__main__":
    # Configuration
    config = {
        "face_detection": {
            "confidence_threshold": 0.7
        },
        "face_recognition": {
            "similarity_threshold": 0.6
        },
        "liveness_detection": {
            "confidence_threshold": 0.7
        }
    }
    
    # Initialize pipeline
    pipeline = AttendanceRecognitionPipeline(config)
    
    # Process video stream
    print("Starting attendance recognition system...")
    print("Press 'q' to quit, 's' to save frame, 'r' to reset stats")
    
    pipeline.process_video_stream(video_source=0, save_results=True)