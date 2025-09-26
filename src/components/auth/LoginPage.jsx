import React, { useState } from 'react';
import { Camera, Lock, User, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

export function LoginPage({ role, onRoleSwitch }) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login({
        ...credentials,
        role,
      });
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleInfo = () => {
    switch (role) {
      case 'admin':
        return {
          title: 'Administrator Login',
          subtitle: 'Access system management and configuration',
          color: 'from-red-500 to-pink-600',
          icon: <Lock className="h-8 w-8 text-white" />,
        };
      case 'faculty':
        return {
          title: 'Faculty Login',
          subtitle: 'Manage courses and track attendance',
          color: 'from-blue-500 to-indigo-600',
          icon: <User className="h-8 w-8 text-white" />,
        };
      case 'student':
        return {
          title: 'Student Login',
          subtitle: 'View your attendance and profile',
          color: 'from-green-500 to-teal-600',
          icon: <Mail className="h-8 w-8 text-white" />,
        };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${roleInfo.color} shadow-lg mb-4`}>
            <Camera className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">SmartAttendance Pro</h2>
          <h3 className="text-xl font-semibold text-gray-800">{roleInfo.title}</h3>
          <p className="text-gray-600">{roleInfo.subtitle}</p>
        </div>

        {/* Login Form */}
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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
              className={`bg-gradient-to-r ${roleInfo.color}`}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </Card>

        {/* Role Switch */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">Need to access a different portal?</p>
          <Button variant="outline" onClick={onRoleSwitch} fullWidth>
            Switch Login Type
          </Button>
        </div>

        {/* Demo Credentials */}
        <Card variant="glass" padding="md">
          <h4 className="font-semibold text-gray-800 mb-2">Demo Credentials:</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Username:</strong> demo</p>
            <p><strong>Password:</strong> password</p>
          </div>
        </Card>
      </div>
    </div>
  );
}