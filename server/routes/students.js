const express = require('express');
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { auth, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const faceRecognitionService = require('../services/faceRecognition');

const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'server/uploads/students/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.params.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});


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
        // Validate required fields
        if (!studentId || !name || !email || !course || !department) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        let user = await User.findOne({ $or: [{ email }, { username }]});
        if (user) return res.status(400).json({ message: 'User with this email or username already exists.' });

        user = new User({ 
            username: username || studentId, 
            email, 
            password: password || 'student123', 
            name, 
            role: 'student' 
        });
        await user.save();

        const student = new Student({ studentId, userId: user._id, name, email, phoneNumber, course, department, semester });
        await student.save();

        res.status(201).json({ student });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create student', error: error.message });
    }
});

// GET student by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('enrolledCourses', 'courseName courseCode');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check permissions
    if (req.user.role === 'student' && student.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch student', error: error.message });
  }
});

// UPDATE student
router.put('/:id', auth, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const { name, email, phoneNumber, course, department, semester } = req.body;
    
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Update student fields
    if (name) student.name = name;
    if (email) student.email = email;
    if (phoneNumber) student.phoneNumber = phoneNumber;
    if (course) student.course = course;
    if (department) student.department = department;
    if (semester) student.semester = semester;

    await student.save();

    // Update user record if name or email changed
    if (name || email) {
      await User.findByIdAndUpdate(student.userId, {
        ...(name && { name }),
        ...(email && { email })
      });
    }

    res.json({ message: 'Student updated successfully', student });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update student', error: error.message });
  }
});

// DELETE student
router.delete('/:id', auth, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Soft delete
    student.isActive = false;
    await student.save();

    // Also deactivate user account
    await User.findByIdAndUpdate(student.userId, { isActive: false });

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete student', error: error.message });
  }
});

// POST upload face images for a student
router.post('/:id/face-images', auth, authorize('admin', 'faculty'), upload.array('images', 10), async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No images uploaded' });
        }

        const faceData = [];
        
        // Process each uploaded image
        for (const file of req.files) {
            try {
                const imageBuffer = fs.readFileSync(file.path);
                const faceEncoding = await faceRecognitionService.addFaceEncoding(student._id, imageBuffer);
                faceData.push(faceEncoding);
            } catch (error) {
                console.error(`Error processing image ${file.filename}:`, error);
            }
        }

        if (faceData.length === 0) {
            return res.status(400).json({ message: 'No valid face encodings could be generated' });
        }

        // Reload face descriptors in the recognition service
        await faceRecognitionService.reloadFaceDescriptors();

        res.json({ 
            message: `${faceData.length} face images processed successfully`, 
            processedImages: faceData.length,
            totalImages: req.files.length
        });
    } catch (error) {
        console.error('Face image upload error:', error);
        res.status(500).json({ message: 'Failed to upload images', error: error.message });
    }
});

// GET student attendance
router.get('/:id/attendance', auth, async (req, res) => {
  try {
    const { startDate, endDate, courseId } = req.query;
    
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check permissions
    if (req.user.role === 'student' && student.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let query = { studentId: req.params.id };
    
    if (courseId) query.courseId = courseId;
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('courseId', 'courseName courseCode')
      .populate('sessionId', 'date startTime sessionType')
      .sort({ date: -1, timestamp: -1 });

    // Calculate statistics
    const totalClasses = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const attendancePercentage = totalClasses > 0 ? ((present + late) / totalClasses * 100).toFixed(1) : 0;

    res.json({
      records: attendanceRecords,
      statistics: {
        totalClasses,
        present,
        late,
        absent,
        attendancePercentage: parseFloat(attendancePercentage)
      }
    });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance', error: error.message });
  }
});


module.exports = router;