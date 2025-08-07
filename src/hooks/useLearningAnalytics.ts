/**
 * Learning Analytics Hook
 * Provides comprehensive learning analytics functionality for the Voice Sales Trainer
 * Integrates with Claude learning intelligence backend services
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Types for learning analytics
export interface ConversationAnalysis {
  turn_id: string;
  user_input: string;
  ai_response: string;
  assessment_scores: Record<AssessmentDimension, number>;
  coaching_feedback: string[];
  improvement_suggestions: string[];
  confidence_score: number;
  processing_time_ms: number;
  timestamp: string;
}

export interface RealTimeCoachingFeedback {
  feedback_id: string;
  session_id: string;
  trigger_type: 'performance_threshold' | 'skill_gap' | 'opportunity';
  message: string;
  priority: number; // 1-5, 5 being highest
  display_duration_ms: number;
  coaching_hint?: string;
  socratic_question?: string;
  timestamp: string;
}

export interface SkillProgression {
  [dimension: string]: {
    current_score: number;
    starting_score: number;
    improvement: number;
    trend: 'improving' | 'stable' | 'declining';
    consistency: number;
  };
}

export interface SessionMetrics {
  average_performance: number;
  performance_std: number;
  turn_count: number;
  coaching_interactions: number;
  skill_dimension_scores: Record<string, number>;
  progress_trend: string;
  engagement_score: number;
}

export interface PerformanceAnalytics {
  skill_progression: {
    skill_improvements: Record<string, any>;
    areas_needing_focus: string[];
    confidence_trends: Record<string, any>;
    recommended_practice: string[];
    readiness_for_advancement: boolean;
    overall_progress_score: number;
  };
  performance_metrics: {
    dimension_metrics: Record<string, any>;
    overall_average: number;
    total_practice_sessions: number;
    total_conversation_turns: number;
    recent_performance_trend: string;
  };
  learning_insights: {
    learning_velocity: string;
    preferred_scenarios: string[];
    optimal_session_length: number;
    skill_development_pattern: string;
    engagement_patterns: string;
  };
  session_summary: {
    total_sessions: number;
    total_practice_time_minutes: number;
    average_session_length_minutes: number;
    scenarios_practiced: string[];
    date_range: {
      start: string;
      end: string;
    };
  };
  recommendations: string[];
}

export type AssessmentDimension = 
  | 'discovery_questions'
  | 'objection_handling' 
  | 'value_articulation'
  | 'active_listening'
  | 'conversation_control'
  | 'empathy_building'
  | 'business_acumen'
  | 'closing_skills';

export interface LearningSessionConfig {
  scenario_type: string;
  prospect_persona: string;
  difficulty_level: number;
  learning_objectives: string[];
  company_context?: Record<string, any>;
  user_preferences?: Record<string, any>;
}

export interface UseLearningAnalyticsOptions {
  userId: string;
  apiBaseUrl?: string;
  realTimeUpdates?: boolean;
  metricsRefreshInterval?: number; // milliseconds
}

export interface LearningAnalyticsState {
  // Session Management
  currentSessionId: string | null;
  isSessionActive: boolean;
  sessionConfig: LearningSessionConfig | null;
  
  // Real-time Analytics
  currentAnalysis: ConversationAnalysis | null;
  realtimeCoachingFeedback: RealTimeCoachingFeedback[];
  skillProgression: SkillProgression;
  sessionMetrics: SessionMetrics;
  
  // Historical Analytics  
  performanceAnalytics: PerformanceAnalytics | null;
  learningTrends: any[];
  
  // UI State
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const useLearningAnalytics = (options: UseLearningAnalyticsOptions) => {
  const { userId, apiBaseUrl = '/api', realTimeUpdates = true, metricsRefreshInterval = 5000 } = options;
  
  // State management
  const [state, setState] = useState<LearningAnalyticsState>({
    currentSessionId: null,
    isSessionActive: false,
    sessionConfig: null,
    currentAnalysis: null,
    realtimeCoachingFeedback: [],
    skillProgression: {},
    sessionMetrics: {
      average_performance: 0,
      performance_std: 0,
      turn_count: 0,
      coaching_interactions: 0,
      skill_dimension_scores: {},
      progress_trend: 'stable',
      engagement_score: 0
    },
    performanceAnalytics: null,
    learningTrends: [],
    isLoading: false,
    error: null,
    lastUpdated: null
  });

  // Refs for cleanup and intervals
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // API client setup
  const apiClient = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    // Ensure we have a fresh abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
      signal: abortControllerRef.current.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  }, [apiBaseUrl]);

  // Session Management
  const startLearningSession = useCallback(async (config: LearningSessionConfig) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient('/learning/sessions/start', {
        method: 'POST',
        body: JSON.stringify(config),
        headers: {
          'X-User-ID': userId,
        },
      });

      setState(prev => ({
        ...prev,
        currentSessionId: response.session_id,
        isSessionActive: true,
        sessionConfig: config,
        isLoading: false,
        lastUpdated: new Date(),
      }));

      return response.session_id;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start session',
        isLoading: false,
      }));
      throw error;
    }
  }, [apiClient, userId]);

  const endLearningSession = useCallback(async (sessionId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient(`/learning/sessions/${sessionId}/end`, {
        method: 'POST',
      });

      setState(prev => ({
        ...prev,
        currentSessionId: null,
        isSessionActive: false,
        sessionConfig: null,
        realtimeCoachingFeedback: [],
        isLoading: false,
        lastUpdated: new Date(),
      }));

      return response.final_report;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to end session',
        isLoading: false,
      }));
      throw error;
    }
  }, [apiClient]);

  // Real-time Analysis
  const analyzeConversation = useCallback(async (userInput: string, aiResponse: string) => {
    if (!state.currentSessionId) {
      throw new Error('No active learning session');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient('/learning/analyze', {
        method: 'POST',
        body: JSON.stringify({
          session_id: state.currentSessionId,
          user_input: userInput,
          ai_response: aiResponse,
          timestamp: new Date().toISOString(),
        }),
      });

      setState(prev => ({
        ...prev,
        currentAnalysis: response.analysis,
        realtimeCoachingFeedback: response.coaching_feedback,
        skillProgression: response.skill_progression,
        sessionMetrics: response.session_metrics,
        isLoading: false,
        lastUpdated: new Date(),
      }));

      return response;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to analyze conversation',
        isLoading: false,
      }));
      throw error;
    }
  }, [apiClient, state.currentSessionId]);

  const enhanceResponse = useCallback(async (userInput: string) => {
    if (!state.currentSessionId) {
      throw new Error('No active learning session');
    }

    try {
      const response = await apiClient('/learning/enhance', {
        method: 'POST',
        body: JSON.stringify({
          session_id: state.currentSessionId,
          user_input: userInput,
        }),
      });

      return response;
    } catch (error) {
      throw error;
    }
  }, [apiClient, state.currentSessionId]);

  // Feedback and Analytics
  const getStructuredFeedback = useCallback(async (sessionId?: string) => {
    const targetSessionId = sessionId || state.currentSessionId;
    if (!targetSessionId) {
      throw new Error('No session ID provided');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient(`/learning/feedback/${targetSessionId}`);

      setState(prev => ({
        ...prev,
        isLoading: false,
        lastUpdated: new Date(),
      }));

      return response;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get feedback',
        isLoading: false,
      }));
      throw error;
    }
  }, [apiClient, state.currentSessionId]);

  const getPerformanceAnalytics = useCallback(async (daysBack: number = 30) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient(`/learning/performance/${userId}?days_back=${daysBack}`);

      setState(prev => ({
        ...prev,
        performanceAnalytics: response,
        isLoading: false,
        lastUpdated: new Date(),
      }));

      return response;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get performance analytics',
        isLoading: false,
      }));
      throw error;
    }
  }, [apiClient, userId]);

  // Knowledge Base Queries
  const queryKnowledgeBase = useCallback(async (query: string, context?: Record<string, any>) => {
    try {
      const response = await apiClient('/learning/knowledge/query', {
        method: 'POST',
        body: JSON.stringify({
          query,
          context: context || {},
          max_results: 10,
        }),
      });

      return response;
    } catch (error) {
      throw error;
    }
  }, [apiClient]);

  const getObjectionHandlingGuide = useCallback(async (
    objectionType: string,
    methodology?: string,
    industry?: string
  ) => {
    try {
      const params = new URLSearchParams();
      if (methodology) params.append('methodology', methodology);
      if (industry) params.append('industry', industry);
      
      const queryString = params.toString();
      const endpoint = `/learning/knowledge/objections/${objectionType}${queryString ? '?' + queryString : ''}`;
      
      const response = await apiClient(endpoint);
      return response;
    } catch (error) {
      throw error;
    }
  }, [apiClient]);

  // Utility functions
  const dismissCoachingFeedback = useCallback((feedbackId: string) => {
    setState(prev => ({
      ...prev,
      realtimeCoachingFeedback: prev.realtimeCoachingFeedback.filter(
        feedback => feedback.feedback_id !== feedbackId
      ),
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-refresh performance metrics during active sessions
  useEffect(() => {
    if (realTimeUpdates && state.isSessionActive && state.currentSessionId) {
      metricsIntervalRef.current = setInterval(async () => {
        try {
          // Get latest session metrics without updating loading state
          const response = await apiClient(`/learning/sessions/active?user_id=${userId}`);
          const currentSession = state.currentSessionId ? response.active_sessions[state.currentSessionId] : null;
          
          if (currentSession) {
            setState(prev => ({
              ...prev,
              sessionMetrics: currentSession.session_metrics || prev.sessionMetrics,
              lastUpdated: new Date(),
            }));
          }
        } catch (error) {
          console.warn('Failed to refresh session metrics:', error);
        }
      }, metricsRefreshInterval);

      return () => {
        if (metricsIntervalRef.current) {
          clearInterval(metricsIntervalRef.current);
        }
      };
    }
  }, [realTimeUpdates, state.isSessionActive, state.currentSessionId, metricsRefreshInterval, apiClient, userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Auto-load performance analytics on mount
  useEffect(() => {
    getPerformanceAnalytics().catch(error => {
      console.warn('Failed to load initial performance analytics:', error);
    });
  }, [getPerformanceAnalytics]);

  return {
    // State
    ...state,
    
    // Session Management
    startLearningSession,
    endLearningSession,
    
    // Real-time Analysis
    analyzeConversation,
    enhanceResponse,
    
    // Analytics and Feedback
    getStructuredFeedback,
    getPerformanceAnalytics,
    
    // Knowledge Base
    queryKnowledgeBase,
    getObjectionHandlingGuide,
    
    // Utilities
    dismissCoachingFeedback,
    clearError,
    
    // Computed properties
    isInitialized: !state.isLoading && (state.performanceAnalytics !== null || state.error !== null),
    hasRealtimeFeedback: state.realtimeCoachingFeedback.length > 0,
    currentPerformanceScore: state.sessionMetrics.average_performance,
    skillGaps: Object.entries(state.skillProgression)
      .filter(([_, data]) => data.current_score < 3.0)
      .map(([skill]) => skill),
    strengths: Object.entries(state.skillProgression)
      .filter(([_, data]) => data.current_score >= 4.0)
      .map(([skill]) => skill),
  };
};

export default useLearningAnalytics;