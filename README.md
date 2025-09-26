# SmartAttendance Pro - AI-Powered Face Recognition Attendance System

A comprehensive, production-ready attendance management system with real-time face recognition capabilities, built with React.js frontend and Node.js/MongoDB backend.

## 🚀 Features

### Core Functionality
- **Multi-Role Authentication**: Separate login portals for Admin, Faculty, and Students
- **Real-time Face Recognition**: AI-powered attendance tracking using webcam
- **Student Management**: Complete student registration with face data capture
- **Course Management**: Create and manage courses with scheduling
- **Live Attendance Sessions**: Real-time attendance monitoring with face detection
- **Comprehensive Reporting**: Generate detailed attendance reports with Excel export
- **Audit Logging**: Complete system activity tracking for security

### Technical Features
- **Modern UI/UX**: Glassmorphism design with smooth animations
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Real-time Updates**: Live attendance tracking and notifications
- **Secure Authentication**: JWT-based auth with role-based access control
- **File Upload**: Face image capture and storage system
- **Data Export**: Excel report generation for attendance data
- **API Documentation**: RESTful API with comprehensive endpoints

## 🛠️ Technology Stack

### Frontend
- **React.js** - Modern JavaScript framework
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Vite** - Fast build tool and dev server

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **Multer** - File upload handling
- **ExcelJS** - Excel file generation

### Security & Middleware
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API request limiting
- **bcryptjs** - Password hashing
- **Morgan** - HTTP request logging

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **MongoDB Compass** (recommended for database management)
- **Modern web browser** with camera access
- **Git** for version control

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd smartattendance-pro
```

### 2. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies (if separate)
cd client && npm install && cd ..
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/attendance_system
DB_NAME=attendance_system

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads/
```

### 4. Database Setup

#### Using MongoDB Compass:
1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Create a new database named `attendance_system`
4. The application will automatically create collections on first run

#### Using MongoDB CLI:
```bash
mongosh
use attendance_system
```

### 5. Create Upload Directories
```bash
mkdir -p uploads/students
```

### 6. Start the Application

#### Development Mode (Full Stack):
```bash
npm run dev:full
```

#### Separate Servers:
```bash
# Terminal 1 - Backend Server
npm run dev:server

# Terminal 2 - Frontend Development Server
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health

## 🔐 Default Login Credentials

### Administrator
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Admin

### Faculty
- **Username**: `faculty`
- **Password**: `faculty123`
- **Role**: Faculty

### Student
- **Username**: `student`
- **Password**: `student123`
- **Role**: Student

## 📊 Database Schema

### Core Collections

#### Users
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  name: String,
  role: ['admin', 'faculty', 'student'],
  isActive: Boolean,
  lastLogin: Date,
  profileImage: String
}
```

#### Students
```javascript
{
  studentId: String (unique),
  userId: ObjectId (ref: User),
  name: String,
  email: String,
  phoneNumber: String,
  course: String,
  department: String,
  semester: String,
  faceEncodings: [{
    encoding: [Number],
    imageUrl: String,
    capturedAt: Date
  }],
  enrolledCourses: [ObjectId (ref: Course)]
}
```

#### Courses
```javascript
{
  courseId: String (unique),
  courseName: String,
  courseCode: String,
  department: String,
  facultyId: ObjectId (ref: Faculty),
  semester: String,
  credits: Number,
  schedule: [{
    day: String,
    startTime: String,
    endTime: String,
    room: String
  }],
  enrolledStudents: [ObjectId (ref: Student)]
}
```

#### Attendance
```javascript
{
  studentId: ObjectId (ref: Student),
  courseId: ObjectId (ref: Course),
  sessionId: ObjectId (ref: AttendanceSession),
  date: String (YYYY-MM-DD),
  timestamp: Date,
  status: ['present', 'absent', 'late'],
  confidence: Number,
  recognitionMethod: ['face_recognition', 'manual', 'rfid']
}
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/logout` - User logout

### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Create new student
- `GET /api/students/:id` - Get student by ID
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `POST /api/students/:id/face-images` - Upload face images
- `GET /api/students/:id/attendance` - Get student attendance

### Attendance
- `POST /api/attendance/sessions` - Start attendance session
- `POST /api/attendance/mark` - Mark attendance
- `POST /api/attendance/recognize` - Face recognition
- `GET /api/attendance/sessions/active` - Get active sessions
- `PUT /api/attendance/sessions/:id/end` - End session
- `GET /api/attendance/history` - Get attendance history

### Reports
- `GET /api/reports/attendance` - Generate attendance report
- `GET /api/reports/student-performance` - Student performance report
- `GET /api/reports/course-statistics` - Course statistics
- `GET /api/reports/export/:type` - Export reports to Excel

## 🎯 User Workflows

### Admin Workflow
1. **Login** → Admin Dashboard
2. **User Management** → Create/manage faculty and students
3. **System Configuration** → Configure system settings
4. **Reports & Analytics** → View system-wide reports
5. **Audit Logs** → Monitor system activities

### Faculty Workflow
1. **Login** → Faculty Dashboard
2. **Student Registration** → Register new students with face capture
3. **Course Management** → Create and manage courses
4. **Start Attendance Session** → Begin live attendance tracking
5. **Monitor Recognition** → View real-time face recognition results
6. **Generate Reports** → Create attendance reports and export to Excel

### Student Workflow
1. **Registration** → One-time face capture process
2. **Login** → Student Dashboard
3. **View Attendance** → Check personal attendance history
4. **Profile Management** → Update personal information
5. **Download Reports** → Export personal attendance data

## 🔧 Configuration

### Camera Settings
The system automatically configures camera settings for optimal face recognition:
- **Resolution**: 640x480 (ideal for processing speed)
- **Frame Rate**: 15-30 FPS
- **Face Mode**: Front-facing camera preferred

### Face Recognition Parameters
- **Confidence Threshold**: 90% for automatic attendance marking
- **Detection Frequency**: Every 3 seconds in attendance mode
- **Image Quality**: JPEG compression at 80% for storage efficiency

### Security Settings
- **JWT Expiration**: 7 days (configurable)
- **Password Hashing**: bcrypt with 12 salt rounds
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **File Upload Limit**: 5MB per image

## 📱 Browser Compatibility

### Supported Browsers
- **Chrome** 80+ (Recommended)
- **Firefox** 75+
- **Safari** 13+
- **Edge** 80+

### Required Permissions
- **Camera Access**: Required for face recognition
- **Microphone**: Not required (audio disabled)
- **Location**: Not required

## 🚀 Deployment

### Production Environment Setup

1. **Environment Variables**:
```env
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db/attendance_system
JWT_SECRET=your-production-secret-key
PORT=3001
```

2. **Build Frontend**:
```bash
npm run build
```

3. **Start Production Server**:
```bash
npm start
```

### Docker Deployment (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## 🔍 Monitoring & Maintenance

### Health Checks
- **API Health**: `GET /api/health`
- **Database Connection**: Automatic monitoring
- **File System**: Upload directory monitoring

### Logging
- **Access Logs**: Morgan HTTP request logging
- **Error Logs**: Console and file-based error logging
- **Audit Logs**: Complete user activity tracking

### Backup Recommendations
- **Database**: Daily MongoDB backups
- **File Uploads**: Regular backup of uploads directory
- **Configuration**: Version control for environment files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- **Email**: support@smartattendance.com
- **Documentation**: [Wiki](wiki-url)
- **Issues**: [GitHub Issues](issues-url)

## 🔮 Future Enhancements

- **Mobile App**: React Native mobile application
- **Advanced Analytics**: Machine learning insights
- **Integration APIs**: Third-party system integrations
- **Multi-language Support**: Internationalization
- **Advanced Security**: Two-factor authentication
- **Cloud Storage**: AWS S3 integration for file storage

---

**SmartAttendance Pro** - Revolutionizing attendance management with AI-powered face recognition technology.