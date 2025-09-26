import React, { useState, useEffect } from 'react';
import { Users, BookOpen, UserCheck, Activity } from 'lucide-react';
import { StatCard } from './StatCard';
import { Card } from '../ui/Card';
import apiService from '../../services/api';

export function AdminDashboard() {
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [userStats, courseStats, auditLogs] = await Promise.all([
          apiService.get('/users/stats/overview'),
          apiService.get('/courses'), // Using courses list to get active count
          apiService.get('/audit', { limit: 5 })
        ]);
        
        // This should be a dedicated backend endpoint in a real app
        const attendanceRate = '92.5%'; // Placeholder until backend endpoint is created

        setStats([
          { title: 'Total Users', value: userStats.statistics.total, icon: <Users /> },
          { title: 'Active Courses', value: courseStats.total, icon: <BookOpen /> },
          { title: 'Attendance Rate', value: attendanceRate, icon: <UserCheck /> },
          { title: 'System Uptime', value: '99.9%', icon: <Activity /> },
        ]);

        setRecentActivities(auditLogs.logs);
      } catch (error) {
        console.error("Failed to fetch admin dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <div className="text-center p-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card variant="elevated" padding="lg" className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">System Health</h3>
          <div className="space-y-4">
            {/* System health data would come from a dedicated health-check endpoint */}
            <p>Database Performance: <span className="font-semibold text-green-600">Optimal</span></p>
            <p>Server Load: <span className="font-semibold text-green-600">Normal</span></p>
            <p>Face Recognition Service: <span className="font-semibold text-green-600">Operational</span></p>
          </div>
        </Card>
        <Card variant="elevated" padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activities</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity._id} className="text-sm">
                <p><span className="font-semibold">{activity.userId.name}</span> {activity.action.toLowerCase()}d a {activity.resource.toLowerCase()}</p>
                <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
