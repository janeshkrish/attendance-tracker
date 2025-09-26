export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'faculty' | 'student';
  name: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface Student {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  course: string;
  department: string;
  faceEncodings: number[][];
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Faculty {
  _id: string;
  facultyId: string;
  name: string;
  email: string;
  department: string;
  courses: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface Course {
  _id: string;
  courseId: string;
  courseName: string;
  department: string;
  facultyId: string;
  facultyName: string;
  schedule: {
    day: string;
    startTime: string;
    endTime: string;
  }[];
  isActive: boolean;
  createdAt: Date;
}

export interface AttendanceRecord {
  _id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  facultyId: string;
  date: string;
  timestamp: Date;
  status: 'present' | 'absent' | 'late';
  confidence: number;
  sessionId: string;
}

export interface AttendanceSession {
  _id: string;
  courseId: string;
  courseName: string;
  facultyId: string;
  facultyName: string;
  date: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  totalStudents: number;
  presentStudents: number;
  attendanceRecords: string[];
}

export interface AuditLog {
  _id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: Date;
  ipAddress: string;
}

export type AuthState = {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
};