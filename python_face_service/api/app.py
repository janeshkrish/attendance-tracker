from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes_recognition import router as recog_router
from api.routes_reports import router as reports_router
from models import UserModel
from config import ALLOWED_ORIGIN

app = FastAPI(title="Face Recognition Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def boot():
    UserModel.ensure_default_admin()

app.include_router(recog_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
