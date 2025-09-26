import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Camera, PlayCircle } from 'lucide-react';
import { CameraCapture } from '../attendance/CameraCapture';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export function TakeAttendancePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user || user.role !== 'faculty') return;
      setIsLoading(true);
      try {
        const response = await apiService.getCourses();
        setCourses(response.courses);
      } catch (err) {
        setError('Failed to fetch your courses.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

  const handleStartSession = async () => {
    if (!selectedCourseId) {
      setError('Please select a course to start a session.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const response = await apiService.startAttendanceSession({ courseId: selectedCourseId });
      setActiveSession(response.session);
    } catch (err: any) {
      setError(err.message || 'Failed to start session.');
    } finally {
      setIsLoading(false);
    }
  };

  if (activeSession) {
    const course = courses.find(c => c._id === activeSession.courseId);
    return (
      <CameraCapture
        mode="attendance"
        isActive={true}
        sessionId={activeSession._id}
        courseName={course?.courseName}
        onSessionEnd={() => setActiveSession(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Take Attendance</h1>
        <Card variant="elevated" padding="lg">
            <h3 className="text-xl font-semibold mb-4">Start a New Session</h3>
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
            
            <div className="mb-4">
                <label htmlFor="courseSelect" className="block text-sm font-medium text-gray-700 mb-1">Select Course</label>
                <select
                    id="courseSelect"
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    disabled={isLoading}
                >
                    <option value="">-- Choose a Course --</option>
                    {courses.map(course => (
                        <option key={course._id} value={course._id}>{course.courseName} ({course.courseCode})</option>
                    ))}
                </select>
            </div>
            
            <Button onClick={handleStartSession} isLoading={isLoading} disabled={!selectedCourseId || isLoading}>
                <PlayCircle className="mr-2" />
                {isLoading ? 'Starting...' : 'Start Live Session'}
            </Button>
        </Card>
    </div>
  );
}

