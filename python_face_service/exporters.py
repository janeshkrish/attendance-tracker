import os
from openpyxl import Workbook
from config import EXPORT_DIR

def export_attendance(records, filename_prefix="attendance_report"):
    os.makedirs(EXPORT_DIR, exist_ok=True)
    wb = Workbook()
    ws = wb.active
    ws.title = "Attendance"
    ws.append(["StudentObjectId", "Status", "Confidence", "Timestamp", "Date"])
    for r in records:
        ws.append([
            str(r.get("student_id", "")),
            r.get("status", ""),
            float(r.get("confidence", 0.0)),
            str(r.get("timestamp", "")),
            r.get("date", "")
        ])
    path = os.path.join(EXPORT_DIR, f"{filename_prefix}.xlsx")
    wb.save(path)
    return path
