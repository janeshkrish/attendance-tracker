import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RefreshCw, PauseCircle, Eye } from 'lucide-react';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export function AttendanceSessionsPage() {
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSessions = async () => {
    if (!user || !(user as any).facultyData) return;
    setIsLoading(true);
    setError('');
    try {
      const allSessions = await apiService.get('/attendance/sessions/history'); // Assuming an endpoint to get all sessions for faculty
      setActiveSessions(allSessions.filter((s: any) => s.isActive));
      setPastSessions(allSessions.filter((s: any) => !s.isActive));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const handleEndSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to end this session?')) return;
    try {
      await apiService.endAttendanceSession(sessionId);
      fetchSessions();
    } catch (err: any) {
      setError(err.message || 'Failed to end session.');
    }
  };

  if (isLoading) return <div className="text-center p-8">Loading sessions...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Attendance Sessions</h1>
        <Button variant="outline" onClick={fetchSessions}><RefreshCw className="mr-2" /> Refresh</Button>
      </div>
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      
      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-semibold mb-4">Active Sessions</h3>
        {activeSessions.length > 0 ? (
          activeSessions.map(session => (
            <div key={session._id} className="p-4 border rounded-md flex justify-between items-center">
              <div>
                <p className="font-bold">{session.courseId?.courseName}</p>
                <p className="text-sm text-gray-500">{new Date(session.startTime).toLocaleString()}</p>
              </div>
              <Button size="sm" variant="danger" onClick={() => handleEndSession(session._id)}><PauseCircle className="mr-2" />End</Button>
            </div>
          ))
        ) : <p>No active sessions.</p>}
      </Card>

      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-semibold mb-4">Past Sessions</h3>
        {pastSessions.map(session => (
          <div key={session._id} className="p-4 border rounded-md mb-2 flex justify-between items-center">
            <div>
              <p className="font-bold">{session.courseId?.courseName}</p>
              <p className="text-sm text-gray-500">Ended at: {new Date(session.endTime).toLocaleString()}</p>
            </div>
            <Button size="sm" variant="outline"><Eye className="mr-2" />View Details</Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
