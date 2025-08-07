/**
 * TypeScript types matching backend schemas
 * Auto-generated from backend/schemas/
 */

// User types from backend/schemas/user.py
export interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  job_title?: string;
  sales_persona?: SalesPersona;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  experience_level?: string;
  years_experience?: number;
  bio?: string;
  preferred_difficulty?: string;
  preferred_categories?: string;
  total_sessions: number;
  total_training_time: number;
  average_score?: number;
  last_login?: string;
  login_count: number;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'trainer' | 'trainee' | 'manager';
export type SalesPersona = 'SDR/BDR' | 'Account Executive' | 'Sales Manager' | 'Customer Success';

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  job_title?: string;
  sales_persona?: SalesPersona;
  role?: UserRole;
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  company?: string;
  job_title?: string;
  sales_persona?: SalesPersona;
  experience_level?: string;
  years_experience?: number;
  bio?: string;
  preferred_difficulty?: string;
  preferred_categories?: string;
}

// Scenario types from backend/schemas/scenario.py
export interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  difficulty: ScenarioDifficulty;
  category: ScenarioCategory;
  persona: SalesPersona;
  duration: string;
  estimated_duration_minutes?: number;
  objectives: string[];
  tags: string[];
  completion_count: number;
  average_score: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  initial_context?: string;
  conversation_framework?: ConversationFramework;
  evaluation_criteria?: EvaluationCriteria;
  created_at: string;
  updated_at: string;
}

export type ScenarioDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type ScenarioCategory = 'Cold Calling' | 'Objection Handling' | 'Closing' | 'Discovery' | 'Product Demo' | 'Negotiation';

export interface ConversationFramework {
  steps: ConversationStep[];
  coaching_points: string[];
  success_criteria: string[];
}

export interface ConversationStep {
  step_number: number;
  title: string;
  description: string;
  prompts: string[];
  expected_user_actions: string[];
  coaching_tips: string[];
}

export interface EvaluationCriteria {
  communication: CriteriaItem;
  technique: CriteriaItem;
  engagement: CriteriaItem;
  outcome: CriteriaItem;
}

export interface CriteriaItem {
  weight: number;
  description: string;
  scoring_guide: string[];
}

export interface ScenarioCreate {
  title: string;
  description: string;
  difficulty: ScenarioDifficulty;
  category: ScenarioCategory;
  persona: SalesPersona;
  duration: string;
  estimated_duration_minutes?: number;
  objectives: string[];
  tags: string[];
  initial_context?: string;
  conversation_framework?: ConversationFramework;
  evaluation_criteria?: EvaluationCriteria;
  is_featured?: boolean;
}

export interface ScenarioUpdate {
  title?: string;
  description?: string;
  difficulty?: ScenarioDifficulty;
  category?: ScenarioCategory;
  persona?: SalesPersona;
  duration?: string;
  estimated_duration_minutes?: number;
  objectives?: string[];
  tags?: string[];
  initial_context?: string;
  conversation_framework?: ConversationFramework;
  evaluation_criteria?: EvaluationCriteria;
  is_active?: boolean;
  is_featured?: boolean;
  sort_order?: number;
}

// Session types from backend/schemas/session.py
export interface TrainingSession {
  id: number;
  user_id: number;
  scenario_id: number;
  status: SessionStatus;
  session_token?: string;
  started_at?: number;
  completed_at?: number;
  duration_seconds: number;
  total_session_time: number;
  final_score?: number;
  score_breakdown?: ScoreBreakdown;
  messages?: ConversationMessage[];
  conversation_summary?: string;
  total_messages: number;
  user_message_count: number;
  ai_message_count: number;
  current_step: number;
  completed_steps?: CompletedStep[];
  real_time_feedback?: FeedbackItem[];
  audio_quality_score?: number;
  voice_activity_data?: VoiceActivityData;
  technical_issues?: TechnicalIssue[];
  ai_feedback?: AIFeedback[];
  human_feedback?: string;
  improvement_areas?: string[];
  strengths?: string[];
  is_practice_mode: boolean;
  difficulty_adjustments?: DifficultyAdjustment[];
  created_at: string;
  updated_at: string;
}

export type SessionStatus = 'created' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'failed';

export interface ConversationMessage {
  id: number;
  type: MessageType;
  content: string;
  timestamp: string;
  metadata?: MessageMetadata;
}

export type MessageType = 'user' | 'ai' | 'system';

export interface MessageMetadata {
  audio_duration?: number;
  confidence_score?: number;
  processing_time?: number;
  voice_quality?: number;
  [key: string]: any;
}

export interface ScoreBreakdown {
  communication?: number;
  technique?: number;
  engagement?: number;
  outcome?: number;
  overall?: number;
}

export interface CompletedStep {
  step: number;
  title: string;
  completed: boolean;
  feedback?: string;
  completed_at: string;
}

export interface FeedbackItem {
  feedback: string;
  type: string;
  timestamp: string;
  step: number;
}

export interface VoiceActivityData {
  average_volume: number;
  speaking_time_percentage: number;
  pause_count: number;
  longest_pause: number;
  speech_rate: number;
}

export interface TechnicalIssue {
  type: string;
  description: string;
  timestamp: string;
  resolved: boolean;
}

export interface AIFeedback {
  category: string;
  message: string;
  score: number;
  suggestions: string[];
  timestamp: string;
}

export interface DifficultyAdjustment {
  from_level: string;
  to_level: string;
  reason: string;
  timestamp: string;
}

export interface SessionCreate {
  scenario_id: number;
  is_practice_mode?: boolean;
}

export interface SessionUpdate {
  status?: SessionStatus;
  final_score?: number;
  score_breakdown?: ScoreBreakdown;
  conversation_summary?: string;
  ai_feedback?: AIFeedback[];
  human_feedback?: string;
  improvement_areas?: string[];
  strengths?: string[];
  completed_at?: number;
}

// Voice Processing Types
export interface VoiceProcessRequest {
  session_id: number;
  audio_data?: string;
  message?: string;
  step?: number;
  voice_config?: VoiceConfig;
}

export interface VoiceConfig {
  model_id?: string;
  voice_id?: string;
  stability?: number;
  similarity_boost?: number;
  speed?: number;
}

export interface VoiceProcessResponse {
  response_text: string;
  response_audio?: string;
  feedback?: string;
  next_step?: number;
  session_complete?: boolean;
  score_update?: number;
  coaching_tip?: string;
  processing_time?: number;
}

// Analytics Types
export interface SessionAnalytics {
  total_sessions: number;
  completed_sessions: number;
  average_score: number;
  total_training_time: number;
  completion_rate: number;
  improvement_trend: number;
  recent_sessions: TrainingSession[];
  score_by_category: Record<string, number>;
  progress_over_time: ProgressPoint[];
  top_strengths: string[];
  improvement_areas: string[];
  difficulty_distribution: Record<string, number>;
  persona_performance: Record<string, number>;
}

export interface ProgressPoint {
  date: string;
  score: number;
  sessions_completed: number;
}

export interface UserAnalytics extends SessionAnalytics {
  user_id: number;
  rank_percentile?: number;
  peer_comparison?: PeerComparison;
  achievement_badges?: Achievement[];
  learning_path_progress?: LearningPathProgress;
}

export interface PeerComparison {
  average_score: number;
  sessions_completed: number;
  time_spent: number;
  percentile_rank: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned_at: string;
  category: 'completion' | 'score' | 'streak' | 'improvement';
}

export interface LearningPathProgress {
  current_level: string;
  next_level: string;
  progress_percentage: number;
  skills_mastered: string[];
  skills_in_progress: string[];
  recommended_scenarios: string[];
}

// API Response wrapper types
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  status: number;
}

export interface ApiError {
  error: string;
  message: string;
  timestamp?: string;
  details?: any;
}

// Authentication types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
}

// Filter and query types
export interface ScenarioFilters {
  category?: ScenarioCategory | 'All';
  difficulty?: ScenarioDifficulty | 'All';
  persona?: SalesPersona | 'All';
  search?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

export interface SessionFilters {
  status?: SessionStatus;
  scenario_id?: number;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// WebSocket message types for real-time communication
export interface WebSocketMessage {
  type: 'audio' | 'text' | 'feedback' | 'system' | 'error';
  session_id: number;
  data: any;
  timestamp: string;
}

export interface AudioMessage {
  audio_data: string;
  format: 'wav' | 'mp3' | 'webm';
  sample_rate: number;
  duration?: number;
}

export interface FeedbackMessage {
  message: string;
  type: 'coaching' | 'encouragement' | 'correction' | 'technique';
  score_impact?: number;
  step_related?: number;
}

// Configuration types
export interface AppConfig {
  api_url: string;
  voice_enabled: boolean;
  claude_enabled: boolean;
  environment: 'development' | 'production' | 'staging';
  features: {
    real_time_coaching: boolean;
    voice_analytics: boolean;
    peer_comparison: boolean;
    achievement_system: boolean;
  };
  voice_settings: {
    sample_rate: number;
    chunk_size: number;
    silence_threshold: number;
    max_recording_time: number;
  };
}