'use client';

import { useState, useEffect } from 'react';
import { sessionApi, handleApiError, SessionAnalytics } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface SalesMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  format: 'number' | 'percentage' | 'currency' | 'time';
}

interface TrainingProgress {
  id: string;
  skillArea: string;
  currentLevel: number;
  targetLevel: number;
  completedSessions: number;
  totalSessions: number;
  lastActivity: Date;
}

interface RecentActivity {
  id: string;
  type: 'session_completed' | 'milestone_reached' | 'skill_improved';
  title: string;
  description: string;
  timestamp: Date;
  score?: number;
}

interface SalesTrainingDashboardProps {
  userId?: string;
}

export default function SalesTrainingDashboard({ userId = 'default-user' }: SalesTrainingDashboardProps) {
  const [salesMetrics, setSalesMetrics] = useState<SalesMetric[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isAuthenticated } = useAuth();

  // Load analytics data
  useEffect(() => {
    if (isAuthenticated) {
      loadAnalytics();
    }
  }, [isAuthenticated, selectedTimeframe]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await sessionApi.getAnalytics();
      
      if (response.data) {
        setAnalytics(response.data);
        processAnalyticsData(response.data);
      } else if (response.error) {
        setError(handleApiError(response.error));
      }
    } catch (err) {
      setError('Failed to load analytics data. Please try again.');
      console.error('Error loading analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const processAnalyticsData = (data: SessionAnalytics) => {
    // Process metrics
    const metrics: SalesMetric[] = [
      {
        id: '1',
        name: 'Average Score',
        value: data.average_score,
        change: data.improvement_trend,
        trend: data.improvement_trend > 0 ? 'up' : data.improvement_trend < 0 ? 'down' : 'stable',
        format: 'number'
      },
      {
        id: '2',
        name: 'Completion Rate',
        value: (data.completed_sessions / data.total_sessions) * 100,
        change: 0, // Would need historical data
        trend: 'stable',
        format: 'percentage'
      },
      {
        id: '3',
        name: 'Training Hours',
        value: Math.round(data.total_training_time / 60 / 60 * 10) / 10,
        change: 0, // Would need historical data
        trend: 'up',
        format: 'time'
      },
      {
        id: '4',
        name: 'Total Sessions',
        value: data.total_sessions,
        change: 0,
        trend: 'up',
        format: 'number'
      }
    ];
    setSalesMetrics(metrics);

    // Process training progress from score_by_category
    const progress: TrainingProgress[] = Object.entries(data.score_by_category || {}).map(([category, score], index) => ({
      id: (index + 1).toString(),
      skillArea: category,
      currentLevel: score,
      targetLevel: 85, // Default target
      completedSessions: Math.floor(data.completed_sessions / Object.keys(data.score_by_category || {}).length),
      totalSessions: Math.floor(data.total_sessions / Object.keys(data.score_by_category || {}).length),
      lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random recent date
    }));
    setTrainingProgress(progress);

    // Process recent activities from recent_sessions
    const activities: RecentActivity[] = data.recent_sessions.slice(0, 4).map((session, index) => ({
      id: (index + 1).toString(),
      type: 'session_completed' as const,
      title: `Completed Training Session`,
      description: `Session ${session.id} - Score: ${session.final_score || 'N/A'}`,
      timestamp: new Date(session.created_at),
      score: session.final_score || undefined
    }));
    setRecentActivities(activities);
  };

  const formatMetricValue = (metric: SalesMetric): string => {
    switch (metric.format) {
      case 'percentage':
        return `${metric.value}%`;
      case 'currency':
        return `$${metric.value.toLocaleString()}`;
      case 'time':
        return `${metric.value}h`;
      default:
        return metric.value.toString();
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      default:
        return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'session_completed':
        return '🎯';
      case 'milestone_reached':
        return '🏆';
      case 'skill_improved':
        return '📈';
      default:
        return '📋';
    }
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getProgressColor = (current: number, target: number): string => {
    const percentage = (current / target) * 100;
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <div className="bg-gray-50 min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h3>
              <p className="text-gray-600">Please log in to view your training dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Training Dashboard</h1>
            <p className="text-gray-600 mt-1">Track your progress and performance metrics</p>
          </div>
          
          <div className="mt-4 sm:mt-0">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as '7d' | '30d' | '90d')}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading analytics...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-500 mr-3">⚠️</div>
              <div>
                <h3 className="text-red-800 font-medium">Error Loading Analytics</h3>
                <p className="text-red-600 text-sm">{error}</p>
                <button 
                  onClick={loadAnalytics}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sales Metrics Grid */}
        {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {salesMetrics.map((metric) => (
            <div key={metric.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatMetricValue(metric)}
                  </p>
                </div>
                <div className="text-2xl">{getTrendIcon(metric.trend)}</div>
              </div>
              
              <div className={`flex items-center mt-4 text-sm ${getTrendColor(metric.trend)}`}>
                <span className="font-medium">
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </span>
                <span className="text-gray-500 ml-2">vs last period</span>
              </div>
            </div>
          ))}
        </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Training Progress */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Training Progress</h2>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All Skills
              </button>
            </div>
            
            <div className="space-y-6">
              {trainingProgress.map((progress) => (
                <div key={progress.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{progress.skillArea}</h3>
                      <p className="text-sm text-gray-600">
                        {progress.completedSessions}/{progress.totalSessions} sessions completed
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {progress.currentLevel}%
                      </div>
                      <div className="text-sm text-gray-500">
                        Target: {progress.targetLevel}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress.currentLevel, progress.targetLevel)}`}
                        style={{ width: `${(progress.currentLevel / progress.targetLevel) * 100}%` }}
                      ></div>
                    </div>
                    <div 
                      className="absolute top-0 w-0.5 h-2 bg-gray-400"
                      style={{ left: `${(progress.targetLevel / 100) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Last activity: {formatRelativeTime(progress.lastActivity)}</span>
                    <span>{Math.round((progress.currentLevel / progress.targetLevel) * 100)}% to target</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All
              </button>
            </div>
            
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-2xl flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {activity.title}
                    </p>
                    <p className="text-gray-600 text-sm mt-1">
                      {activity.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                      {activity.score && (
                        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                          {activity.score}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center space-x-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <span className="text-2xl">🚀</span>
              <span className="font-medium text-gray-700">Start New Session</span>
            </button>
            
            <button className="flex items-center justify-center space-x-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors">
              <span className="text-2xl">📊</span>
              <span className="font-medium text-gray-700">View Analytics</span>
            </button>
            
            <button className="flex items-center justify-center space-x-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors">
              <span className="text-2xl">🎯</span>
              <span className="font-medium text-gray-700">Set Goals</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}