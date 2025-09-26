const express = require('express');
const Faculty = require('../models/Faculty');
const User = require('../models/User');
const { auth, authorize, auditLog } = require('../middleware/auth');

const router = express.Router();

// GET all faculty (for admin)
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const faculty = await Faculty.find({ isActive: true }).populate('userId', 'username name email');
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch faculty' });
  }
});

// GET current faculty's details (for the logged-in faculty)
router.get('/me', auth, authorize('faculty'), async (req, res) => {
    try {
        // The 'req.faculty' is attached by the auth middleware
        if (!req.faculty) {
            return res.status(404).json({ message: "Faculty profile not found for this user."});
        }
        await req.faculty.populate({
            path: 'courses',
            select: 'courseName courseCode enrolledStudents'
        });
        res.json(req.faculty);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch faculty profile', error: error.message });
    }
});

// POST create a new faculty member
router.post('/', auth, authorize('admin'), auditLog('CREATE', 'FACULTY'), async (req, res) => {
  const { facultyId, name, email, department, username, password } = req.body;
  try {
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) return res.status(400).json({ message: 'User with this email or username already exists.' });
    
    user = new User({ username, email, password, name, role: 'faculty' });
    await user.save();

    const faculty = new Faculty({ facultyId, userId: user._id, name, email, department });
    await faculty.save();
    
    res.status(201).json(faculty);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create faculty', error: error.message });
  }
});

module.exports = router;
