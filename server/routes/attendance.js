const express = require('express');
const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const Student = require('../models/Student');
const Course = require('../models/Course');
const { auth, authorize, auditLog } = require('../middleware/auth');
const { default: mongoose } = require('mongoose');

const router = express.Router();

// --- Face Recognition Simulation ---
async function simulateFaceRecognition(imageData, courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return []; // Invalid courseId
    }

    const course = await Course.findById(courseId).populate('enrolledStudents');
    if (!course || course.enrolledStudents.length === 0) {
        return []; // No students enrolled to recognize
    }

    // Filter for students who have face encodings ("trained" students)
    const trainedStudents = course.enrolledStudents.filter(s => s.faceEncodings && s.faceEncodings.length > 0);
    if (trainedStudents.length === 0) {
        return []; // No trained students in this course
    }

    // Pick a random trained student from the course to "recognize"
    const randomStudent = trainedStudents[Math.floor(Math.random() * trainedStudents.length)];
  
    return [{
        studentId: randomStudent._id,
        name: randomStudent.name,
        studentIdNumber: randomStudent.studentId,
        confidence: 0.9 + (Math.random() * 0.1), // High confidence
    }];
}

// --- API Routes ---

router.post('/sessions', auth, authorize('faculty'), async (req, res) => {
    // ... (logic to start a session)
});

router.post('/mark', auth, authorize('faculty'), async (req, res) => {
    // ... (logic to mark attendance)
});

router.post('/recognize', auth, authorize('faculty'), async (req, res) => {
  try {
    const { imageData, sessionId } = req.body;
    const session = await AttendanceSession.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ message: 'Active session not found' });
    }
    
    const recognitionResults = await simulateFaceRecognition(imageData, session.courseId);
    
    res.json({ results: recognitionResults, sessionId, timestamp: new Date() });
  } catch (error) {
    console.error('Face recognition error:', error);
    res.status(500).json({ message: 'Face recognition failed' });
  }
});

router.get('/sessions/active', auth, authorize('faculty'), async (req, res) => {
    // ... (get active sessions)
});

router.put('/sessions/:id/end', auth, authorize('faculty'), async (req, res) => {
    // ... (end a session)
});

router.get('/sessions/:id/attendance', auth, async (req, res) => {
    // ... (get attendance for a session)
});

router.get('/history', auth, async (req, res) => {
    // ... (get attendance history)
});

module.exports = router;

