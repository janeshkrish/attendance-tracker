const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or is inactive.' });
    }

    req.token = token;
    req.user = user;
    
    // Crucial Fix: Attach the specific faculty or student profile to the request object.
    // This makes it available for authorization checks in subsequent routes.
    if (user.role === 'faculty') {
      req.faculty = await Faculty.findOne({ userId: user._id });
    } else if (user.role === 'student') {
      req.student = await Student.findOne({ userId: user._id });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. You do not have sufficient permissions.' });
    }
    next();
  };
};

const auditLog = (action, resource) => {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400 && req.user) {
        AuditLog.create({
          userId: req.user._id,
          action,
          resource,
          resourceId: req.params.id || req.body._id,
          details: {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        }).catch(err => console.error('Audit logging failed:', err));
      }
    });
    next();
  };
};

module.exports = { auth, authorize, auditLog };

