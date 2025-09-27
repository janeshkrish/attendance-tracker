Python Face Recognition Service (MongoDB)

cd python_face_service

cp .env.example .env

pip install -r requirements.txt

uvicorn api.app:app --host 0.0.0.0 --port 8001

Endpoints:

POST /api/recognize { imageData: dataUrlBase64 }

POST /api/register-capture { studentCode, name, imageData }

POST /api/reload

GET /api/attendance/recent

GET /api/attendance/export