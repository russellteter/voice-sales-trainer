'use client';

import { useState, useMemo } from 'react';
import { useAuth } from './AuthProvider';
import { TrainingScenario } from './ScenarioDashboard';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  team?: string;
  department?: string;
  isActive: boolean;
  lastLogin?: Date;
  totalSessions: number;
  averageScore: number;
}

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  averageScore: number;
  scenarioUsage: { [key: string]: number };
  monthlyGrowth: number;
}

export default function AdminDashboard() {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'scenarios' | 'users' | 'analytics' | 'settings'>('overview');
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [isCreatingScenario, setIsCreatingScenario] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Check permissions
  if (!hasPermission('system_admin') && !hasPermission('manage_content')) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
      </div>
    );
  }

  // Mock data for demonstration
  const mockUsers: AdminUser[] = [
    {
      id: '1',
      email: 'sarah@company.com',
      firstName: 'Sarah',
      lastName: 'Wilson',
      role: 'sales_rep',
      team: 'SDR Team A',
      department: 'Sales',
      isActive: true,
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
      totalSessions: 24,
      averageScore: 78
    },
    {
      id: '2',
      email: 'mike@company.com',
      firstName: 'Mike',
      lastName: 'Johnson',
      role: 'sales_manager',
      team: 'West Coast Sales',
      department: 'Sales',
      isActive: true,
      lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000),
      totalSessions: 18,
      averageScore: 82
    },
    {
      id: '3',
      email: 'emma@company.com',
      firstName: 'Emma',
      lastName: 'Davis',
      role: 'enablement_manager',
      team: 'Sales Enablement',
      department: 'Sales',
      isActive: true,
      lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000),
      totalSessions: 31,
      averageScore: 85
    }
  ];

  const systemMetrics: SystemMetrics = {
    totalUsers: 156,
    activeUsers: 89,
    totalSessions: 1247,
    averageScore: 79,
    scenarioUsage: {
      'Cold Calling': 342,
      'Objection Handling': 298,
      'Discovery': 267,
      'Closing': 189,
      'Product Demo': 151
    },
    monthlyGrowth: 23.5
  };

  const mockScenarios: TrainingScenario[] = [
    {
      id: '1',
      title: 'Cold Outreach Introduction',
      description: 'Practice introducing yourself and your product to a cold prospect',
      difficulty: 'Beginner',
      category: 'Cold Calling',
      duration: '5-8 minutes',
      objectives: [
        'Deliver compelling value proposition',
        'Build rapport with prospect',
        'Secure next meeting'
      ],
      tags: ['intro', 'rapport', 'value-prop'],
      completionCount: 342,
      averageScore: 78,
      persona: 'SDR/BDR'
    },
    {
      id: '2',
      title: 'Price Objection Mastery',
      description: 'Handle price objections with confidence and value positioning',
      difficulty: 'Intermediate',
      category: 'Objection Handling',
      duration: '10-12 minutes',
      objectives: [
        'Acknowledge price concerns',
        'Reframe to value discussion',
        'Present ROI case'
      ],
      tags: ['price', 'objections', 'roi'],
      completionCount: 298,
      averageScore: 72,
      persona: 'Account Executive'
    }
  ];

  const filteredUsers = useMemo(() => {
    return mockUsers.filter(user =>
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const ScenarioForm = ({ scenario, onSave, onCancel }: { 
    scenario?: TrainingScenario; 
    onSave: (scenario: any) => void; 
    onCancel: () => void; 
  }) => {
    const [formData, setFormData] = useState({
      title: scenario?.title || '',
      description: scenario?.description || '',
      difficulty: scenario?.difficulty || 'Beginner',
      category: scenario?.category || 'Cold Calling',
      duration: scenario?.duration || '5-10 minutes',
      objectives: scenario?.objectives?.join('\n') || '',
      tags: scenario?.tags?.join(', ') || '',
      persona: scenario?.persona || 'SDR/BDR'
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({
        ...formData,
        objectives: formData.objectives.split('\n').filter(obj => obj.trim()),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) => setFormData({...formData, duration: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 5-8 minutes"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Cold Calling">Cold Calling</option>
              <option value="Objection Handling">Objection Handling</option>
              <option value="Discovery">Discovery</option>
              <option value="Closing">Closing</option>
              <option value="Product Demo">Product Demo</option>
              <option value="Negotiation">Negotiation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({...formData, difficulty: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Persona</label>
            <select
              value={formData.persona}
              onChange={(e) => setFormData({...formData, persona: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="SDR/BDR">SDR/BDR</option>
              <option value="Account Executive">Account Executive</option>
              <option value="Sales Manager">Sales Manager</option>
              <option value="Customer Success">Customer Success</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="comma, separated, tags"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Learning Objectives (one per line)
          </label>
          <textarea
            value={formData.objectives}
            onChange={(e) => setFormData({...formData, objectives: e.target.value})}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter each learning objective on a new line"
            required
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            {scenario ? 'Update' : 'Create'} Scenario
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
            <p className="text-purple-100">Manage scenarios, users, and system settings</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-purple-200">Logged in as</div>
            <div className="font-semibold">{user?.firstName} {user?.lastName}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'scenarios', label: 'Scenarios', icon: '🎯' },
            { key: 'users', label: 'Users', icon: '👥' },
            { key: 'analytics', label: 'Analytics', icon: '📈' },
            { key: 'settings', label: 'Settings', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-2 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">Total Users</p>
                    <p className="text-2xl font-bold text-blue-900">{systemMetrics.totalUsers}</p>
                  </div>
                  <div className="text-blue-400 text-3xl">👥</div>
                </div>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium">Active Users</p>
                    <p className="text-2xl font-bold text-green-900">{systemMetrics.activeUsers}</p>
                  </div>
                  <div className="text-green-400 text-3xl">🟢</div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">Total Sessions</p>
                    <p className="text-2xl font-bold text-purple-900">{systemMetrics.totalSessions}</p>
                  </div>
                  <div className="text-purple-400 text-3xl">📊</div>
                </div>
              </div>
              
              <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-600 text-sm font-medium">Avg Score</p>
                    <p className="text-2xl font-bold text-orange-900">{systemMetrics.averageScore}%</p>
                  </div>
                  <div className="text-orange-400 text-3xl">🎯</div>
                </div>
              </div>
            </div>

            {/* Recent Activity & Popular Scenarios */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Recent User Activity</h3>
                <div className="space-y-3">
                  {mockUsers.slice(0, 5).map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div>
                        <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-gray-600">{user.totalSessions} sessions • {user.averageScore}% avg</p>
                      </div>
                      <span className="text-sm text-gray-500">{formatTime(user.lastLogin!)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Popular Scenarios</h3>
                <div className="space-y-3">
                  {Object.entries(systemMetrics.scenarioUsage)
                    .sort(([,a], [,b]) => b - a)
                    .map(([scenario, count]) => (
                      <div key={scenario} className="flex items-center justify-between">
                        <span className="text-gray-700">{scenario}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${(count / Math.max(...Object.values(systemMetrics.scenarioUsage))) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scenarios Tab */}
        {activeTab === 'scenarios' && (
          <div className="space-y-6">
            {!isCreatingScenario && !selectedScenario && (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Scenario Management</h3>
                  <button
                    onClick={() => setIsCreatingScenario(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    + Create New Scenario
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {mockScenarios.map(scenario => (
                    <div key={scenario.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`px-3 py-1 text-sm rounded-full ${
                          scenario.difficulty === 'Beginner' 
                            ? 'bg-green-100 text-green-800'
                            : scenario.difficulty === 'Intermediate'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {scenario.difficulty}
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedScenario(scenario)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-700 text-sm">
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 mb-2">{scenario.title}</h4>
                      <p className="text-sm text-gray-600 mb-4">{scenario.description}</p>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">{scenario.category}</span>
                        <span className="font-medium text-purple-600">
                          {scenario.completionCount} completions
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(isCreatingScenario || selectedScenario) && (
              <div>
                <h3 className="text-lg font-semibold mb-6">
                  {isCreatingScenario ? 'Create New Scenario' : 'Edit Scenario'}
                </h3>
                <ScenarioForm
                  scenario={selectedScenario || undefined}
                  onSave={(scenarioData) => {
                    console.log('Saving scenario:', scenarioData);
                    setIsCreatingScenario(false);
                    setSelectedScenario(null);
                  }}
                  onCancel={() => {
                    setIsCreatingScenario(false);
                    setSelectedScenario(null);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">User Management</h3>
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium">
                  + Invite User
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.role.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.team || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.totalSessions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={`${user.averageScore >= 80 ? 'text-green-600' : user.averageScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {user.averageScore}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.lastLogin ? formatTime(user.lastLogin) : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-700">Edit</button>
                          <button className="text-red-600 hover:text-red-700">Deactivate</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">System Analytics</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                <strong>Advanced Analytics:</strong> Detailed system analytics and reporting features are coming soon.
              </p>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">System Settings</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                <strong>System Configuration:</strong> Advanced system settings and configuration options are coming soon.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}