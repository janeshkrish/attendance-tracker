const express = require('express');
const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Faculty = require('../models/Faculty');
const { auth, authorize, auditLog } = require('../middleware/auth');
const mongoose = require('mongoose');
const faceRecognitionService = require('../services/faceRecognition');

const router = express.Router();

// Start attendance session
router.post('/sessions', auth, authorize('faculty'), auditLog('CREATE', 'ATTENDANCE_SESSION'), async (req, res) => {
  try {
    const { courseId } = req.body;
    
    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    // Verify course exists and belongs to faculty
    const course = await Course.findById(courseId).populate('enrolledStudents');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if faculty owns this course
    const faculty = await Faculty.findOne({ userId: req.user._id });
    if (!faculty || course.facultyId.toString() !== faculty._id.toString()) {
      return res.status(403).json({ message: 'You can only start sessions for your own courses' });
    }

    // Check if there's already an active session for this course today
    const today = new Date().toISOString().split('T')[0];
    const existingSession = await AttendanceSession.findOne({
      courseId,
      date: today,
      isActive: true
    });

    if (existingSession) {
      return res.status(400).json({ 
        message: 'An active session already exists for this course today',
        session: existingSession
      });
    }

    // Create new session
    const session = new AttendanceSession({
      courseId,
      facultyId: faculty._id,
      date: today,
      startTime: new Date(),
      totalStudents: course.enrolledStudents.length,
      isActive: true
    });

    await session.save();

    res.status(201).json({
      message: 'Attendance session started successfully',
      session: await session.populate('courseId', 'courseName courseCode')
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ message: 'Failed to start attendance session' });
  }
});

// Mark attendance manually
router.post('/mark', auth, authorize('faculty'), auditLog('CREATE', 'ATTENDANCE'), async (req, res) => {
  try {
    const { sessionId, studentId, status, notes } = req.body;
    
    if (!sessionId || !studentId || !status) {
      return res.status(400).json({ message: 'Session ID, student ID, and status are required' });
    }

    // Verify session exists and is active
    const session = await AttendanceSession.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ message: 'Active session not found' });
    }

    // Check if attendance already marked for this student today
    const existingAttendance = await Attendance.findOne({
      studentId,
      courseId: session.courseId,
      date: session.date
    });

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = status;
      existingAttendance.timestamp = new Date();
      existingAttendance.markedBy = req.user._id;
      existingAttendance.notes = notes;
      existingAttendance.recognitionMethod = 'manual';
      await existingAttendance.save();
    } else {
      // Create new attendance record
      const attendance = new Attendance({
        studentId,
        courseId: session.courseId,
        sessionId,
        date: session.date,
        status,
        markedBy: req.user._id,
        notes,
        recognitionMethod: 'manual'
      });
      await attendance.save();
      session.attendanceRecords.push(attendance._id);
    }

    // Update session statistics
    await updateSessionStatistics(sessionId);

    res.json({ message: 'Attendance marked successfully' });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Failed to mark attendance' });
  }
});

router.post('/recognize', auth, authorize('faculty'), async (req, res) => {
  try {
    const { imageData, sessionId } = req.body;
    
    if (!imageData || !sessionId) {
      return res.status(400).json({ message: 'Image data and session ID are required' });
    }
    
    const session = await AttendanceSession.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ message: 'Active session not found' });
    }
    
    // Use face recognition service
    const recognitionResults = await faceRecognitionService.recognizeFace(imageData, session.courseId);
    
    // Auto-mark attendance for high-confidence matches
    for (const result of recognitionResults) {
      if (result.confidence > 0.8) {
        // Check if already marked today
        const existingAttendance = await Attendance.findOne({
          studentId: result.studentId,
          courseId: session.courseId,
          date: session.date
        });

        if (!existingAttendance) {
          const attendance = new Attendance({
            studentId: result.studentId,
            courseId: session.courseId,
            sessionId,
            date: session.date,
            status: 'present',
            confidence: result.confidence,
            recognitionMethod: 'face_recognition'
          });
          await attendance.save();
          session.attendanceRecords.push(attendance._id);
        }
      }
    }

    // Update session statistics
    await updateSessionStatistics(sessionId);
    
    res.json({ results: recognitionResults, sessionId, timestamp: new Date() });
  } catch (error) {
    console.error('Face recognition error:', error);
    res.status(500).json({ message: 'Face recognition failed' });
  }
});

// Get active sessions for faculty
router.get('/sessions/active', auth, authorize('faculty'), async (req, res) => {
  try {
    const faculty = await Faculty.findOne({ userId: req.user._id });
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty profile not found' });
    }

    const activeSessions = await AttendanceSession.find({
      facultyId: faculty._id,
      isActive: true
    }).populate('courseId', 'courseName courseCode');

    res.json({ sessions: activeSessions });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({ message: 'Failed to fetch active sessions' });
  }
});

// End attendance session
router.put('/sessions/:id/end', auth, authorize('faculty'), auditLog('UPDATE', 'ATTENDANCE_SESSION'), async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (!session.isActive) {
      return res.status(400).json({ message: 'Session is already ended' });
    }

    // Update session
    session.isActive = false;
    session.endTime = new Date();
    await session.save();

    // Update final statistics
    await updateSessionStatistics(req.params.id);

    res.json({ message: 'Session ended successfully', session });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ message: 'Failed to end session' });
  }
});

// Get attendance for a specific session
router.get('/sessions/:id/attendance', auth, async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.id)
      .populate('courseId', 'courseName courseCode');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const attendanceRecords = await Attendance.find({ sessionId: req.params.id })
      .populate('studentId', 'name studentId email')
      .sort({ timestamp: -1 });

    res.json({
      session,
      attendance: attendanceRecords,
      statistics: {
        total: session.totalStudents,
        present: session.presentStudents,
        absent: session.absentStudents,
        late: session.lateStudents
      }
    });
  } catch (error) {
    console.error('Get session attendance error:', error);
    res.status(500).json({ message: 'Failed to fetch session attendance' });
  }
});

// Get attendance history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, courseId, startDate, endDate } = req.query;
    
    let query = {};
    
    // Role-based filtering
    if (req.user.role === 'faculty') {
      const faculty = await Faculty.findOne({ userId: req.user._id });
      if (faculty) {
        const facultyCourses = await Course.find({ facultyId: faculty._id });
        query.courseId = { $in: facultyCourses.map(c => c._id) };
      }
    } else if (req.user.role === 'student') {
      const student = await Student.findOne({ userId: req.user._id });
      if (student) {
        query.studentId = student._id;
      }
    }
    
    // Apply additional filters
    if (courseId) query.courseId = courseId;
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('studentId', 'name studentId email')
      .populate('courseId', 'courseName courseCode')
      .populate('sessionId', 'date startTime')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ date: -1, timestamp: -1 });

    const total = await Attendance.countDocuments(query);

    res.json({
      records: attendanceRecords,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance history' });
  }
});

// Helper function to update session statistics
async function updateSessionStatistics(sessionId) {
  try {
    const session = await AttendanceSession.findById(sessionId);
    if (!session) return;

    const attendanceRecords = await Attendance.find({ sessionId });
    
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const absent = session.totalStudents - present - late;

    session.presentStudents = present;
    session.lateStudents = late;
    session.absentStudents = Math.max(0, absent);
    
    await session.save();
  } catch (error) {
    console.error('Update session statistics error:', error);
  }
}

module.exports = router;