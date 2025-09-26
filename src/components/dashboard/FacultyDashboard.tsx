import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Calendar, BookOpen, Camera } from 'lucide-react';
import { StatCard } from './StatCard';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface FacultyDashboardProps {
  onNavigate: (page: string) => void;
}

export function FacultyDashboard({ onNavigate }: FacultyDashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [coursesResponse, userStats] = await Promise.all([
          apiService.getCourses(),
          apiService.get('/users/stats/overview'), 
        ]);
        
        setCourses(coursesResponse.courses);
        setStats({
          courses: coursesResponse.total,
          students: coursesResponse.courses.reduce((sum: number, c: any) => sum + (c.enrolledStudents?.length || 0), 0)
        });

      } catch (error) {
        console.error("Failed to fetch faculty dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  const handleStartAttendance = (course: { _id: string, courseName: string }) => {
    // Store course info in sessionStorage for the attendance page
    sessionStorage.setItem('selectedCourse', JSON.stringify(course));
    onNavigate('attendance');
  };
  if (isLoading) return <div className="text-center p-8">Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Faculty Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="My Courses" value={stats.courses || 0} icon={<BookOpen />} />
        <StatCard title="Total Students" value={stats.students || 0} icon={<Users />} />
        <StatCard title="Avg. Attendance" value="N/A" icon={<UserCheck />} />
        <StatCard title="Classes Today" value={courses.length} icon={<Calendar />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card variant="elevated" padding="lg" className="lg:col-span-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">My Courses</h3>
          <div className="space-y-4">
            {courses.length > 0 ? courses.map((course) => (
              <div key={course._id} className="p-4 rounded-lg border flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{course.courseName} ({course.courseCode})</h4>
                  <p className="text-sm text-gray-500">{course.enrolledStudents?.length || 0} students</p>
                </div>
                <Button variant="primary" size="sm" onClick={() => handleStartAttendance(course)}>
                  <Camera className="h-4 w-4 mr-1" />
                  Start Session
                </Button>
              </div>
            )) : <p>You have no courses assigned.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

