from models import AttendanceModel
from exporters import export_attendance

rows = AttendanceModel.list_recent(5000)
path = export_attendance(rows, "attendance_export")
print("Exported:", path)