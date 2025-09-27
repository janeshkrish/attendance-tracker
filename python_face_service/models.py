import datetime
from bson import ObjectId
import bcrypt
from db import users, students, attendance, audit_logs

def oid_str(x):
    return str(x) if isinstance(x, ObjectId) else x

class UserModel:
    @staticmethod
    def create(username, password, role="admin"):
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
        return users.insert_one({
            "username": username,
            "password": hashed,
            "role": role,
            "created_at": datetime.datetime.utcnow()
        }).inserted_id

    @staticmethod
    def ensure_default_admin():
        if users.count_documents({"role": "admin"}) == 0:
            UserModel.create("admin", "admin123", "admin")

    @staticmethod
    def authenticate(username, password):
        u = users.find_one({"username": username})
        if u and bcrypt.checkpw(password.encode(), u["password"]):
            return u
        return None

class StudentModel:
    @staticmethod
    def by_id(obj_id):
        return students.find_one({"_id": ObjectId(obj_id)})

    @staticmethod
    def by_student_code(code):
        return students.find_one({"student_id": code})

    @staticmethod
    def register(student_code, name):
        return students.insert_one({
            "student_id": student_code,
            "name": name,
            "face_encodings": [],
            "created_at": datetime.datetime.utcnow(),
            "active": True
        }).inserted_id

    @staticmethod
    def add_encoding(student_obj_id, encoding: list, image_path: str):
        students.update_one(
            {"_id": ObjectId(student_obj_id)},
            {"$push": {"face_encodings": {
                "encoding": list(map(float, encoding)),
                "image_path": image_path,
                "captured_at": datetime.datetime.utcnow()
            }}}
        )

    @staticmethod
    def active_with_encodings():
        return list(students.find({"active": True, "face_encodings.0": {"$exists": True}}))

class AttendanceModel:
    @staticmethod
    def mark(student_obj_id: str, confidence: float, status="present", meta=None):
        now = datetime.datetime.utcnow()
        date_str = now.strftime("%Y-%m-%d")
        attendance.insert_one({
            "student_id": student_obj_id,
            "status": status,
            "confidence": float(confidence),
            "timestamp": now,
            "date": date_str,
            "meta": meta or {}
        })

    @staticmethod
    def list_recent(limit=200):
        return list(attendance.find({}).sort("timestamp", -1).limit(limit))

class Audit:
    @staticmethod
    def log(action, actor=None, details=None):
        audit_logs.insert_one({
            "action": action,
            "actor": actor,
            "details": details or {},
            "ts": datetime.datetime.utcnow()
        })