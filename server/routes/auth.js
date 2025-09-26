const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const { auth, auditLog } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', auditLog('CREATE', 'USER'), async (req, res) => {
  try {
    const { username, email, password, name, role, additionalData } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email or username already exists'
      });
    }

    // Create user
    const user = new User({
      username,
      email,
      password,
      name,
      role
    });

    await user.save();

    // Create role-specific profile
    if (role === 'student' && additionalData) {
      const student = new Student({
        ...additionalData,
        userId: user._id,
        name,
        email
      });
      await student.save();
    } else if (role === 'faculty' && additionalData) {
      const faculty = new Faculty({
        ...additionalData,
        userId: user._id,
        name,
        email
      });
      await faculty.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Login
router.post('/login', auditLog('LOGIN', 'USER'), async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Find user
    const user = await User.findOne({ username, role, isActive: true });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    let profile = { ...req.user.toJSON() };

    // Get role-specific data
    if (req.user.role === 'student') {
      const student = await Student.findOne({ userId: req.user._id })
        .populate('enrolledCourses');
      if (student) {
        profile.studentData = student;
      }
    } else if (req.user.role === 'faculty') {
      const faculty = await Faculty.findOne({ userId: req.user._id })
        .populate('courses');
      if (faculty) {
        profile.facultyData = faculty;
      }
    }

    res.json(profile);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
});

// Update profile
router.put('/profile', auth, auditLog('UPDATE', 'USER'), async (req, res) => {
  try {
    const { name, email, profileImage } = req.body;
    
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (email) user.email = email;
    if (profileImage) user.profileImage = profileImage;
    
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Profile update failed', error: error.message });
  }
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', auth, auditLog('LOGOUT', 'USER'), (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;