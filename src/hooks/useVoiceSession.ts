/**
 * useVoiceSession Hook - React hook for voice session management
 * Provides voice session lifecycle management, audio recording/playback, and real-time feedback
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import VoiceClient, {
  VoiceMessage,
  VoiceSessionConfig,
  VoiceSessionStatus,
  ConversationMessage,
} from '../lib/voiceClient';

export interface VoiceSessionState {
  // Connection state
  sessionId: string | null;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  
  // Conversation data
  messages: ConversationMessage[];
  currentStep: number;
  stepProgress: StepProgress[];
  realTimeFeedback: string[];
  
  // Performance metrics
  latency: number;
  confidence: number;
  sessionDuration: number;
  
  // Error handling
  error: string | null;
  warnings: string[];
}

export interface StepProgress {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  feedback?: string;
}

export interface UseVoiceSessionOptions {
  apiBaseUrl?: string;
  autoConnect?: boolean;
  reconnectOnError?: boolean;
  latencyTarget?: number;
  enableAnalytics?: boolean;
}

export interface VoiceSessionCallbacks {
  onMessage?: (message: ConversationMessage) => void;
  onStateChange?: (state: string) => void;
  onError?: (error: string) => void;
  onStepComplete?: (step: number) => void;
  onFeedback?: (feedback: string) => void;
  onLatencyUpdate?: (latency: number) => void;
}

export function useVoiceSession(
  options: UseVoiceSessionOptions = {},
  callbacks: VoiceSessionCallbacks = {}
) {
  // Default options
  const {
    apiBaseUrl,
    autoConnect = false,
    reconnectOnError = true,
    latencyTarget = 2000,
    enableAnalytics = true,
  } = options;

  // Voice client instance
  const voiceClientRef = useRef<VoiceClient | null>(null);
  
  // Session state
  const [sessionState, setSessionState] = useState<VoiceSessionState>({
    sessionId: null,
    connectionState: 'disconnected',
    isConnected: false,
    isRecording: false,
    isProcessing: false,
    messages: [],
    currentStep: 1,
    stepProgress: [],
    realTimeFeedback: [],
    latency: 0,
    confidence: 0,
    sessionDuration: 0,
    error: null,
    warnings: [],
  });

  // Session timer
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);

  // Initialize voice client
  useEffect(() => {
    voiceClientRef.current = new VoiceClient(apiBaseUrl);
    
    // Set up callbacks
    const callbackId = 'useVoiceSession';
    
    voiceClientRef.current.addMessageCallback(callbackId, handleVoiceMessage);
    voiceClientRef.current.addStateCallback(callbackId, handleStateChange);
    voiceClientRef.current.addErrorCallback(callbackId, handleError);

    return () => {
      // Cleanup
      if (voiceClientRef.current) {
        voiceClientRef.current.removeMessageCallback(callbackId);
        voiceClientRef.current.removeStateCallback(callbackId);
        voiceClientRef.current.removeErrorCallback(callbackId);
        voiceClientRef.current.disconnect();
      }
      stopSessionTimer();
    };
  }, [apiBaseUrl]);

  // Handle voice messages from the client
  const handleVoiceMessage = useCallback((message: VoiceMessage) => {
    switch (message.type) {
      case 'transcript':
        handleTranscriptMessage(message);
        break;
      case 'audio':
        handleAudioMessage(message);
        break;
      case 'status':
        handleStatusMessage(message);
        break;
      default:
        console.log('Unhandled voice message:', message.type);
    }
  }, []);

  // Handle state changes
  const handleStateChange = useCallback((state: string) => {
    setSessionState(prev => ({
      ...prev,
      connectionState: state as any,
      isConnected: state === 'connected' || state === 'listening' || state === 'speaking',
      isRecording: state === 'speaking',
      isProcessing: state === 'speaking',
    }));

    // Invoke callback
    callbacks.onStateChange?.(state);
  }, [callbacks.onStateChange]);

  // Handle errors
  const handleError = useCallback((error: string) => {
    setSessionState(prev => ({
      ...prev,
      error,
      connectionState: 'error',
      isConnected: false,
    }));

    // Add to warnings
    addWarning(error);

    // Invoke callback
    callbacks.onError?.(error);
  }, [callbacks.onError]);

  // Handle transcript messages
  const handleTranscriptMessage = useCallback((message: VoiceMessage) => {
    const transcript = message.data?.transcript;
    const confidence = message.data?.confidence || 0;
    const isUser = message.data?.source === 'user';

    if (transcript) {
      const conversationMessage: ConversationMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: isUser ? 'user' : 'ai',
        content: transcript,
        timestamp: new Date(),
        confidence,
      };

      addMessage(conversationMessage);
    }
  }, []);

  // Handle audio messages
  const handleAudioMessage = useCallback((message: VoiceMessage) => {
    // Audio is handled automatically by the VoiceClient
    // Here we can track metrics and provide feedback
    
    const latency = message.data?.latency || 0;
    if (latency > 0) {
      updateLatency(latency);
    }
  }, []);

  // Handle status messages
  const handleStatusMessage = useCallback((message: VoiceMessage) => {
    const status = message.data as VoiceSessionStatus;
    if (status) {
      setSessionState(prev => ({
        ...prev,
        latency: status.performance_metrics.total_latency_ms,
      }));
    }
  }, []);

  // Session management functions
  const createSession = useCallback(async (config: VoiceSessionConfig): Promise<string> => {
    if (!voiceClientRef.current) {
      throw new Error('Voice client not initialized');
    }

    try {
      setSessionState(prev => ({ ...prev, error: null, connectionState: 'connecting' }));
      
      const sessionId = await voiceClientRef.current.createSession(config);
      
      setSessionState(prev => ({
        ...prev,
        sessionId,
        stepProgress: initializeStepProgress(config.scenario_type),
      }));

      // Auto-connect if enabled
      if (autoConnect) {
        await connect();
      }

      return sessionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
      handleError(errorMessage);
      throw error;
    }
  }, [autoConnect]);

  const connect = useCallback(async (): Promise<void> => {
    if (!voiceClientRef.current) {
      throw new Error('Voice client not initialized');
    }

    try {
      await voiceClientRef.current.connect();
      startSessionTimer();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect';
      handleError(errorMessage);
      throw error;
    }
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    if (voiceClientRef.current) {
      await voiceClientRef.current.disconnect();
    }
    stopSessionTimer();
    setSessionState(prev => ({
      ...prev,
      connectionState: 'disconnected',
      isConnected: false,
    }));
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    if (!voiceClientRef.current?.isConnected()) {
      throw new Error('Not connected to voice session');
    }

    try {
      await voiceClientRef.current.startRecording();
      setSessionState(prev => ({ ...prev, isRecording: true, error: null }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      handleError(errorMessage);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<void> => {
    if (voiceClientRef.current) {
      await voiceClientRef.current.stopRecording();
      setSessionState(prev => ({ ...prev, isRecording: false }));
    }
  }, []);

  const sendText = useCallback(async (text: string): Promise<void> => {
    if (!voiceClientRef.current?.isConnected()) {
      throw new Error('Not connected to voice session');
    }

    try {
      await voiceClientRef.current.sendText(text);
      
      // Add user message to conversation
      const message: ConversationMessage = {
        id: `msg_${Date.now()}_text`,
        type: 'user',
        content: text,
        timestamp: new Date(),
      };
      addMessage(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send text';
      handleError(errorMessage);
      throw error;
    }
  }, []);

  const endSession = useCallback(async (): Promise<void> => {
    if (voiceClientRef.current) {
      await voiceClientRef.current.endSession();
    }
    stopSessionTimer();
    
    setSessionState(prev => ({
      ...prev,
      sessionId: null,
      connectionState: 'disconnected',
      isConnected: false,
    }));
  }, []);

  // Get session status
  const getSessionStatus = useCallback(async (): Promise<VoiceSessionStatus | null> => {
    if (!voiceClientRef.current) {
      return null;
    }
    return await voiceClientRef.current.getSessionStatus();
  }, []);

  // Helper functions
  const addMessage = useCallback((message: ConversationMessage) => {
    setSessionState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));

    // Update step progress
    updateStepProgress(message);
    
    // Invoke callback
    callbacks.onMessage?.(message);
  }, [callbacks.onMessage]);

  const addWarning = useCallback((warning: string) => {
    setSessionState(prev => ({
      ...prev,
      warnings: [...prev.warnings, warning],
    }));
  }, []);

  const updateLatency = useCallback((latency: number) => {
    setSessionState(prev => ({ ...prev, latency }));
    
    // Check if latency exceeds target
    if (latency > latencyTarget) {
      addWarning(`High latency detected: ${latency}ms (target: ${latencyTarget}ms)`);
    }

    callbacks.onLatencyUpdate?.(latency);
  }, [latencyTarget, callbacks.onLatencyUpdate]);

  const updateStepProgress = useCallback((message: ConversationMessage) => {
    setSessionState(prev => {
      const messageCount = prev.messages.filter(m => m.type === 'user').length + 1;
      
      // Simple step progression logic (matches Mollick framework)
      let newCurrentStep = prev.currentStep;
      const updatedSteps = [...prev.stepProgress];

      if (messageCount >= 1 && !updatedSteps[0]?.completed) {
        updatedSteps[0].completed = true;
        newCurrentStep = Math.max(newCurrentStep, 2);
      }
      if (messageCount >= 2 && !updatedSteps[1]?.completed) {
        updatedSteps[1].completed = true;
        newCurrentStep = Math.max(newCurrentStep, 3);
      }
      if (messageCount >= 4 && !updatedSteps[2]?.completed) {
        updatedSteps[2].completed = true;
        newCurrentStep = Math.max(newCurrentStep, 4);
      }
      if (messageCount >= 6 && !updatedSteps[3]?.completed) {
        updatedSteps[3].completed = true;
        newCurrentStep = Math.max(newCurrentStep, 5);
      }

      // Invoke callback if step changed
      if (newCurrentStep !== prev.currentStep) {
        callbacks.onStepComplete?.(newCurrentStep);
      }

      return {
        ...prev,
        currentStep: newCurrentStep,
        stepProgress: updatedSteps,
      };
    });
  }, [callbacks.onStepComplete]);

  const startSessionTimer = useCallback(() => {
    sessionStartTimeRef.current = Date.now();
    sessionTimerRef.current = setInterval(() => {
      if (sessionStartTimeRef.current) {
        const duration = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        setSessionState(prev => ({ ...prev, sessionDuration: duration }));
      }
    }, 1000);
  }, []);

  const stopSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    sessionStartTimeRef.current = null;
  }, []);

  const initializeStepProgress = useCallback((scenarioType: string): StepProgress[] => {
    return [
      {
        step: 1,
        title: 'Context Gathering',
        description: 'AI gathers information about your role and experience',
        completed: false,
      },
      {
        step: 2,
        title: 'Scenario Selection',
        description: 'Training scenario and objectives are established',
        completed: true, // Already completed by scenario selection
      },
      {
        step: 3,
        title: 'Scene Setting',
        description: 'Immersive business environment is created',
        completed: false,
      },
      {
        step: 4,
        title: 'Interactive Role-Play',
        description: 'Engaging in realistic sales conversation',
        completed: false,
      },
      {
        step: 5,
        title: 'Structured Feedback',
        description: 'Performance assessment and coaching advice',
        completed: false,
      },
      {
        step: 6,
        title: 'Extended Learning',
        description: 'Reflection and next steps for improvement',
        completed: false,
      },
    ];
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setSessionState(prev => ({ ...prev, error: null }));
  }, []);

  // Clear warnings
  const clearWarnings = useCallback(() => {
    setSessionState(prev => ({ ...prev, warnings: [] }));
  }, []);

  // Get formatted session duration
  const getFormattedDuration = useCallback(() => {
    const { sessionDuration } = sessionState;
    const minutes = Math.floor(sessionDuration / 60);
    const seconds = sessionDuration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [sessionState.sessionDuration]);

  // Check if session is ready for recording
  const isReadyForRecording = useCallback(() => {
    return sessionState.isConnected && 
           !sessionState.isRecording && 
           !sessionState.isProcessing &&
           !sessionState.error;
  }, [sessionState.isConnected, sessionState.isRecording, sessionState.isProcessing, sessionState.error]);

  return {
    // Session state
    sessionState,
    
    // Session management
    createSession,
    connect,
    disconnect,
    endSession,
    getSessionStatus,
    
    // Recording controls
    startRecording,
    stopRecording,
    sendText,
    
    // Utilities
    clearError,
    clearWarnings,
    getFormattedDuration,
    isReadyForRecording,
    
    // Current session info
    isConnected: sessionState.isConnected,
    isRecording: sessionState.isRecording,
    sessionId: sessionState.sessionId,
    messages: sessionState.messages,
    error: sessionState.error,
  };
}

export default useVoiceSession;