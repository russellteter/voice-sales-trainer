'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, handleApiError, isAuthError } from '../lib/api';
import { User, LoginRequest, RegisterRequest } from '../types/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    setIsLoading(true);
    
    try {
      // Try to get current user if token exists
      const response = await authApi.getCurrentUser();
      
      if (response.data) {
        setUser(response.data);
      } else if (response.error && isAuthError(response.status)) {
        // Token expired or invalid, clear it
        authApi.logout();
        setUser(null);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      authApi.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    try {
      const response = await authApi.login(credentials);
      
      if (response.data) {
        setUser(response.data.user);
        return { success: true };
      } else if (response.error) {
        return { 
          success: false, 
          error: handleApiError(response.error)
        };
      }
      
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    try {
      const response = await authApi.register(userData);
      
      if (response.data) {
        // After successful registration, user might need to verify email
        // For now, we'll automatically log them in
        const loginResponse = await authApi.login({
          username: userData.username,
          password: userData.password,
        });
        
        if (loginResponse.data) {
          setUser(loginResponse.data.user);
          return { success: true };
        }
        
        return { success: true }; // Registration successful but login failed
      } else if (response.error) {
        return { 
          success: false, 
          error: handleApiError(response.error)
        };
      }
      
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getCurrentUser();
      
      if (response.data) {
        setUser(response.data);
      } else if (response.error && isAuthError(response.status)) {
        // Token expired, log out
        logout();
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
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

// Higher-order component for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
              Authentication Required
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Please log in to access this page.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.href = '/login'}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Go to Login
              </button>
              <button 
                onClick={() => window.location.href = '/register'}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition duration-200"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Hook for checking authentication status
export function useAuthCheck() {
  const { isAuthenticated, isLoading } = useAuth();
  
  return {
    isAuthenticated,
    isLoading,
    requireAuth: !isLoading && !isAuthenticated,
  };
}

// Hook for user permissions
export function useUserPermissions() {
  const { user } = useAuth();
  
  return {
    isAdmin: user?.role === 'admin',
    isTrainer: user?.role === 'trainer' || user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
    canAccessScenario: (difficulty: string) => {
      if (!user) return false;
      if (user.role === 'admin' || user.role === 'trainer') return true;
      
      // Experience level restrictions
      if (user.experience_level === 'Beginner' && difficulty === 'Advanced') {
        return false;
      }
      
      return true;
    },
    canEditScenarios: user?.role === 'admin' || user?.role === 'trainer',
    canViewAnalytics: user?.role === 'admin' || user?.role === 'manager',
  };
}