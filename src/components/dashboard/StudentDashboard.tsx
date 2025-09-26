import React, { useState, useEffect } from 'react';
import { BookOpen, UserCheck, Calendar, Award } from 'lucide-react';
import { StatCard } from './StatCard';
import { Card } from '../ui/Card';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export function StudentDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<any[]>([]);
    const [courseAttendance, setCourseAttendance] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user || !(user as any).studentData) return;
            setIsLoading(true);
            try {
                const studentId = (user as any).studentData._id;
                const attendanceResponse = await apiService.getStudentAttendance(studentId);
                const enrolledCourses = (user as any).studentData.enrolledCourses || [];

                setStats([
                    { title: 'Enrolled Courses', value: enrolledCourses.length, icon: <BookOpen /> },
                    { title: 'Overall Attendance', value: `${attendanceResponse.statistics.attendancePercentage}%`, icon: <UserCheck /> },
                    { title: 'Classes Attended', value: attendanceResponse.statistics.present, icon: <Calendar /> },
                    { title: 'Classes Missed', value: attendanceResponse.statistics.absent, icon: <Award /> },
                ]);
                
                // Calculate attendance per course
                const attendanceByCourse = enrolledCourses.map((course: any) => {
                    const courseRecords = attendanceResponse.records.filter((r: any) => r.courseId._id === course._id);
                    const presentCount = courseRecords.filter((r: any) => r.status === 'present').length;
                    const totalCount = courseRecords.length;
                    const percentage = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(0) : 0;
                    return {
                        course: course.courseName,
                        attendance: percentage,
                        present: presentCount,
                        total: totalCount,
                    };
                });
                setCourseAttendance(attendanceByCourse);

            } catch (error) {
                console.error("Failed to fetch student dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, [user]);

    if (isLoading) {
        return <div className="text-center p-8">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <StatCard key={index} {...stat} />
                ))}
            </div>
            <Card variant="elevated" padding="lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Course-wise Attendance</h3>
                <div className="space-y-4">
                    {courseAttendance.map((course, index) => (
                        <div key={index} className="p-4 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{course.course}</h4>
                                <span className="font-bold">{course.attendance}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${course.attendance}%` }}></div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{course.present} / {course.total} classes attended</p>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
