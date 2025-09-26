import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';
import type { User } from '../types';

// Define the shape of the authentication state
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
}

// Define the shape of the context value
interface AuthContextType extends AuthState {
  login: (credentials: any) => Promise<any>;
  register: (userData: any) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshProfile: () => Promise<any>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
  });

  useEffect(() => {
    // Check for stored auth data on mount
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        apiService.setToken(token);
        setState({
          isAuthenticated: true,
          user,
          token,
          loading: false,
        });
        
        // Verify token is still valid
        apiService.getProfile()
          .then(profile => {
            setState(prev => ({ ...prev, user: profile }));
            localStorage.setItem('userData', JSON.stringify(profile));
          })
          .catch(() => {
            // Token is invalid, clear auth data
            logout();
          });
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        setState(prev => ({ ...prev, loading: false }));
      }
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const login = async (credentials: any) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const response = await apiService.login(credentials);
      
      const userData = response.user;
      const token = response.token;
      
      // Store auth data
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      
      apiService.setToken(token);

      setState({
        isAuthenticated: true,
        user: userData,
        token,
        loading: false,
      });

      return response;
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const response = await apiService.register(userData);
      
      const user = response.user;
      const token = response.token;
      
      // Store auth data
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(user));

      apiService.setToken(token);
      
      setState({
        isAuthenticated: true,
        user,
        token,
        loading: false,
      });

      return response;
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      apiService.setToken(null);
      setState({
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
      });
    }
  };

  const updateUser = (user: User) => {
    setState(prev => ({ ...prev, user }));
    localStorage.setItem('userData', JSON.stringify(user));
  };

  const refreshProfile = async () => {
    try {
      const profile = await apiService.getProfile();
      updateUser(profile);
      return profile;
    } catch (error) {
      console.error('Profile refresh error:', error);
      // It might be beneficial to logout if profile refresh fails
      logout(); 
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}