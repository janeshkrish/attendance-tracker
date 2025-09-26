const express = require('express');
const ExcelJS = require('exceljs');
const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Faculty = require('../models/Faculty');
const { auth, authorize, auditLog } = require('../middleware/auth');

const router = express.Router();

// Generate attendance report
router.get('/attendance', auth, auditLog('GENERATE', 'REPORT'), async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      courseId, 
      studentId, 
      facultyId,
      format = 'json' 
    } = req.query;

    let query = {};
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    if (courseId) query.courseId = courseId;
    if (studentId) query.studentId = studentId;

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

    const attendanceRecords = await Attendance.find(query)
      .populate('studentId', 'name studentId email course department')
      .populate('courseId', 'courseName courseCode department')
      .populate('sessionId', 'sessionType date')
      .sort({ date: -1, timestamp: -1 });

    // Calculate statistics
    const stats = {
      totalRecords: attendanceRecords.length,
      present: attendanceRecords.filter(r => r.status === 'present').length,
      absent: attendanceRecords.filter(r => r.status === 'absent').length,
      late: attendanceRecords.filter(r => r.status === 'late').length
    };

    stats.attendanceRate = stats.totalRecords > 0 
      ? ((stats.present + stats.late) / stats.totalRecords * 100).toFixed(2)
      : 0;

    if (format === 'excel') {
      return generateExcelReport(res, attendanceRecords, stats, 'attendance');
    }

    res.json({
      records: attendanceRecords,
      statistics: stats,
      filters: { startDate, endDate, courseId, studentId, facultyId }
    });
  } catch (error) {
    console.error('Generate attendance report error:', error);
    res.status(500).json({ message: 'Failed to generate report', error: error.message });
  }
});

// Generate student performance report
router.get('/student-performance', auth, authorize('admin', 'faculty'), auditLog('GENERATE', 'REPORT'), async (req, res) => {
  try {
    const { courseId, semester, department } = req.query;

    let studentQuery = { isActive: true };
    if (department) studentQuery.department = department;

    const students = await Student.find(studentQuery)
      .populate('enrolledCourses', 'courseName courseCode');

    const performanceData = [];

    for (const student of students) {
      let courseFilter = { studentId: student._id };
      if (courseId) courseFilter.courseId = courseId;

      const attendanceRecords = await Attendance.find(courseFilter)
        .populate('courseId', 'courseName courseCode');

      const totalClasses = attendanceRecords.length;
      const presentClasses = attendanceRecords.filter(r => r.status === 'present').length;
      const lateClasses = attendanceRecords.filter(r => r.status === 'late').length;
      const attendanceRate = totalClasses > 0 
        ? ((presentClasses + lateClasses) / totalClasses * 100).toFixed(2)
        : 0;

      performanceData.push({
        student: {
          id: student._id,
          studentId: student.studentId,
          name: student.name,
          email: student.email,
          course: student.course,
          department: student.department
        },
        attendance: {
          totalClasses,
          present: presentClasses,
          late: lateClasses,
          absent: totalClasses - presentClasses - lateClasses,
          attendanceRate: parseFloat(attendanceRate)
        }
      });
    }

    // Sort by attendance rate
    performanceData.sort((a, b) => b.attendance.attendanceRate - a.attendance.attendanceRate);

    res.json({
      students: performanceData,
      summary: {
        totalStudents: performanceData.length,
        averageAttendance: performanceData.length > 0 
          ? (performanceData.reduce((sum, s) => sum + s.attendance.attendanceRate, 0) / performanceData.length).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    console.error('Generate student performance report error:', error);
    res.status(500).json({ message: 'Failed to generate report', error: error.message });
  }
});

// Generate course statistics report
router.get('/course-statistics', auth, authorize('admin', 'faculty'), auditLog('GENERATE', 'REPORT'), async (req, res) => {
  try {
    const { department, semester } = req.query;

    let courseQuery = { isActive: true };
    if (department) courseQuery.department = department;
    if (semester) courseQuery.semester = semester;

    // Role-based filtering for faculty
    if (req.user.role === 'faculty') {
      const faculty = await Faculty.findOne({ userId: req.user._id });
      if (faculty) {
        courseQuery.facultyId = faculty._id;
      }
    }

    const courses = await Course.find(courseQuery)
      .populate('facultyId', 'name email department')
      .populate('enrolledStudents', 'name studentId');

    const courseStats = [];

    for (const course of courses) {
      const totalSessions = await AttendanceSession.countDocuments({ 
        courseId: course._id 
      });

      const attendanceRecords = await Attendance.find({ 
        courseId: course._id 
      });

      const totalStudents = course.enrolledStudents.length;
      const totalPossibleAttendance = totalSessions * totalStudents;
      const actualAttendance = attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      
      const attendanceRate = totalPossibleAttendance > 0 
        ? (actualAttendance / totalPossibleAttendance * 100).toFixed(2)
        : 0;

      courseStats.push({
        course: {
          id: course._id,
          courseId: course.courseId,
          courseName: course.courseName,
          courseCode: course.courseCode,
          department: course.department,
          semester: course.semester,
          faculty: course.facultyId
        },
        statistics: {
          enrolledStudents: totalStudents,
          totalSessions,
          attendanceRate: parseFloat(attendanceRate),
          totalAttendanceRecords: attendanceRecords.length
        }
      });
    }

    res.json({
      courses: courseStats,
      summary: {
        totalCourses: courseStats.length,
        averageAttendanceRate: courseStats.length > 0 
          ? (courseStats.reduce((sum, c) => sum + c.statistics.attendanceRate, 0) / courseStats.length).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    console.error('Generate course statistics report error:', error);
    res.status(500).json({ message: 'Failed to generate report', error: error.message });
  }
});

// Export report to Excel
router.get('/export/:reportType', auth, auditLog('EXPORT', 'REPORT'), async (req, res) => {
  try {
    const { reportType } = req.params;
    const { format = 'excel', ...queryParams } = req.query;

    let data, filename;

    switch (reportType) {
      case 'attendance':
        // Re-use attendance report logic
        const attendanceResponse = await generateAttendanceData(queryParams, req.user);
        data = attendanceResponse.records;
        filename = `attendance-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    await generateExcelReport(res, data, null, reportType, filename);
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ message: 'Failed to export report', error: error.message });
  }
});

// Helper function to generate Excel reports
async function generateExcelReport(res, data, stats, reportType, filename) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  switch (reportType) {
    case 'attendance':
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Student ID', key: 'studentId', width: 15 },
        { header: 'Student Name', key: 'studentName', width: 25 },
        { header: 'Course Code', key: 'courseCode', width: 15 },
        { header: 'Course Name', key: 'courseName', width: 30 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Time', key: 'time', width: 10 },
        { header: 'Confidence', key: 'confidence', width: 12 }
      ];

      data.forEach(record => {
        worksheet.addRow({
          date: record.date,
          studentId: record.studentId?.studentId || 'N/A',
          studentName: record.studentId?.name || 'N/A',
          courseCode: record.courseId?.courseCode || 'N/A',
          courseName: record.courseId?.courseName || 'N/A',
          status: record.status,
          time: new Date(record.timestamp).toLocaleTimeString(),
          confidence: record.confidence ? (record.confidence * 100).toFixed(1) + '%' : 'N/A'
        });
      });
      break;
  }

  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename || 'report.xlsx'}"`);

  await workbook.xlsx.write(res);
  res.end();
}

// Helper function to generate attendance data
async function generateAttendanceData(queryParams, user) {
  const { startDate, endDate, courseId, studentId, facultyId } = queryParams;
  
  let query = {};
  
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  }
  
  if (courseId) query.courseId = courseId;
  if (studentId) query.studentId = studentId;

  // Role-based filtering
  if (user.role === 'faculty') {
    const faculty = await Faculty.findOne({ userId: user._id });
    if (faculty) {
      const facultyCourses = await Course.find({ facultyId: faculty._id });
      query.courseId = { $in: facultyCourses.map(c => c._id) };
    }
  } else if (user.role === 'student') {
    const student = await Student.findOne({ userId: user._id });
    if (student) {
      query.studentId = student._id;
    }
  }

  const records = await Attendance.find(query)
    .populate('studentId', 'name studentId email course department')
    .populate('courseId', 'courseName courseCode department')
    .populate('sessionId', 'sessionType date')
    .sort({ date: -1, timestamp: -1 });

  return { records };
}

module.exports = router;