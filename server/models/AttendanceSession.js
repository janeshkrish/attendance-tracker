const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  date: {
    type: String,
    required: true // Format: YYYY-MM-DD
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sessionType: {
    type: String,
    enum: ['lecture', 'lab', 'tutorial', 'exam'],
    default: 'lecture'
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  presentStudents: {
    type: Number,
    default: 0
  },
  absentStudents: {
    type: Number,
    default: 0
  },
  lateStudents: {
    type: Number,
    default: 0
  },
  attendanceRecords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance'
  }],
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for faster queries
attendanceSessionSchema.index({ courseId: 1, date: 1 });
attendanceSessionSchema.index({ facultyId: 1 });
attendanceSessionSchema.index({ isActive: 1 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);