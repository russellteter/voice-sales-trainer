'use client';

import { useState, useMemo } from 'react';

interface SessionMetrics {
  id: string;
  scenarioTitle: string;
  category: string;
  difficulty: string;
  duration: number;
  score: number;
  completedAt: Date;
  skillBreakdown: {
    opening: number;
    discovery: number;
    objectionHandling: number;
    valueComm: number;
    closing: number;
  };
}

interface AnalyticsDashboardProps {
  sessions: SessionMetrics[];
}

export default function AnalyticsDashboard({ sessions }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'progress' | 'comparison'>('overview');

  // Filter sessions based on time range
  const filteredSessions = useMemo(() => {
    if (timeRange === 'all') return sessions;
    
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return sessions.filter(session => session.completedAt >= cutoff);
  }, [sessions, timeRange]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (filteredSessions.length === 0) {
      return {
        totalSessions: 0,
        averageScore: 0,
        totalPracticeTime: 0,
        improvementRate: 0,
        skillAverages: {
          opening: 0,
          discovery: 0,
          objectionHandling: 0,
          valueComm: 0,
          closing: 0
        }
      };
    }

    const totalSessions = filteredSessions.length;
    const averageScore = filteredSessions.reduce((sum, s) => sum + s.score, 0) / totalSessions;
    const totalPracticeTime = filteredSessions.reduce((sum, s) => sum + s.duration, 0);
    
    // Calculate improvement rate (last 5 sessions vs first 5)
    const sortedSessions = [...filteredSessions].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
    const firstFive = sortedSessions.slice(0, Math.min(5, sortedSessions.length));
    const lastFive = sortedSessions.slice(-Math.min(5, sortedSessions.length));
    const firstAvg = firstFive.reduce((sum, s) => sum + s.score, 0) / firstFive.length;
    const lastAvg = lastFive.reduce((sum, s) => sum + s.score, 0) / lastFive.length;
    const improvementRate = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

    // Calculate skill averages
    const skillAverages = {
      opening: filteredSessions.reduce((sum, s) => sum + s.skillBreakdown.opening, 0) / totalSessions,
      discovery: filteredSessions.reduce((sum, s) => sum + s.skillBreakdown.discovery, 0) / totalSessions,
      objectionHandling: filteredSessions.reduce((sum, s) => sum + s.skillBreakdown.objectionHandling, 0) / totalSessions,
      valueComm: filteredSessions.reduce((sum, s) => sum + s.skillBreakdown.valueComm, 0) / totalSessions,
      closing: filteredSessions.reduce((sum, s) => sum + s.skillBreakdown.closing, 0) / totalSessions
    };

    return {
      totalSessions,
      averageScore: Math.round(averageScore),
      totalPracticeTime: Math.round(totalPracticeTime),
      improvementRate: Math.round(improvementRate * 10) / 10,
      skillAverages
    };
  }, [filteredSessions]);

  // Generate mock data for demonstration
  const generateMockData = (count: number): SessionMetrics[] => {
    const scenarios = ['Cold Calling', 'Objection Handling', 'Discovery', 'Closing', 'Product Demo'];
    const difficulties = ['Beginner', 'Intermediate', 'Advanced'];
    
    return Array.from({ length: count }, (_, i) => {
      const baseScore = 60 + Math.random() * 35; // 60-95 range
      return {
        id: `session-${i}`,
        scenarioTitle: `${scenarios[Math.floor(Math.random() * scenarios.length)]} Practice ${i + 1}`,
        category: scenarios[Math.floor(Math.random() * scenarios.length)],
        difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
        duration: 300 + Math.random() * 600, // 5-15 minutes
        score: Math.round(baseScore),
        completedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        skillBreakdown: {
          opening: Math.round(baseScore + (Math.random() - 0.5) * 20),
          discovery: Math.round(baseScore + (Math.random() - 0.5) * 20),
          objectionHandling: Math.round(baseScore + (Math.random() - 0.5) * 20),
          valueComm: Math.round(baseScore + (Math.random() - 0.5) * 20),
          closing: Math.round(baseScore + (Math.random() - 0.5) * 20)
        }
      };
    });
  };

  // Use mock data if no sessions provided
  const displaySessions = sessions.length > 0 ? sessions : generateMockData(15);
  const displayFilteredSessions = useMemo(() => {
    if (timeRange === 'all') return displaySessions;
    
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return displaySessions.filter(session => session.completedAt >= cutoff);
  }, [displaySessions, timeRange]);

  const displayMetrics = useMemo(() => {
    if (displayFilteredSessions.length === 0) {
      return {
        totalSessions: 0,
        averageScore: 0,
        totalPracticeTime: 0,
        improvementRate: 0,
        skillAverages: {
          opening: 0,
          discovery: 0,
          objectionHandling: 0,
          valueComm: 0,
          closing: 0
        }
      };
    }

    const totalSessions = displayFilteredSessions.length;
    const averageScore = displayFilteredSessions.reduce((sum, s) => sum + s.score, 0) / totalSessions;
    const totalPracticeTime = displayFilteredSessions.reduce((sum, s) => sum + s.duration, 0);
    
    const sortedSessions = [...displayFilteredSessions].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
    const firstFive = sortedSessions.slice(0, Math.min(5, sortedSessions.length));
    const lastFive = sortedSessions.slice(-Math.min(5, sortedSessions.length));
    const firstAvg = firstFive.reduce((sum, s) => sum + s.score, 0) / firstFive.length;
    const lastAvg = lastFive.reduce((sum, s) => sum + s.score, 0) / lastFive.length;
    const improvementRate = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

    const skillAverages = {
      opening: displayFilteredSessions.reduce((sum, s) => sum + s.skillBreakdown.opening, 0) / totalSessions,
      discovery: displayFilteredSessions.reduce((sum, s) => sum + s.skillBreakdown.discovery, 0) / totalSessions,
      objectionHandling: displayFilteredSessions.reduce((sum, s) => sum + s.skillBreakdown.objectionHandling, 0) / totalSessions,
      valueComm: displayFilteredSessions.reduce((sum, s) => sum + s.skillBreakdown.valueComm, 0) / totalSessions,
      closing: displayFilteredSessions.reduce((sum, s) => sum + s.skillBreakdown.closing, 0) / totalSessions
    };

    return {
      totalSessions,
      averageScore: Math.round(averageScore),
      totalPracticeTime: Math.round(totalPracticeTime),
      improvementRate: Math.round(improvementRate * 10) / 10,
      skillAverages
    };
  }, [displayFilteredSessions]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getImprovementColor = (rate: number) => {
    if (rate > 5) return 'text-green-600';
    if (rate > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const categoryDistribution = useMemo(() => {
    const distribution: { [key: string]: number } = {};
    displayFilteredSessions.forEach(session => {
      distribution[session.category] = (distribution[session.category] || 0) + 1;
    });
    return distribution;
  }, [displayFilteredSessions]);

  const progressData = useMemo(() => {
    const sortedSessions = [...displayFilteredSessions].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
    return sortedSessions.map((session, index) => ({
      session: index + 1,
      score: session.score,
      date: session.completedAt.toLocaleDateString()
    }));
  }, [displayFilteredSessions]);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Performance Analytics</h2>
            <p className="text-indigo-100">Track your sales training progress and improvement</p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex bg-indigo-800 rounded-lg p-1">
            {[
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: '90d', label: '90 Days' },
              { value: 'all', label: 'All Time' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value as any)}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  timeRange === option.value 
                    ? 'bg-white text-indigo-700 font-medium' 
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'skills', label: 'Skills Breakdown', icon: '🎯' },
            { key: 'progress', label: 'Progress Tracking', icon: '📈' },
            { key: 'comparison', label: 'Benchmarking', icon: '⚖️' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-2 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
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
            
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">Total Sessions</p>
                    <p className="text-2xl font-bold text-blue-900">{displayMetrics.totalSessions}</p>
                  </div>
                  <div className="text-blue-400 text-3xl">🎯</div>
                </div>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium">Average Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(displayMetrics.averageScore)}`}>
                      {displayMetrics.averageScore}%
                    </p>
                  </div>
                  <div className="text-green-400 text-3xl">📊</div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">Practice Time</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatTime(displayMetrics.totalPracticeTime)}
                    </p>
                  </div>
                  <div className="text-purple-400 text-3xl">⏱️</div>
                </div>
              </div>
              
              <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-600 text-sm font-medium">Improvement</p>
                    <p className={`text-2xl font-bold ${getImprovementColor(displayMetrics.improvementRate)}`}>
                      {displayMetrics.improvementRate > 0 ? '+' : ''}{displayMetrics.improvementRate}%
                    </p>
                  </div>
                  <div className="text-orange-400 text-3xl">📈</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {displayFilteredSessions
                    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
                    .slice(0, 8)
                    .map(session => (
                      <div key={session.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{session.scenarioTitle}</p>
                          <p className="text-gray-600 text-xs">{session.completedAt.toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${getScoreColor(session.score)}`}>{session.score}%</p>
                          <p className="text-gray-500 text-xs">{formatTime(session.duration)}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(categoryDistribution)
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-gray-700 text-sm">{category}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${(count / displayFilteredSessions.length) * 100}%` }}
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

        {/* Skills Breakdown Tab */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-6">Skill Performance</h3>
                <div className="space-y-4">
                  {Object.entries(displayMetrics.skillAverages).map(([skill, score]) => {
                    const skillNames = {
                      opening: 'Opening & Rapport',
                      discovery: 'Discovery Questions',
                      objectionHandling: 'Objection Handling',
                      valueComm: 'Value Communication',
                      closing: 'Closing Techniques'
                    };
                    
                    return (
                      <div key={skill} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">
                            {skillNames[skill as keyof typeof skillNames]}
                          </span>
                          <span className={`text-sm font-bold ${getScoreColor(Math.round(score))}`}>
                            {Math.round(score)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${
                              score >= 85 
                                ? 'bg-gradient-to-r from-green-400 to-green-600' 
                                : score >= 75 
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                                : 'bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Skill Recommendations</h3>
                <div className="space-y-4">
                  {Object.entries(displayMetrics.skillAverages)
                    .sort(([,a], [,b]) => a - b) // Sort by lowest scores first
                    .slice(0, 3)
                    .map(([skill, score]) => {
                      const recommendations = {
                        opening: [
                          'Practice different opening approaches for various prospect types',
                          'Work on building rapport quickly with new contacts'
                        ],
                        discovery: [
                          'Master the SPIN questioning framework',
                          'Practice uncovering emotional drivers behind business needs'
                        ],
                        objectionHandling: [
                          'Use the Feel-Felt-Found framework consistently',
                          'Practice turning objections into opportunities'
                        ],
                        valueComm: [
                          'Focus on quantifiable business outcomes',
                          'Use more customer success stories'
                        ],
                        closing: [
                          'Practice assumptive close techniques',
                          'Work on creating authentic urgency'
                        ]
                      };

                      return (
                        <div key={skill} className="bg-white p-4 rounded-lg border border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {skill.charAt(0).toUpperCase() + skill.slice(1)} ({Math.round(score)}%)
                          </h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {recommendations[skill as keyof typeof recommendations]?.map((rec, idx) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <span className="text-indigo-500 mt-1">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Tracking Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-6">Score Progress Over Time</h3>
              <div className="h-64 flex items-end justify-between space-x-2">
                {progressData.slice(-10).map((data, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div
                      className="bg-indigo-600 rounded-t w-8 min-h-4"
                      style={{ height: `${(data.score / 100) * 200}px` }}
                      title={`Session ${data.session}: ${data.score}%`}
                    ></div>
                    <span className="text-xs text-gray-600 mt-2">{data.session}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Consistency Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Sessions This Week</span>
                    <span className="font-bold text-indigo-600">
                      {displayFilteredSessions.filter(s => {
                        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                        return s.completedAt >= weekAgo;
                      }).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Average Session Length</span>
                    <span className="font-bold text-indigo-600">
                      {formatTime(displayMetrics.totalPracticeTime / displayMetrics.totalSessions)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Best Score</span>
                    <span className="font-bold text-green-600">
                      {Math.max(...displayFilteredSessions.map(s => s.score))}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Achievement Milestones</h3>
                <div className="space-y-3">
                  {[
                    { milestone: '10 Sessions Completed', achieved: displayMetrics.totalSessions >= 10 },
                    { milestone: '80% Average Score', achieved: displayMetrics.averageScore >= 80 },
                    { milestone: '5+ Hours Practice', achieved: displayMetrics.totalPracticeTime >= 18000 },
                    { milestone: '10% Improvement', achieved: displayMetrics.improvementRate >= 10 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        item.achieved ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                      }`}>
                        {item.achieved ? '✓' : index + 1}
                      </div>
                      <span className={item.achieved ? 'text-green-700 font-medium' : 'text-gray-600'}>
                        {item.milestone}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Benchmarking Tab */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600 text-xl">⚡</span>
                <p className="text-yellow-800 text-sm">
                  <strong>Coming Soon:</strong> Compare your performance against anonymized peer data and industry benchmarks.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Your Performance Profile</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600 mb-2">{displayMetrics.averageScore}%</div>
                    <p className="text-gray-600">Overall Average Score</p>
                  </div>
                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sessions Completed</span>
                      <span className="font-medium">{displayMetrics.totalSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Practice Time</span>
                      <span className="font-medium">{formatTime(displayMetrics.totalPracticeTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Improvement Rate</span>
                      <span className={`font-medium ${getImprovementColor(displayMetrics.improvementRate)}`}>
                        {displayMetrics.improvementRate > 0 ? '+' : ''}{displayMetrics.improvementRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Skill Ranking</h3>
                <div className="space-y-3">
                  {Object.entries(displayMetrics.skillAverages)
                    .sort(([,a], [,b]) => b - a)
                    .map(([skill, score], index) => {
                      const skillNames = {
                        opening: 'Opening & Rapport',
                        discovery: 'Discovery',
                        objectionHandling: 'Objection Handling',
                        valueComm: 'Value Communication',
                        closing: 'Closing'
                      };
                      
                      return (
                        <div key={skill} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="font-medium text-gray-900">
                              {skillNames[skill as keyof typeof skillNames]}
                            </span>
                          </div>
                          <span className={`font-bold ${getScoreColor(Math.round(score))}`}>
                            {Math.round(score)}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}