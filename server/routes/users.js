const express = require('express');
const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const { auth, authorize, auditLog } = require('../middleware/auth');

const router = express.Router();

// Get all users (Admin only)
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    
    let query = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

// Get user by ID
router.get('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get role-specific data
    let roleData = null;
    if (user.role === 'student') {
      roleData = await Student.findOne({ userId: user._id });
    } else if (user.role === 'faculty') {
      roleData = await Faculty.findOne({ userId: user._id });
    }

    res.json({
      ...user.toJSON(),
      roleData
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
});

// Update user
router.put('/:id', auth, authorize('admin'), auditLog('UPDATE', 'USER'), async (req, res) => {
  try {
    const { name, email, isActive } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    
    await user.save();

    res.json({
      message: 'User updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
});

// Delete user (soft delete)
router.delete('/:id', auth, authorize('admin'), auditLog('DELETE', 'USER'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Also deactivate role-specific profile
    if (user.role === 'student') {
      await Student.findOneAndUpdate({ userId: user._id }, { isActive: false });
    } else if (user.role === 'faculty') {
      await Faculty.findOneAndUpdate({ userId: user._id }, { isActive: false });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

// Get user statistics
router.get('/stats/overview', auth, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
    const facultyCount = await User.countDocuments({ role: 'faculty', isActive: true });
    const studentCount = await User.countDocuments({ role: 'student', isActive: true });
    
    const recentUsers = await User.find({ isActive: true })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      statistics: {
        total: totalUsers,
        admin: adminCount,
        faculty: facultyCount,
        student: studentCount
      },
      recentUsers
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Failed to fetch user statistics', error: error.message });
  }
});

module.exports = router;