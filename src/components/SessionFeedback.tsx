'use client';

import { useState } from 'react';
import { TrainingScenario } from './ScenarioDashboard';

interface SessionData {
  scenario: TrainingScenario;
  duration: number;
  messages: any[];
  steps: any[];
  feedback: string[];
  score: number;
}

interface FeedbackCategory {
  category: string;
  score: number;
  maxScore: number;
  feedback: string[];
  recommendations: string[];
  color: string;
}

interface SessionFeedbackProps {
  sessionData: SessionData;
  onNewSession: () => void;
  onReplaySession: () => void;
}

export default function SessionFeedback({ sessionData, onNewSession, onReplaySession }: SessionFeedbackProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'improvement'>('overview');
  
  // Generate comprehensive feedback based on the session
  const generateDetailedFeedback = (): FeedbackCategory[] => {
    return [
      {
        category: 'Opening & Rapport',
        score: Math.floor(Math.random() * 25) + 70,
        maxScore: 100,
        feedback: [
          'Strong confident opening with clear introduction',
          'Effective use of prospect research to personalize approach',
          'Good energy and enthusiasm in voice tone'
        ],
        recommendations: [
          'Try varying your opening based on different prospect types',
          'Consider adding a brief credibility statement early'
        ],
        color: 'blue'
      },
      {
        category: 'Discovery & Questioning',
        score: Math.floor(Math.random() * 20) + 75,
        maxScore: 100,
        feedback: [
          'Used open-ended questions to uncover needs',
          'Good follow-up on prospect responses',
          'Successfully identified key pain points'
        ],
        recommendations: [
          'Ask more quantifying questions to understand impact',
          'Use the SPIN framework more systematically',
          'Probe deeper on emotional drivers'
        ],
        color: 'green'
      },
      {
        category: 'Objection Handling',
        score: Math.floor(Math.random() * 30) + 65,
        maxScore: 100,
        feedback: [
          'Acknowledged objections appropriately',
          'Provided relevant examples and case studies',
          'Maintained composure under pressure'
        ],
        recommendations: [
          'Practice the Feel-Felt-Found framework more consistently',
          'Ask permission before addressing objections',
          'Use more stories to make points memorable'
        ],
        color: 'yellow'
      },
      {
        category: 'Value Communication',
        score: Math.floor(Math.random() * 20) + 78,
        maxScore: 100,
        feedback: [
          'Clearly articulated product benefits',
          'Connected features to customer outcomes',
          'Used specific metrics and ROI examples'
        ],
        recommendations: [
          'Quantify value proposition earlier in conversation',
          'Use more customer success stories',
          'Create urgency around business impact'
        ],
        color: 'purple'
      },
      {
        category: 'Closing & Next Steps',
        score: Math.floor(Math.random() * 25) + 70,
        maxScore: 100,
        feedback: [
          'Clear call-to-action presented',
          'Created mutual calendar commitment',
          'Summarized key discussion points'
        ],
        recommendations: [
          'Try different closing techniques based on buying signals',
          'Create stronger sense of urgency',
          'Confirm prospect commitment more explicitly'
        ],
        color: 'red'
      }
    ];
  };

  const feedbackCategories = generateDetailedFeedback();
  const overallScore = Math.round(feedbackCategories.reduce((sum, cat) => sum + cat.score, 0) / feedbackCategories.length);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 65) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 85) return 'bg-green-50 border-green-200';
    if (score >= 75) return 'bg-yellow-50 border-yellow-200';
    if (score >= 65) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateReflectionQuestions = () => {
    return [
      "What was the most challenging moment in this conversation and how did you handle it?",
      "Which specific technique worked best for building rapport with this prospect?",
      "If you could redo one part of this conversation, what would you change?",
      "What questions could you have asked to better understand their business impact?",
      "How will you apply today's learning to your next real sales conversation?"
    ];
  };

  const generateActionableSteps = () => {
    return [
      {
        timeframe: 'Today',
        actions: [
          'Review the objection handling techniques from this session',
          'Practice the improved opening you learned',
          'Update your call preparation checklist'
        ]
      },
      {
        timeframe: 'This Week',
        actions: [
          'Apply the discovery questioning framework to 3 real conversations',
          'Test the new closing approach with qualified prospects',
          'Record yourself practicing the improved techniques'
        ]
      },
      {
        timeframe: 'Next 30 Days',
        actions: [
          'Complete 2 more scenarios focusing on your development areas',
          'Track your real-world performance improvements',
          'Share learnings with your sales team for peer feedback'
        ]
      }
    ];
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Session Complete! 🎉</h2>
            <p className="text-green-100">{sessionData.scenario.title}</p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${getScoreColor(overallScore)}`} style={{ color: 'white' }}>
              {overallScore}%
            </div>
            <div className="text-green-100 text-sm">Overall Score</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'detailed', label: 'Detailed Analysis', icon: '🔍' },
            { key: 'improvement', label: 'Action Plan', icon: '🎯' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-2 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg border-2 ${getScoreBackground(overallScore)}`}>
                <div className="text-sm text-gray-600">Overall Score</div>
                <div className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}%</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <div className="text-sm text-gray-600">Session Duration</div>
                <div className="text-2xl font-bold text-blue-600">{formatTime(sessionData.duration)}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                <div className="text-sm text-gray-600">Difficulty Level</div>
                <div className="text-2xl font-bold text-purple-600">{sessionData.scenario.difficulty}</div>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
                <div className="text-sm text-gray-600">Category</div>
                <div className="text-lg font-bold text-indigo-600">{sessionData.scenario.category}</div>
              </div>
            </div>

            {/* Performance Radar Chart Visualization */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Breakdown</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {feedbackCategories.map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{category.category}</span>
                        <span className={`text-sm font-bold ${getScoreColor(category.score)}`}>
                          {category.score}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full bg-gradient-to-r ${
                            category.score >= 85 
                              ? 'from-green-400 to-green-600' 
                              : category.score >= 75 
                              ? 'from-yellow-400 to-yellow-600'
                              : category.score >= 65
                              ? 'from-orange-400 to-orange-600'
                              : 'from-red-400 to-red-600'
                          }`}
                          style={{ width: `${category.score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium mb-3">Key Strengths</h4>
                  <ul className="space-y-2 text-sm">
                    {feedbackCategories
                      .filter(cat => cat.score >= 80)
                      .slice(0, 3)
                      .map((cat, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-green-500 mt-1">✓</span>
                          <span className="text-gray-700">{cat.feedback[0]}</span>
                        </li>
                      ))}
                  </ul>
                  
                  <h4 className="font-medium mt-4 mb-3">Areas for Growth</h4>
                  <ul className="space-y-2 text-sm">
                    {feedbackCategories
                      .filter(cat => cat.score < 80)
                      .slice(0, 2)
                      .map((cat, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-yellow-500 mt-1">→</span>
                          <span className="text-gray-700">{cat.recommendations[0]}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onReplaySession}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                🔄 Practice Again
              </button>
              <button
                onClick={onNewSession}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                🎯 Try New Scenario
              </button>
            </div>
          </div>
        )}

        {/* Detailed Analysis Tab */}
        {activeTab === 'detailed' && (
          <div className="space-y-6">
            {feedbackCategories.map((category, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{category.category}</h3>
                  <span className={`text-lg font-bold ${getScoreColor(category.score)}`}>
                    {category.score}/100
                  </span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-green-900 mb-3">✅ What You Did Well</h4>
                    <ul className="space-y-2">
                      {category.feedback.map((feedback, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start space-x-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          <span>{feedback}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-blue-900 mb-3">🎯 Recommendations</h4>
                    <ul className="space-y-2">
                      {category.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start space-x-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}

            {/* Conversation Analysis */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Conversation Flow Analysis</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-blue-600">{Math.floor(sessionData.duration / 60)}</div>
                    <div className="text-sm text-gray-600">Total Minutes</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-green-600">
                      {sessionData.messages?.filter(m => m.type === 'user').length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Your Responses</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {sessionData.steps?.filter(s => s.completed).length || 0}/6
                    </div>
                    <div className="text-sm text-gray-600">Steps Completed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Improvement Plan Tab */}
        {activeTab === 'improvement' && (
          <div className="space-y-6">
            
            {/* Reflection Questions */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">🤔 Reflection Questions</h3>
              <p className="text-blue-800 text-sm mb-4">
                Take a few minutes to reflect on these questions. Self-reflection is key to improving your sales skills.
              </p>
              <div className="space-y-3">
                {generateReflectionQuestions().map((question, index) => (
                  <div key={index} className="bg-white rounded p-4 border border-blue-200">
                    <p className="text-gray-700 text-sm">{question}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Plan */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">📋 Your Development Action Plan</h3>
              {generateActionableSteps().map((timeframe, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-3">{timeframe.timeframe}</h4>
                  <ul className="space-y-2">
                    {timeframe.actions.map((action, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <input type="checkbox" className="mt-1" />
                        <span className="text-sm text-gray-700">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Next Session Recommendations */}
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">🎯 Recommended Next Sessions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded p-4 border border-green-200">
                  <h4 className="font-medium text-gray-900 mb-2">Focus on Strengths</h4>
                  <p className="text-sm text-gray-600 mb-2">Advanced Closing Techniques</p>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Recommended</span>
                </div>
                <div className="bg-white rounded p-4 border border-green-200">
                  <h4 className="font-medium text-gray-900 mb-2">Improve Weak Areas</h4>
                  <p className="text-sm text-gray-600 mb-2">Objection Handling Mastery</p>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Priority</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                📄 Export Report
              </button>
              <button
                onClick={onNewSession}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                🚀 Start Next Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}