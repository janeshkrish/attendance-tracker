import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [state, setState] = useState({
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

  const login = async (credentials) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const response = await apiService.login(credentials);
      
      const userData = response.user;
      const token = response.token;
      
      // Store auth data
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      
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

  const register = async (userData) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const response = await apiService.register(userData);
      
      const user = response.user;
      const token = response.token;
      
      // Store auth data
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(user));
      
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
      setState({
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
      });
    }
  };

  const updateUser = (user) => {
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
      throw error;
    }
  };

  const value = {
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