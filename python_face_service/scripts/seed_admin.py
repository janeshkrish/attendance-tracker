from models import UserModel
UserModel.ensure_default_admin()
print("Default admin ensured: admin/admin123")