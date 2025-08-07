/**
 * API client for frontend-backend communication
 * Handles authentication, scenarios, sessions, and voice processing
 */

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Authentication token management
let authToken: string | null = null;

interface ApiError {
  error: string;
  message: string;
  timestamp?: string;
  details?: any;
}

interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  status: number;
}

// Base API client class
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      authToken = localStorage.getItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Default headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data,
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: {
          error: 'Network Error',
          message: error instanceof Error ? error.message : 'Unknown network error',
        },
        status: 0,
      };
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Set authentication token
  setAuthToken(token: string | null) {
    authToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  // Get current auth token
  getAuthToken(): string | null {
    return authToken;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!authToken;
  }
}

// Create API client instance
const apiClient = new ApiClient();

// Authentication API
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  job_title?: string;
  sales_persona?: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  job_title?: string;
  sales_persona?: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  total_sessions: number;
  total_training_time: number;
  average_score: number;
  created_at: string;
  updated_at: string;
}

export const authApi = {
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await fetch(`${API_BASE_URL}/auth/token`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data, status: response.status };
    }

    // Set auth token on successful login
    apiClient.setAuthToken(data.access_token);

    return { data, status: response.status };
  },

  async register(userData: RegisterRequest): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/auth/register', userData);
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/auth/me');
  },

  async logout(): Promise<void> {
    apiClient.setAuthToken(null);
  },

  async refreshToken(): Promise<ApiResponse<{ access_token: string }>> {
    return apiClient.post<{ access_token: string }>('/auth/refresh');
  },
};

// Scenarios API
export interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: 'Cold Calling' | 'Objection Handling' | 'Closing' | 'Discovery' | 'Product Demo' | 'Negotiation';
  duration: string;
  objectives: string[];
  tags: string[];
  completionCount: number;
  averageScore: number;
  persona: 'SDR/BDR' | 'Account Executive' | 'Sales Manager' | 'Customer Success';
}

export interface ScenarioFilters {
  category?: string;
  difficulty?: string;
  persona?: string;
  search?: string;
}

export const scenarioApi = {
  async getAll(filters?: ScenarioFilters): Promise<ApiResponse<TrainingScenario[]>> {
    let endpoint = '/scenarios';
    
    if (filters) {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'All') params.append('category', filters.category);
      if (filters.difficulty && filters.difficulty !== 'All') params.append('difficulty', filters.difficulty);
      if (filters.persona && filters.persona !== 'All') params.append('persona', filters.persona);
      if (filters.search) params.append('search', filters.search);
      
      const queryString = params.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }
    }

    return apiClient.get<TrainingScenario[]>(endpoint);
  },

  async getById(id: string): Promise<ApiResponse<TrainingScenario>> {
    return apiClient.get<TrainingScenario>(`/scenarios/${id}`);
  },

  async getFeatured(): Promise<ApiResponse<TrainingScenario[]>> {
    return apiClient.get<TrainingScenario[]>('/scenarios/featured');
  },
};

// Sessions API
export interface TrainingSession {
  id: number;
  user_id: number;
  scenario_id: number;
  status: 'created' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'failed';
  session_token?: string;
  started_at?: number;
  completed_at?: number;
  duration_seconds: number;
  final_score?: number;
  score_breakdown?: Record<string, number>;
  messages?: Message[];
  conversation_summary?: string;
  total_messages: number;
  current_step: number;
  ai_feedback?: any[];
  improvement_areas?: string[];
  strengths?: string[];
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface CreateSessionRequest {
  scenario_id: number;
  is_practice_mode?: boolean;
}

export interface SessionAnalytics {
  total_sessions: number;
  completed_sessions: number;
  average_score: number;
  total_training_time: number;
  improvement_trend: number;
  recent_sessions: TrainingSession[];
  score_by_category: Record<string, number>;
  progress_over_time: Array<{ date: string; score: number }>;
}

export const sessionApi = {
  async create(data: CreateSessionRequest): Promise<ApiResponse<TrainingSession>> {
    return apiClient.post<TrainingSession>('/sessions', data);
  },

  async getById(id: number): Promise<ApiResponse<TrainingSession>> {
    return apiClient.get<TrainingSession>(`/sessions/${id}`);
  },

  async getUserSessions(limit = 20): Promise<ApiResponse<TrainingSession[]>> {
    return apiClient.get<TrainingSession[]>(`/sessions?limit=${limit}`);
  },

  async updateSession(id: number, data: Partial<TrainingSession>): Promise<ApiResponse<TrainingSession>> {
    return apiClient.put<TrainingSession>(`/sessions/${id}`, data);
  },

  async completeSession(id: number): Promise<ApiResponse<TrainingSession>> {
    return apiClient.post<TrainingSession>(`/sessions/${id}/complete`);
  },

  async pauseSession(id: number): Promise<ApiResponse<TrainingSession>> {
    return apiClient.post<TrainingSession>(`/sessions/${id}/pause`);
  },

  async resumeSession(id: number): Promise<ApiResponse<TrainingSession>> {
    return apiClient.post<TrainingSession>(`/sessions/${id}/resume`);
  },

  async getAnalytics(): Promise<ApiResponse<SessionAnalytics>> {
    return apiClient.get<SessionAnalytics>('/sessions/analytics');
  },

  async addMessage(sessionId: number, message: Omit<Message, 'id' | 'timestamp'>): Promise<ApiResponse<Message>> {
    return apiClient.post<Message>(`/sessions/${sessionId}/messages`, message);
  },
};

// Voice Processing API
export interface VoiceProcessRequest {
  session_id: number;
  audio_data?: string; // Base64 encoded audio
  message?: string;
  step?: number;
}

export interface VoiceProcessResponse {
  response_text: string;
  response_audio?: string; // Base64 encoded audio
  feedback?: string;
  next_step?: number;
  session_complete?: boolean;
  score_update?: number;
}

export const voiceApi = {
  async processVoice(data: VoiceProcessRequest): Promise<ApiResponse<VoiceProcessResponse>> {
    return apiClient.post<VoiceProcessResponse>('/voice/process', data);
  },

  async startVoiceSession(sessionId: number): Promise<ApiResponse<{ session_token: string }>> {
    return apiClient.post<{ session_token: string }>(`/voice/sessions/${sessionId}/start`);
  },

  async endVoiceSession(sessionId: number): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.post<{ success: boolean }>(`/voice/sessions/${sessionId}/end`);
  },
};

// Health check
export const healthApi = {
  async check(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return apiClient.get<{ status: string; timestamp: string }>('/health');
  },
};

// Export the main API client and all APIs
export default apiClient;
export { apiClient };

// Utility functions
export const handleApiError = (error: ApiError): string => {
  if (error.message) {
    return error.message;
  }
  if (error.error) {
    return error.error;
  }
  return 'An unexpected error occurred';
};

export const isAuthError = (status: number): boolean => {
  return status === 401 || status === 403;
};

// Auto-refresh token if needed
apiClient.setAuthToken(apiClient.getAuthToken());