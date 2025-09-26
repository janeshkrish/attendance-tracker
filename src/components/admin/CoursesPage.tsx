import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BookOpen, PlusCircle, Trash2, Edit, X } from 'lucide-react';
import { Input } from '../ui/Input';
import apiService from '../../services/api';

const AddCourseModal = ({ isOpen, onClose, onCourseAdded }: { isOpen: boolean, onClose: () => void, onCourseAdded: () => void }) => {
  const [newCourseData, setNewCourseData] = useState({
    courseId: '',
    courseName: '',
    courseCode: '',
    department: '',
    facultyId: '',
    semester: '',
    credits: 3,
  });
  const [faculties, setFaculties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Fetch faculty list to populate the dropdown
      const fetchFaculties = async () => {
        try {
          const response = await apiService.get('/faculty'); // Assumes an endpoint to get all faculty
          setFaculties(response.faculty);
        } catch (err) {
          console.error("Failed to fetch faculty list", err);
        }
      };
      fetchFaculties();
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewCourseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateCourse = async () => {
    setIsLoading(true);
    setError('');
    try {
      await apiService.createCourse(newCourseData);
      onCourseAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create course.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <Card variant="elevated" padding="lg" className="w-full max-w-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Add New Course</h3>
          <Button variant="ghost" size="sm" onClick={onClose}><X /></Button>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="space-y-4">
          <Input label="Course ID (Unique)" name="courseId" value={newCourseData.courseId} onChange={handleInputChange} />
          <Input label="Course Name" name="courseName" value={newCourseData.courseName} onChange={handleInputChange} />
          <Input label="Course Code" name="courseCode" value={newCourseData.courseCode} onChange={handleInputChange} />
          <Input label="Department" name="department" value={newCourseData.department} onChange={handleInputChange} />
          <Input label="Semester" name="semester" value={newCourseData.semester} onChange={handleInputChange} />
          <Input label="Credits" name="credits" type="number" value={newCourseData.credits} onChange={handleInputChange} />
          <div>
            <label className="block text-sm font-medium text-gray-700">Assign Faculty</label>
            <select name="facultyId" value={newCourseData.facultyId} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
              <option value="">Select Faculty</option>
              {faculties.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreateCourse} isLoading={isLoading}>Create Course</Button>
        </div>
      </Card>
    </div>
  );
};

export function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiService.getCourses();
      setCourses(response.courses);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch courses.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await apiService.deleteCourse(courseId);
      fetchCourses();
    } catch (err: any) {
      setError(err.message || 'Failed to delete course.');
    }
  };

  if (isLoading) return <div className="text-center py-8">Loading courses...</div>;

  return (
    <div className="space-y-8">
      <AddCourseModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCourseAdded={fetchCourses}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Course Management</h1>
          <p className="text-gray-600">Create and manage academic courses.</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Course
        </Button>
      </div>

      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">All Courses</h3>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faculty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrolled</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {courses.map((course) => (
                <tr key={course._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course.courseCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{course.courseName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{course.facultyId?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{course.enrolledStudents.length} / {course.maxCapacity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-900 mr-2" onClick={() => alert(`Editing ${course.courseName}`)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900" onClick={() => handleDeleteCourse(course._id)}>
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
