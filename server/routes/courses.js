const express = require('express');
const Course = require('../models/Course');
const Faculty = require('../models/Faculty');
const { auth, authorize, auditLog } = require('../middleware/auth');

const router = express.Router();

// GET all courses
router.get('/', auth, async (req, res) => {
    try {
        const query = {};
        // If the user is faculty, only return their courses
        if (req.user.role === 'faculty' && req.faculty) {
            query.facultyId = req.faculty._id;
        }
        const courses = await Course.find(query).populate('facultyId', 'name');
        res.json({ courses, total: courses.length });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch courses", error: error.message });
    }
});

// POST create a new course and assign to faculty
router.post('/', auth, authorize('admin'), auditLog('CREATE', 'COURSE'), async (req, res) => {
    const { courseId, courseName, courseCode, department, facultyId, semester } = req.body;
    try {
        const faculty = await Faculty.findById(facultyId);
        if (!faculty) return res.status(404).json({ message: 'Faculty not found' });
        
        const course = new Course({ courseId, courseName, courseCode, department, facultyId, semester });
        await course.save();

        // Also update the faculty member's record to include this new course
        faculty.courses.push(course._id);
        await faculty.save();
        
        res.status(201).json(course);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create course', error: error.message });
    }
});

module.exports = router;
