'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type UserRole = 'sales_rep' | 'sales_manager' | 'enablement_manager' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  team?: string;
  department?: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  preferences: {
    notifications: boolean;
    theme: 'light' | 'dark';
    language: string;
  };
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock user data for demonstration
  const mockUsers: { [email: string]: User & { password: string } } = {
    'sarah@company.com': {
      id: '1',
      email: 'sarah@company.com',
      password: 'demo123',
      firstName: 'Sarah',
      lastName: 'Wilson',
      role: 'sales_rep',
      team: 'SDR Team A',
      department: 'Sales',
      avatar: undefined,
      isActive: true,
      lastLogin: new Date(),
      preferences: {
        notifications: true,
        theme: 'light',
        language: 'en'
      },
      permissions: ['view_scenarios', 'practice_scenarios', 'view_analytics']
    },
    'mike@company.com': {
      id: '2',
      email: 'mike@company.com',
      password: 'demo123',
      firstName: 'Mike',
      lastName: 'Johnson',
      role: 'sales_manager',
      team: 'West Coast Sales',
      department: 'Sales',
      avatar: undefined,
      isActive: true,
      lastLogin: new Date(),
      preferences: {
        notifications: true,
        theme: 'light',
        language: 'en'
      },
      permissions: [
        'view_scenarios', 'practice_scenarios', 'view_analytics',
        'view_team_analytics', 'manage_team', 'assign_scenarios'
      ]
    },
    'emma@company.com': {
      id: '3',
      email: 'emma@company.com',
      password: 'demo123',
      firstName: 'Emma',
      lastName: 'Davis',
      role: 'enablement_manager',
      team: 'Sales Enablement',
      department: 'Sales',
      avatar: undefined,
      isActive: true,
      lastLogin: new Date(),
      preferences: {
        notifications: true,
        theme: 'light',
        language: 'en'
      },
      permissions: [
        'view_scenarios', 'practice_scenarios', 'view_analytics',
        'view_team_analytics', 'create_scenarios', 'manage_content',
        'view_all_analytics', 'manage_users'
      ]
    },
    'admin@company.com': {
      id: '4',
      email: 'admin@company.com',
      password: 'admin123',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      team: 'IT',
      department: 'Technology',
      avatar: undefined,
      isActive: true,
      lastLogin: new Date(),
      preferences: {
        notifications: true,
        theme: 'light',
        language: 'en'
      },
      permissions: [
        'view_scenarios', 'practice_scenarios', 'view_analytics',
        'view_team_analytics', 'create_scenarios', 'manage_content',
        'view_all_analytics', 'manage_users', 'system_admin',
        'manage_billing', 'view_system_logs'
      ]
    }
  };

  useEffect(() => {
    // Check for stored auth token on app load
    const checkAuthState = async () => {
      try {
        const storedUser = localStorage.getItem('voice_trainer_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // In a real app, you'd validate the token with the server
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        localStorage.removeItem('voice_trainer_user');
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser = mockUsers[email.toLowerCase()];
      if (mockUser && mockUser.password === password) {
        const { password: _, ...userWithoutPassword } = mockUser;
        setUser(userWithoutPassword);
        localStorage.setItem('voice_trainer_user', JSON.stringify(userWithoutPassword));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('voice_trainer_user');
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission) || false;
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const updateUser = async (updates: Partial<User>): Promise<void> => {
    if (!user) return;
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('voice_trainer_user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    hasRole,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Login Form Component
interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        onSuccess();
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lightest-purple flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 border border-class-light-purple">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-class-purple mb-2">Voice Sales Trainer</h1>
          <div className="text-sm text-dark-gray mb-4">by Class</div>
          <p className="text-midnight-blue">Sign in to access your training platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-midnight-blue mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="your@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-midnight-blue mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-class-light-purple">
          <div className="text-sm text-dark-gray">
            <p className="font-bold text-class-purple mb-2">Demo Accounts:</p>
            <div className="space-y-1 text-xs">
              <p><strong>Sales Rep:</strong> sarah@company.com / demo123</p>
              <p><strong>Manager:</strong> mike@company.com / demo123</p>
              <p><strong>Enablement:</strong> emma@company.com / demo123</p>
              <p><strong>Admin:</strong> admin@company.com / admin123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// User Profile Component
export function UserProfile() {
  const { user, logout, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    preferences: {
      notifications: user?.preferences.notifications || false,
      theme: user?.preferences.theme || 'light',
      language: user?.preferences.language || 'en'
    }
  });

  const handleSave = async () => {
    try {
      await updateUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        preferences: formData.preferences
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  if (!user) return null;

  const roleLabels = {
    sales_rep: 'Sales Representative',
    sales_manager: 'Sales Manager',
    enablement_manager: 'Enablement Manager',
    admin: 'Administrator'
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">User Profile</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{user.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{user.lastName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <p className="text-gray-900">{user.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <p className="text-gray-900">{roleLabels[user.role]}</p>
          </div>

          {user.team && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team
              </label>
              <p className="text-gray-900">{user.team}</p>
            </div>
          )}

          {user.department && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <p className="text-gray-900">{user.department}</p>
            </div>
          )}
        </div>

        {/* Preferences */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Email Notifications
              </label>
              {isEditing ? (
                <input
                  type="checkbox"
                  checked={formData.preferences.notifications}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferences: { ...formData.preferences, notifications: e.target.checked }
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              ) : (
                <span className={`text-sm ${user.preferences.notifications ? 'text-green-600' : 'text-gray-500'}`}>
                  {user.preferences.notifications ? 'Enabled' : 'Disabled'}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Theme
              </label>
              {isEditing ? (
                <select
                  value={formData.preferences.theme}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferences: { ...formData.preferences, theme: e.target.value as 'light' | 'dark' }
                  })}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              ) : (
                <span className="text-sm text-gray-900 capitalize">{user.preferences.theme}</span>
              )}
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Permissions</h3>
          <div className="grid grid-cols-2 gap-2">
            {user.permissions.map((permission) => (
              <span
                key={permission}
                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
              >
                {permission.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 pt-6 flex justify-between">
          {isEditing && (
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Save Changes
            </button>
          )}
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}