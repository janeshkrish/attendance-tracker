// Enhanced attendance route with face recognition integration
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const Student = require('../models/Student');
const Course = require('../models/Course');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Face recognition service URL
const FACE_API_URL = process.env.FACE_API_URL || 'http://localhost:8000';

/**
 * Start a new attendance session with face recognition
 * POST /api/attendance/sessions/start
 */
router.post('/sessions/start', [
  authenticateToken,
  requireRole(['faculty', 'admin']),
  body('courseId').notEmpty().withMessage('Course ID is required'),
  body('sessionName').notEmpty().withMessage('Session name is required'),
  body('enableFaceRecognition').isBoolean().optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { courseId, sessionName, enableFaceRecognition = true } = req.body;
    const facultyId = req.user.id;

    // Verify course exists and user has permission
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if there's an active session for this course
    const existingSession = await AttendanceSession.findOne({
      courseId,
      status: 'active'
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'An attendance session is already active for this course'
      });
    }

    // Create new attendance session
    const session = new AttendanceSession({
      courseId,
      facultyId,
      sessionName,
      startTime: new Date(),
      status: 'active',
      settings: {
        enableFaceRecognition,
        recognitionThreshold: 0.6,
        livenessThreshold: 0.7,
        autoMarkAttendance: true,
        allowManualOverride: true
      }
    });

    await session.save();

    // Initialize face recognition service for this session
    if (enableFaceRecognition) {
      try {
        await axios.post(`${FACE_API_URL}/api/face/retrain`);
      } catch (faceApiError) {
        console.warn('Face API initialization warning:', faceApiError.message);
        // Continue anyway - manual attendance still possible
      }
    }

    res.status(201).json({
      success: true,
      message: 'Attendance session started successfully',
      session: {
        id: session._id,
        courseId: session.courseId,
        sessionName: session.sessionName,
        startTime: session.startTime,
        status: session.status,
        settings: session.settings
      }
    });

  } catch (error) {
    console.error('Error starting attendance session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start attendance session',
      error: error.message
    });
  }
});

/**
 * Process face recognition for attendance
 * POST /api/attendance/face-recognition
 */
router.post('/face-recognition', [
  authenticateToken,
  body('image').notEmpty().withMessage('Image data is required'),
  body('sessionId').notEmpty().withMessage('Session ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { image, sessionId } = req.body;

    // Verify session exists and is active
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Attendance session is not active'
      });
    }

    // Call face recognition API
    const recognitionResponse = await axios.post(`${FACE_API_URL}/api/face/recognize`, {
      image_base64: image,
      session_id: sessionId,
      course_id: session.courseId
    }, {
      timeout: 10000 // 10 second timeout
    });

    const faceResult = recognitionResponse.data;

    if (!faceResult.success) {
      return res.status(200).json({
        success: false,
        message: 'No face recognized or face is not live',
        details: {
          isLive: faceResult.is_live,
          livenessConfidence: faceResult.liveness_confidence
        }
      });
    }

    // Get student details
    const student = await Student.findById(faceResult.student_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found in database'
      });
    }

    // Check if attendance already marked today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      studentId: student._id,
      courseId: session.courseId,
      sessionId: session._id,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (existingAttendance) {
      return res.status(200).json({
        success: false,
        message: 'Attendance already marked for this student today',
        student: {
          id: student._id,
          name: student.name,
          studentId: student.studentId
        },
        existingAttendance: {
          timestamp: existingAttendance.timestamp,
          status: existingAttendance.status
        }
      });
    }

    // Mark attendance
    const attendance = new Attendance({
      studentId: student._id,
      courseId: session.courseId,
      sessionId: session._id,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date(),
      status: 'present',
      recognitionData: {
        method: 'face_recognition',
        confidence: faceResult.confidence,
        livenessScore: faceResult.liveness_confidence,
        isLive: faceResult.is_live
      }
    });

    await attendance.save();

    // Update session statistics
    await AttendanceSession.findByIdAndUpdate(sessionId, {
      $inc: {
        totalRecognitions: 1,
        successfulRecognitions: 1
      }
    });

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully via face recognition',
      student: {
        id: student._id,
        name: student.name,
        studentId: student.studentId,
        email: student.email
      },
      attendance: {
        id: attendance._id,
        timestamp: attendance.timestamp,
        status: attendance.status,
        confidence: faceResult.confidence,
        livenessScore: faceResult.liveness_confidence
      }
    });

  } catch (error) {
    console.error('Face recognition error:', error);
    
    // Handle specific API errors
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Face recognition service is unavailable',
        details: 'Please try manual attendance marking'
      });
    }

    if (error.response && error.response.status === 408) {
      return res.status(408).json({
        success: false,
        message: 'Face recognition timeout',
        details: 'Please try again or use manual attendance'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Face recognition processing failed',
      error: error.message
    });
  }
});

/**
 * Mark attendance manually (fallback)
 * POST /api/attendance/manual
 */
router.post('/manual', [
  authenticateToken,
  requireRole(['faculty', 'admin']),
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('studentId').notEmpty().withMessage('Student ID is required'),
  body('status').isIn(['present', 'absent', 'late']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { sessionId, studentId, status, notes } = req.body;
    const facultyId = req.user.id;

    // Verify session and permissions
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found'
      });
    }

    if (session.facultyId.toString() !== facultyId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied for this session'
      });
    }

    // Verify student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check for existing attendance
    const today = new Date().toISOString().split('T')[0];
    const existingAttendance = await Attendance.findOne({
      studentId,
      courseId: session.courseId,
      sessionId,
      date: today
    });

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = status;
      existingAttendance.timestamp = new Date();
      existingAttendance.notes = notes;
      existingAttendance.recognitionData = {
        method: 'manual',
        markedBy: facultyId
      };
      
      await existingAttendance.save();

      return res.status(200).json({
        success: true,
        message: 'Attendance updated successfully',
        attendance: existingAttendance
      });
    }

    // Create new attendance record
    const attendance = new Attendance({
      studentId,
      courseId: session.courseId,
      sessionId,
      date: today,
      timestamp: new Date(),
      status,
      notes,
      recognitionData: {
        method: 'manual',
        markedBy: facultyId
      }
    });

    await attendance.save();

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      attendance
    });

  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: error.message
    });
  }
});

/**
 * Get attendance session details with statistics
 * GET /api/attendance/sessions/:sessionId
 */
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await AttendanceSession.findById(sessionId)
      .populate('courseId', 'courseName courseCode')
      .populate('facultyId', 'name email');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Get attendance records for this session
    const attendanceRecords = await Attendance.find({ sessionId })
      .populate('studentId', 'name studentId email')
      .sort({ timestamp: -1 });

    // Get enrolled students for the course
    const course = await Course.findById(session.courseId)
      .populate('enrolledStudents', 'name studentId email');

    const totalStudents = course.enrolledStudents.length;
    const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
    const absentCount = totalStudents - presentCount;

    // Face recognition statistics
    const faceRecognitionCount = attendanceRecords.filter(
      a => a.recognitionData?.method === 'face_recognition'
    ).length;

    res.status(200).json({
      success: true,
      session: {
        ...session.toJSON(),
        statistics: {
          totalStudents,
          presentCount,
          absentCount,
          attendanceRate: totalStudents > 0 ? (presentCount / totalStudents * 100).toFixed(1) : 0,
          faceRecognitionCount,
          manualCount: attendanceRecords.length - faceRecognitionCount
        }
      },
      attendanceRecords,
      enrolledStudents: course.enrolledStudents
    });

  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session details',
      error: error.message
    });
  }
});

/**
 * End attendance session
 * PUT /api/attendance/sessions/:sessionId/end
 */
router.put('/sessions/:sessionId/end', [
  authenticateToken,
  requireRole(['faculty', 'admin'])
], async (req, res) => {
  try {
    const { sessionId } = req.params;
    const facultyId = req.user.id;

    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.facultyId.toString() !== facultyId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Session is not active'
      });
    }

    // Update session status
    session.status = 'completed';
    session.endTime = new Date();
    await session.save();

    // Calculate final statistics
    const attendanceCount = await Attendance.countDocuments({ sessionId });
    const course = await Course.findById(session.courseId);
    const totalStudents = course.enrolledStudents.length;

    res.status(200).json({
      success: true,
      message: 'Attendance session ended successfully',
      session: {
        id: session._id,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: Math.round((session.endTime - session.startTime) / (1000 * 60)), // minutes
        totalStudents,
        attendanceCount,
        attendanceRate: totalStudents > 0 ? (attendanceCount / totalStudents * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end session',
      error: error.message
    });
  }
});

/**
 * Get active attendance sessions
 * GET /api/attendance/sessions/active
 */
router.get('/sessions/active', authenticateToken, async (req, res) => {
  try {
    const query = { status: 'active' };
    
    // Non-admin users can only see their own sessions
    if (req.user.role !== 'admin') {
      query.facultyId = req.user.id;
    }

    const activeSessions = await AttendanceSession.find(query)
      .populate('courseId', 'courseName courseCode')
      .populate('facultyId', 'name email')
      .sort({ startTime: -1 });

    res.status(200).json({
      success: true,
      sessions: activeSessions
    });

  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active sessions',
      error: error.message
    });
  }
});

/**
 * Get face recognition statistics
 * GET /api/attendance/face-stats
 */
router.get('/face-stats', authenticateToken, async (req, res) => {
  try {
    // Call face recognition service for statistics
    const response = await axios.get(`${FACE_API_URL}/api/face/statistics`, {
      timeout: 5000
    });

    res.status(200).json({
      success: true,
      ...response.data
    });

  } catch (error) {
    console.error('Error fetching face recognition stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch face recognition statistics',
      error: error.message
    });
  }
});

/**
 * Test face recognition service connectivity
 * GET /api/attendance/face-health
 */
router.get('/face-health', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${FACE_API_URL}/api/face/health`, {
      timeout: 3000
    });

    res.status(200).json({
      success: true,
      faceServiceStatus: 'healthy',
      faceServiceData: response.data
    });

  } catch (error) {
    res.status(200).json({
      success: false,
      faceServiceStatus: 'unavailable',
      message: 'Face recognition service is not responding',
      fallback: 'Manual attendance marking is available'
    });
  }
});

module.exports = router;