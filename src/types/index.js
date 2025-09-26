// User types and interfaces for the attendance system

export const UserRoles = {
  ADMIN: 'admin',
  FACULTY: 'faculty',
  STUDENT: 'student'
};

export const AttendanceStatus = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late'
};

export const SessionTypes = {
  LECTURE: 'lecture',
  LAB: 'lab',
  TUTORIAL: 'tutorial',
  EXAM: 'exam'
};

export const RecognitionMethods = {
  FACE_RECOGNITION: 'face_recognition',
  MANUAL: 'manual',
  RFID: 'rfid'
};

// Default user structure
export const createDefaultUser = (role) => ({
  id: '',
  username: '',
  email: '',
  name: '',
  role: role,
  isActive: true,
  createdAt: new Date(),
  lastLogin: null
});

// Default student structure
export const createDefaultStudent = () => ({
  id: '',
  studentId: '',
  userId: '',
  name: '',
  email: '',
  phoneNumber: '',
  course: '',
  department: '',
  semester: '',
  faceEncodings: [],
  profileImage: '',
  isActive: true,
  enrolledCourses: [],
  createdAt: new Date()
});

// Default faculty structure
export const createDefaultFaculty = () => ({
  id: '',
  facultyId: '',
  userId: '',
  name: '',
  email: '',
  phoneNumber: '',
  department: '',
  designation: '',
  specialization: '',
  courses: [],
  isActive: true,
  createdAt: new Date()
});

// Default course structure
export const createDefaultCourse = () => ({
  id: '',
  courseId: '',
  courseName: '',
  courseCode: '',
  department: '',
  facultyId: '',
  semester: '',
  credits: 0,
  schedule: [],
  enrolledStudents: [],
  maxCapacity: 60,
  isActive: true,
  description: '',
  createdAt: new Date()
});

// Default attendance record structure
export const createDefaultAttendance = () => ({
  id: '',
  studentId: '',
  courseId: '',
  sessionId: '',
  date: '',
  timestamp: new Date(),
  status: AttendanceStatus.PRESENT,
  confidence: 0,
  recognitionMethod: RecognitionMethods.MANUAL,
  markedBy: '',
  notes: ''
});

// Default attendance session structure
export const createDefaultSession = () => ({
  id: '',
  courseId: '',
  facultyId: '',
  date: '',
  startTime: new Date(),
  endTime: null,
  isActive: true,
  sessionType: SessionTypes.LECTURE,
  totalStudents: 0,
  presentStudents: 0,
  absentStudents: 0,
  lateStudents: 0,
  attendanceRecords: [],
  notes: ''
});

// API response structure
export const createApiResponse = (success = true, message = '', data = null, error = null) => ({
  success,
  message,
  data,
  error,
  timestamp: new Date().toISOString()
});

// Validation helpers
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateStudentId = (studentId) => {
  return studentId && studentId.length >= 3;
};

export const validatePassword = (password) => {
  return password && password.length >= 6;
};

// Date formatting helpers
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString();
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString();
};

// Attendance calculation helpers
export const calculateAttendancePercentage = (present, total) => {
  if (total === 0) return 0;
  return ((present / total) * 100).toFixed(2);
};

export const getAttendanceStatus = (percentage) => {
  if (percentage >= 90) return 'excellent';
  if (percentage >= 80) return 'good';
  if (percentage >= 70) return 'average';
  return 'needs_attention';
};

export const getAttendanceColor = (status) => {
  switch (status) {
    case 'excellent': return 'text-green-600 bg-green-100';
    case 'good': return 'text-blue-600 bg-blue-100';
    case 'average': return 'text-yellow-600 bg-yellow-100';
    case 'needs_attention': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};