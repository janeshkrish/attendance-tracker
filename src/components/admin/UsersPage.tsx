import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { User, PlusCircle, Trash2, Edit, X } from 'lucide-react';
import { Input } from '../ui/Input';
import apiService from '../../services/api';

// Modal component for adding a new user
const AddUserModal = ({ isOpen, onClose, onUserAdded }: { isOpen: boolean, onClose: () => void, onUserAdded: () => void }) => {
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'faculty', // Default to faculty
    facultyId: '', // Specific to faculty
    department: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewUserData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateUser = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (newUserData.role === 'faculty') {
        await apiService.createFaculty({
            name: newUserData.name,
            email: newUserData.email,
            username: newUserData.username,
            password: newUserData.password,
            facultyId: newUserData.facultyId,
            department: newUserData.department,
        });
      } else {
        // Add logic for other roles if needed
        await apiService.register(newUserData);
      }
      onUserAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <Card variant="elevated" padding="lg" className="w-full max-w-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Add New User</h3>
          <Button variant="ghost" size="sm" onClick={onClose}><X /></Button>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="space-y-4">
          <Input label="Full Name" name="name" value={newUserData.name} onChange={handleInputChange} />
          <Input label="Email" name="email" type="email" value={newUserData.email} onChange={handleInputChange} />
          <Input label="Username" name="username" value={newUserData.username} onChange={handleInputChange} />
          <Input label="Password" name="password" type="password" value={newUserData.password} onChange={handleInputChange} />
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select name="role" value={newUserData.role} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {newUserData.role === 'faculty' && (
            <>
              <Input label="Faculty ID" name="facultyId" value={newUserData.facultyId} onChange={handleInputChange} />
              <Input label="Department" name="department" value={newUserData.department} onChange={handleInputChange} />
            </>
          )}
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreateUser} isLoading={isLoading}>Create User</Button>
        </div>
      </Card>
    </div>
  );
};


export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiService.get('/users');
      setUsers(response.users);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users.');
      console.error('Fetch users error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This will deactivate their account.')) return;
    try {
      await apiService.delete(`/users/${userId}`);
      fetchUsers(); // Refresh list
    } catch (err: any) {
      setError(err.message || 'Failed to delete user.');
    }
  };

  if (isLoading) return <div className="text-center py-8">Loading users...</div>;

  return (
    <div className="space-y-8">
        <AddUserModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onUserAdded={fetchUsers} 
        />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">View and manage all system users.</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New User
        </Button>
      </div>

      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">All Users</h3>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-900 mr-2" onClick={() => alert(`Editing ${user.name}`)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900" onClick={() => handleDeleteUser(user._id)}>
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
