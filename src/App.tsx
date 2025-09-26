import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { RoleSelector } from './components/auth/RoleSelector';
import { LoginPage } from './components/auth/LoginPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { FacultyDashboard } from './components/dashboard/FacultyDashboard';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { StudentRegistration } from './components/students/StudentRegistration';
import { TakeAttendancePage } from './components/faculty/TakeAttendancePage'; // New component
import { UsersPage } from './components/admin/UsersPage';
import { CoursesPage } from './components/admin/CoursesPage';
import { ReportsPage } from './components/admin/ReportsPage';
import { AuditLogsPage } from './components/admin/AuditLogsPage';
import { SettingsPage } from './components/admin/SettingsPage';
import { AttendanceSessionsPage } from './components/faculty/AttendanceSessionsPage';
import { StudentManagementPage } from './components/faculty/StudentManagementPage';
import { MyProfilePage } from './components/student/MyProfilePage';
import { MyAttendanceHistoryPage } from './components/student/MyAttendanceHistoryPage';

function App() {
  const { isAuthenticated, user, loading, refreshProfile } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'faculty' | 'student' | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
    }
  }, [isAuthenticated]);
  
  const handleNavigation = (page: string) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (!selectedRole) {
      return <RoleSelector onRoleSelect={setSelectedRole} />;
    }
    return <LoginPage role={selectedRole} onRoleSwitch={() => setSelectedRole(null)} />;
  }

  const renderMainContent = () => {
    if (!user) return null;

    switch (currentPage) {
      case 'dashboard':
        if (user.role === 'admin') return <AdminDashboard onNavigate={handleNavigation} />;
        if (user.role === 'faculty') return <FacultyDashboard onNavigate={handleNavigation} />;
        if (user.role === 'student') return <StudentDashboard />;
        return <div>Dashboard</div>;

      // Admin Pages
      case 'users': return user.role === 'admin' ? <UsersPage /> : null;
      case 'courses': return user.role === 'admin' ? <CoursesPage /> : null;
      case 'reports': return (user.role === 'admin' || user.role === 'faculty') ? <ReportsPage /> : null;
      case 'audit': return user.role === 'admin' ? <AuditLogsPage /> : null;
      case 'settings': return user.role === 'admin' ? <SettingsPage /> : null;
      
      // Faculty Pages
      case 'students': return user.role === 'faculty' ? <StudentManagementPage onNavigate={handleNavigation} /> : null;
      case 'student-registration': return (user.role === 'admin' || user.role === 'faculty') ? <StudentRegistration onNavigate={handleNavigation} /> : null;
      case 'attendance': return user.role === 'faculty' ? <TakeAttendancePage /> : null;
      case 'sessions': return user.role === 'faculty' ? <AttendanceSessionsPage /> : null;

      // Student Pages
      case 'profile': return user.role === 'student' ? <MyProfilePage /> : null;
      case 'attendance-history': return user.role === 'student' ? <MyAttendanceHistoryPage /> : null;

      default: return <div>Page not found</div>;
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

