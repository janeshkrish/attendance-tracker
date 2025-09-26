import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Camera, 
  BarChart3, 
  Settings, 
  UserCheck,
  FileSpreadsheet,
  Shield,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const { user } = useAuth();

  const getNavigationItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ];

    switch (user?.role) {
      case 'admin':
        return [
          ...baseItems,
          { id: 'users', label: 'User Management', icon: Users },
          { id: 'courses', label: 'Course Management', icon: BookOpen },
          { id: 'reports', label: 'System Reports', icon: BarChart3 },
          { id: 'audit', label: 'Audit Logs', icon: Shield },
          { id: 'settings', label: 'Settings', icon: Settings },
        ];
      case 'faculty':
        return [
          ...baseItems,
          { id: 'students', label: 'Student Management', icon: GraduationCap },
          { id: 'attendance', label: 'Take Attendance', icon: Camera },
          { id: 'sessions', label: 'Attendance Sessions', icon: UserCheck },
          { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
        ];
      case 'student':
        return [
          ...baseItems,
          { id: 'profile', label: 'My Profile', icon: Users },
          { id: 'attendance-history', label: 'My Attendance', icon: UserCheck },
        ];
      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="bg-white/95 backdrop-blur-md border-r border-gray-200 h-full w-64 fixed left-0 top-16 bottom-0 overflow-y-auto">
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={clsx(
                'w-full flex items-center px-4 py-3 rounded-lg text-left transition-all duration-200',
                currentPage === item.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="h-5 w-5 mr-3" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}