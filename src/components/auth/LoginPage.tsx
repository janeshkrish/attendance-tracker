import React, { useState } from 'react';
import { Camera, Lock, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface LoginPageProps {
  role: 'admin' | 'faculty' | 'student';
  onRoleSwitch: () => void;
}

export function LoginPage({ role, onRoleSwitch }: LoginPageProps) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login({ ...credentials, role });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roleInfo = {
    admin: { title: 'Administrator Login', subtitle: 'Access system management', color: 'from-red-500 to-pink-600' },
    faculty: { title: 'Faculty Login', subtitle: 'Manage courses and attendance', color: 'from-blue-500 to-indigo-600' },
    student: { title: 'Student Login', subtitle: 'View your attendance and profile', color: 'from-green-500 to-teal-600' },
  }[role];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${roleInfo.color} shadow-lg mb-4`}>
            <Camera className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">SmartAttendance Pro</h2>
          <h3 className="text-xl font-semibold text-gray-800">{roleInfo.title}</h3>
          <p className="text-gray-600">{roleInfo.subtitle}</p>
        </div>

        <Card variant="elevated" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="text"
              label="Username"
              placeholder="Enter your username"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              icon={<User className="h-5 w-5" />}
              fullWidth
              required
            />
            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              icon={<Lock className="h-5 w-5" />}
              fullWidth
              required
            />
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <Button type="submit" fullWidth size="lg" isLoading={isLoading} className={`bg-gradient-to-r ${roleInfo.color}`}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <Button variant="outline" onClick={onRoleSwitch} fullWidth>
            Switch Login Type
          </Button>
        </div>
      </div>
    </div>
  );
}

