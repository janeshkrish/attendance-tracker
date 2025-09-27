import base64
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from models import StudentModel, AttendanceModel, Audit
from recognition.pipeline import Recognizer

router = APIRouter()
recognizer = Recognizer()

def b64_to_bgr(data_uri: str):
    if data_uri.startswith("data:image"):
        data_uri = data_uri.split(",", 1)[1]
    arr = np.frombuffer(base64.b64decode(data_uri), np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img

@router.post("/recognize")
def recognize(payload: dict):
    imageData = payload.get("imageData")
    if not imageData:
        raise HTTPException(400, "imageData required")
    frame_bgr = b64_to_bgr(imageData)
    results = recognizer.recognize_b64(frame_bgr)
    out = []
    for sid, conf, (top, right, bottom, left) in results:
        AttendanceModel.mark(sid, conf, "present", {"source": "webcam"})
        stu = StudentModel.by_id(sid)
        out.append({
            "studentId": sid,
            "name": stu.get("name") if stu else "",
            "studentIdNumber": stu.get("student_id") if stu else "",
            "confidence": conf
        })
    Audit.log("recognize", details={"count": len(out)})
    return {"results": out}

@router.post("/register-capture")
def register_capture(payload: dict):
    studentCode = payload.get("studentCode")
    name = payload.get("name")
    imageData = payload.get("imageData")
    if not (studentCode and name and imageData):
        raise HTTPException(400, "studentCode, name, imageData required")
    frame_bgr = b64_to_bgr(imageData)
    stu = StudentModel.by_student_code(studentCode)
    if not stu:
        sid = StudentModel.register(studentCode, name)
    else:
        sid = stu["_id"]
    enc = recognizer.add_encoding_for_student(str(sid), frame_bgr)
    StudentModel.add_encoding(str(sid), enc, image_path="")
    return {"message": "registered", "studentId": str(sid)}

@router.post("/reload")
def reload_encodings():
    recognizer.reload()
    return {"message": "ok"}
