import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { RoleSelector } from './components/auth/RoleSelector';
import { LoginPage } from './components/auth/LoginPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { FacultyDashboard } from './components/dashboard/FacultyDashboard';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { StudentRegistration } from './components/students/StudentRegistration';
import { CameraCapture } from './components/attendance/CameraCapture';

function App() {
  const { isAuthenticated, user, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication flow if not authenticated
  if (!isAuthenticated) {
    if (!selectedRole) {
      return <RoleSelector onRoleSelect={setSelectedRole} />;
    }

    return (
      <LoginPage
        role={selectedRole}
        onRoleSwitch={() => setSelectedRole(null)}
      />
    );
  }

  // Render main application for authenticated users
  const renderMainContent = () => {
    switch (currentPage) {
      case 'dashboard':
        if (user?.role === 'admin') return <AdminDashboard />;
        if (user?.role === 'faculty') return <FacultyDashboard />;
        if (user?.role === 'student') return <StudentDashboard />;
        return <div>Dashboard</div>;
      
      case 'students':
        return <StudentRegistration />;
      
      case 'attendance':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">Live Attendance</h1>
              <p className="text-gray-600">Real-time face recognition attendance tracking</p>
            </div>
            <CameraCapture mode="attendance" isActive={true} />
          </div>
        );
      
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
            </h2>
            <p className="text-gray-600">This feature is coming soon!</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <Navbar />
      <div className="flex">
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
        <main className="flex-1 ml-64 p-8 pt-8">
          <div className="max-w-7xl mx-auto">
            {renderMainContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;