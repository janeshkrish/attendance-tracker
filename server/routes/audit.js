const express = require('express');
const AuditLog = require('../models/AuditLog');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get audit logs (Admin only)
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      userId, 
      action, 
      resource, 
      severity,
      startDate,
      endDate 
    } = req.query;
    
    let query = {};
    
    if (userId) query.userId = userId;
    if (action) query.action = { $regex: action, $options: 'i' };
    if (resource) query.resource = { $regex: resource, $options: 'i' };
    if (severity) query.severity = severity;
    
    if (startDate && endDate) {
      query.timestamp = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }

    const auditLogs = await AuditLog.find(query)
      .populate('userId', 'name username email role')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ timestamp: -1 });

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs: auditLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs', error: error.message });
  }
});

// Get audit log statistics
router.get('/stats', auth, authorize('admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const totalLogs = await AuditLog.countDocuments({
      timestamp: { $gte: startDate }
    });

    const logsByAction = await AuditLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const logsBySeverity = await AuditLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const logsByResource = await AuditLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: { _id: '$resource', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const recentCriticalLogs = await AuditLog.find({
      severity: 'critical',
      timestamp: { $gte: startDate }
    })
    .populate('userId', 'name username')
    .sort({ timestamp: -1 })
    .limit(5);

    res.json({
      statistics: {
        totalLogs,
        period: `${days} days`,
        logsByAction,
        logsBySeverity,
        logsByResource
      },
      recentCriticalLogs
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ message: 'Failed to fetch audit statistics', error: error.message });
  }
});

// Get audit log by ID
router.get('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const auditLog = await AuditLog.findById(req.params.id)
      .populate('userId', 'name username email role');

    if (!auditLog) {
      return res.status(404).json({ message: 'Audit log not found' });
    }

    res.json(auditLog);
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ message: 'Failed to fetch audit log', error: error.message });
  }
});

module.exports = router;