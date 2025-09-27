from fastapi import APIRouter
from models import AttendanceModel
from exporters import export_attendance

router = APIRouter()

@router.get("/attendance/recent")
def recent(limit: int = 100):
    rows = AttendanceModel.list_recent(limit)
    return {"records": rows}

@router.get("/attendance/export")
def export():
    rows = AttendanceModel.list_recent(2000)
    path = export_attendance(rows, "attendance_report")
    return {"path": path}
