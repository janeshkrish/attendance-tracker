import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

export function MyAttendanceHistoryPage() {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    courseId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    // Safely access studentId from the user object, which might be nested.
    const studentId = (user as any)?.studentData?._id;
    if (studentId) {
      fetchMyAttendance(studentId);
    } else {
        // If studentData is not yet loaded or user is not a student, stop loading.
        setIsLoading(false); 
    }
  }, [user, filters]);

  const fetchMyAttendance = async (studentId: string) => {
    setIsLoading(true);
    setError('');
    try {
      // Build query parameters correctly, only including filters that have a value.
      const params = new URLSearchParams();
      if (filters.courseId) params.append('courseId', filters.courseId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await apiService.getStudentAttendance(studentId, params);
      setAttendanceRecords(response.records);
      setAttendanceStats(response.statistics);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance history.');
      console.error('Fetch attendance history error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'absent': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'late': return <Clock className="h-5 w-5 text-yellow-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
        <p className="text-gray-600">Loading your attendance history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Attendance History</h1>
          <p className="text-gray-600">View your attendance records and statistics.</p>
        </div>
      </div>

      {attendanceStats && (
        <Card variant="elevated" padding="lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Attendance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Classes</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceStats.totalClasses}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-700">{attendanceStats.present}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-700">{attendanceStats.absent}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-purple-700">{attendanceStats.attendancePercentage}%</p>
            </div>
          </div>
        </Card>
      )}

      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Filter Records</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              id="courseId"
              name="courseId"
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={filters.courseId}
              onChange={handleFilterChange}
            >
              <option value="">All Courses</option>
              {(user as any)?.studentData?.enrolledCourses?.map((course: any) => (
                <option key={course._id} value={course._id}>{course.courseName}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>
        </div>
      </Card>

      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Detailed Records</h3>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        {attendanceRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceRecords.map((record) => (
                  <tr key={record._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.courseId?.courseName || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
                        {record.status} {getStatusIcon(record.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(record.timestamp).toLocaleTimeString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.recognitionMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No attendance records found for the selected filters.</p>
        )}
      </Card>
    </div>
  );
}

