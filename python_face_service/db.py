from pymongo import MongoClient, ASCENDING
from config import MONGO_URI, DB_NAME

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["users"]
students = db["students"]
attendance = db["attendance"]
audit_logs = db["audit_logs"]

users.create_index([("username", ASCENDING)], unique=True)
students.create_index([("student_id", ASCENDING)], unique=True)
attendance.create_index([("student_id", ASCENDING), ("date", ASCENDING)])
audit_logs.create_index([("ts", ASCENDING)])