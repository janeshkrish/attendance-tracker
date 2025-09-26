const express = require('express');
const Student = require('../models/Student');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'server/uploads/students/');
  },
  filename: (req, file, cb) => {
    cb(null, `${req.params.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });


// GET all students (accessible by Admin and Faculty)
router.get('/', auth, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const students = await Student.find({ isActive: true })
      .populate('userId', 'username name email')
      .sort({ name: 1 });
    res.json({ students, total: students.length });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch students', error: error.message });
  }
});

// POST create a new student
router.post('/', auth, authorize('admin', 'faculty'), async (req, res) => {
    const { studentId, name, email, phoneNumber, course, department, semester, username, password } = req.body;
    try {
        let user = await User.findOne({ $or: [{ email }, { username }]});
        if (user) return res.status(400).json({ message: 'User with this email or username already exists.' });

        user = new User({ username: username || studentId, email, password, name, role: 'student' });
        await user.save();

        const student = new Student({ studentId, userId: user._id, name, email, phoneNumber, course, department, semester });
        await student.save();

        res.status(201).json({ student });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create student', error: error.message });
    }
});


// POST upload face images for a student
router.post('/:id/face-images', auth, authorize('admin', 'faculty'), upload.array('images', 10), async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const imagePaths = req.files.map(file => `/uploads/students/${file.filename}`);
        
        // Here you would typically generate face encodings with a Python service
        // For now, we'll just save the image URLs
        const faceData = imagePaths.map(path => ({ imageUrl: path, capturedAt: new Date() }));

        student.faceEncodings.push(...faceData);
        await student.save();

        res.json({ message: 'Face images uploaded successfully', student });
    } catch (error) {
        res.status(500).json({ message: 'Failed to upload images', error: error.message });
    }
});


module.exports = router;

