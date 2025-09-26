import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { PlusCircle, Trash2 } from 'lucide-react';
import apiService from '../../services/api';

interface StudentManagementPageProps {
  onNavigate: (page: string) => void;
}

export function StudentManagementPage({ onNavigate }: StudentManagementPageProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await apiService.getStudents();
        setStudents(response.students);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch students.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await apiService.deleteStudent(studentId);
      setStudents(students.filter(s => s._id !== studentId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete student.');
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading students...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Student Management</h1>
        <Button variant="primary" onClick={() => onNavigate('student-registration')}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Register New Student
        </Button>
      </div>
      
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}

      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-semibold mb-6">Enrolled Students</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Student ID</th>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {students.map((student) => (
                <tr key={student._id}>
                  <td className="px-6 py-4">{student.studentId}</td>
                  <td className="px-6 py-4">{student.name}</td>
                  <td className="px-6 py-4">{student.email}</td>
                  <td className="px-6 py-4">
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteStudent(student._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

