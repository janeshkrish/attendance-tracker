import React from 'react';
import { Shield, User, GraduationCap } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export function RoleSelector({ onRoleSelect }) {
  const roles = [
    {
      id: 'admin',
      title: 'Administrator',
      description: 'System management and configuration',
      icon: <Shield className="h-12 w-12 text-white" />,
      color: 'from-red-500 to-pink-600',
      features: ['User Management', 'System Settings', 'Audit Logs', 'Reports'],
    },
    {
      id: 'faculty',
      title: 'Faculty',
      description: 'Course and attendance management',
      icon: <User className="h-12 w-12 text-white" />,
      color: 'from-blue-500 to-indigo-600',
      features: ['Take Attendance', 'Manage Students', 'Generate Reports', 'Course Management'],
    },
    {
      id: 'student',
      title: 'Student',
      description: 'View attendance and profile',
      icon: <GraduationCap className="h-12 w-12 text-white" />,
      color: 'from-green-500 to-teal-600',
      features: ['View Attendance', 'Update Profile', 'Download Reports', 'Academic History'],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">SmartAttendance Pro</h1>
          <p className="text-xl text-gray-600">Choose your portal to continue</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {roles.map((role) => (
            <Card key={role.id} variant="elevated" padding="none" className="group hover:scale-105 transition-transform duration-300">
              <div className="p-8 text-center">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r ${role.color} shadow-lg mb-6 group-hover:shadow-xl transition-shadow duration-300`}>
                  {role.icon}
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{role.title}</h3>
                <p className="text-gray-600 mb-6">{role.description}</p>
                
                <div className="space-y-2 mb-8">
                  {role.features.map((feature, index) => (
                    <div key={index} className="flex items-center justify-center text-sm text-gray-500">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => onRoleSelect(role.id)}
                  fullWidth
                  size="lg"
                  className={`bg-gradient-to-r ${role.color} hover:shadow-lg transition-shadow duration-300`}
                >
                  Continue as {role.title}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-500">
            Secure, AI-powered attendance tracking system with real-time face recognition
          </p>
        </div>
      </div>
    </div>
  );
}