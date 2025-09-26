import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { User, Mail, BookOpen, Smartphone, Edit, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

export function MyProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [studentData, setStudentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchStudentProfile(user._id);
    }
  }, [user]);

  const fetchStudentProfile = async (userId: string) => {
    setIsLoading(true);
    setError('');
    try {
      // Assuming a /students/profile endpoint or fetching via userId if it's the student themselves
      // For now, let's use the existing /students/:id route, assuming current user can access their own student profile
      const response = await apiService.get(`/students/${user?.studentData?._id}`);
      setStudentData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student profile.');
      console.error('Fetch student profile error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStudentData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      await apiService.put(`/students/${studentData._id}`, {
        name: studentData.name,
        email: studentData.email,
        phoneNumber: studentData.phoneNumber,
        course: studentData.course,
        department: studentData.department,
        semester: studentData.semester,
      });
      // Also update the main user profile if name/email changed
      await apiService.updateProfile({ name: studentData.name, email: studentData.email });
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      refreshProfile(); // Refresh auth context user data
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
      console.error('Update profile error:', err);
    } finally {
      setIsSaving(false);
    }
  };
  const [isSaving, setIsSaving] = useState(false);


  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Student profile not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">Manage your personal and academic information.</p>
        </div>
        <Button variant={isEditing ? "danger" : "primary"} onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? <XCircle className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
          {isEditing ? 'Cancel Edit' : 'Edit Profile'}
        </Button>
      </div>

      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Student Information</h3>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-green-600 text-sm">{successMessage}</p>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          <Input
            label="Student ID"
            name="studentId"
            value={studentData.studentId}
            icon={<User className="h-5 w-5" />}
            fullWidth
            disabled
          />
          <Input
            label="Full Name"
            name="name"
            value={studentData.name}
            onChange={handleInputChange}
            icon={<User className="h-5 w-5" />}
            fullWidth
            disabled={!isEditing}
          />
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={studentData.email}
            onChange={handleInputChange}
            icon={<Mail className="h-5 w-5" />}
            fullWidth
            disabled={!isEditing}
          />
          <Input
            label="Phone Number"
            name="phoneNumber"
            value={studentData.phoneNumber}
            onChange={handleInputChange}
            icon={<Smartphone className="h-5 w-5" />}
            fullWidth
            disabled={!isEditing}
          />
          <Input
            label="Course/Program"
            name="course"
            value={studentData.course}
            onChange={handleInputChange}
            icon={<BookOpen className="h-5 w-5" />}
            fullWidth
            disabled={!isEditing}
          />
          <Input
            label="Department"
            name="department"
            value={studentData.department}
            onChange={handleInputChange}
            fullWidth
            disabled={!isEditing}
          />
          <Input
            label="Semester"
            name="semester"
            value={studentData.semester}
            onChange={handleInputChange}
            fullWidth
            disabled={!isEditing}
          />
          {/* Add profile image display and upload if desired */}
        </div>
        {isEditing && (
          <Button onClick={handleUpdateProfile} isLoading={isSaving} fullWidth className="mt-6">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        )}
      </Card>

      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Enrolled Courses</h3>
        {studentData.enrolledCourses && studentData.enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentData.enrolledCourses.map((course: any) => (
              <div key={course._id} className="p-4 border border-gray-200 rounded-lg">
                <p className="font-medium text-gray-900">{course.courseName} ({course.courseCode})</p>
                <p className="text-sm text-gray-600">Department: {course.department}</p>
                <p className="text-sm text-gray-600">Semester: {course.semester}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Not enrolled in any courses yet.</p>
        )}
      </Card>
    </div>
  );
}
