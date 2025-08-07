'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { TrainingScenario } from '../lib/api';
import useVoiceSession, { VoiceSessionCallbacks, VoiceSessionState } from '../hooks/useVoiceSession';
import useLearningAnalytics, { LearningSessionConfig, ConversationAnalysis, RealTimeCoachingFeedback } from '../hooks/useLearningAnalytics';
import { ConversationMessage } from '../lib/voiceClient';

// ConversationMessage interface now imported from voiceClient

interface ConversationStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  feedback?: string;
}

interface VoiceConversationProps {
  scenario: TrainingScenario;
  onComplete: (sessionData: { score: number; feedback: string[]; duration: number }) => void;
  onReset: () => void;
}

export default function VoiceConversationInterface({ scenario, onComplete, onReset }: VoiceConversationProps) {
  const [conversationState, setConversationState] = useState<'setup' | 'active' | 'paused' | 'complete'>('setup');
  const [voiceActivityLevel, setVoiceActivityLevel] = useState(0);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [userId] = useState('demo_user'); // In real app, this would come from auth
  
  // Learning Analytics Integration
  const learningAnalytics = useLearningAnalytics({
    userId,
    realTimeUpdates: true,
    metricsRefreshInterval: 3000,
  });
  
  // Voice session callbacks
  const voiceCallbacks: VoiceSessionCallbacks = {
    onMessage: async (message: ConversationMessage) => {
      console.log('Received message:', message);
      
      // Analyze conversation turns with Claude learning intelligence
      if (message.type === 'user' && messages.length > 0) {
        try {
          // Get the previous AI response to analyze the conversation turn
          const aiMessages = messages.filter(m => m.type === 'ai');
          const lastAiResponse = aiMessages[aiMessages.length - 1];
          
          if (lastAiResponse) {
            // Analyze the conversation turn
            const analysisResult = await learningAnalytics.analyzeConversation(
              message.content,
              lastAiResponse.content
            );
            
            console.log('Conversation analysis:', analysisResult);
          }
        } catch (error) {
          console.error('Failed to analyze conversation:', error);
        }
      }
      
      // Enhance AI responses if this is user input
      if (message.type === 'user' && learningAnalytics.isSessionActive) {
        try {
          const enhancementResult = await learningAnalytics.enhanceResponse(message.content);
          console.log('Response enhancement:', enhancementResult);
        } catch (error) {
          console.error('Failed to enhance response:', error);
        }
      }
    },
    onStateChange: (state: string) => {
      console.log('Voice state changed:', state);
      if (state === 'speaking') {
        setIsAIResponding(false);
      } else if (state === 'listening') {
        setIsAIResponding(true);
      }
    },
    onError: (error: string) => {
      console.error('Voice session error:', error);
      alert(`Voice error: ${error}`);
    },
    onStepComplete: (step: number) => {
      console.log('Step completed:', step);
    },
    onFeedback: (feedback: string) => {
      console.log('Received feedback:', feedback);
    },
  };
  
  // Initialize voice session
  const {
    sessionState,
    createSession,
    connect,
    disconnect,
    endSession,
    startRecording,
    stopRecording,
    sendText,
    isConnected,
    isRecording,
    messages,
    error,
    getFormattedDuration,
    clearError
  } = useVoiceSession(
    {
      apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      autoConnect: true,
      latencyTarget: 2000,
    },
    voiceCallbacks
  );
  
  // Learning session management
  const startLearningSession = useCallback(async () => {
    try {
      const sessionConfig: LearningSessionConfig = {
        scenario_type: scenario.category,
        prospect_persona: scenario.persona || 'enterprise_vp',
        difficulty_level: mapDifficultyToNumber(scenario.difficulty),
        learning_objectives: scenario.objectives,
        company_context: {
          scenario_title: scenario.title,
          scenario_description: scenario.description,
        },
        user_preferences: {
          real_time_coaching: true,
          feedback_frequency: 'moderate',
        },
      };

      const sessionId = await learningAnalytics.startLearningSession(sessionConfig);
      console.log('Started learning session:', sessionId);
      
      return sessionId;
    } catch (error) {
      console.error('Failed to start learning session:', error);
      throw error;
    }
  }, [scenario, learningAnalytics]);

  const endLearningSession = useCallback(async () => {
    if (!learningAnalytics.currentSessionId) return;

    try {
      const finalReport = await learningAnalytics.endLearningSession(learningAnalytics.currentSessionId);
      console.log('Learning session ended:', finalReport);
      
      // Call the parent onComplete callback with learning results
      onComplete({
        score: learningAnalytics.currentPerformanceScore || 0,
        feedback: learningAnalytics.realtimeCoachingFeedback.map(f => f.message),
        duration: sessionState.sessionDuration || 0,
      });
      
      return finalReport;
    } catch (error) {
      console.error('Failed to end learning session:', error);
      throw error;
    }
  }, [learningAnalytics, sessionState.sessionDuration, onComplete]);

  // Six-step simulation framework steps
  const simulationSteps: ConversationStep[] = [
    {
      step: 1,
      title: 'Context Gathering',
      description: 'AI asks about your role, experience, and goals',
      completed: false
    },
    {
      step: 2,
      title: 'Scenario Selection',
      description: 'Scenario context and objectives are set',
      completed: true // This is already done by scenario selection
    },
    {
      step: 3,
      title: 'Scene Setting',
      description: 'Immersive business environment is established',
      completed: false
    },
    {
      step: 4,
      title: 'Interactive Role-Play',
      description: '5-6 conversational turns with adaptive responses',
      completed: false
    },
    {
      step: 5,
      title: 'Structured Feedback',
      description: 'Performance assessment and coaching',
      completed: false
    },
    {
      step: 6,
      title: 'Extended Learning',
      description: 'Reflection and next steps',
      completed: false
    }
  ];

  // Steps are now managed by the voice session
  const steps = sessionState.stepProgress;
  const currentStep = sessionState.currentStep - 1; // Convert to 0-based indexing
  const sessionTimer = sessionState.sessionDuration;

  // Session timer is now handled by useVoiceSession hook

  // Voice activity detection is now handled by the VoiceClient

  const startConversation = async () => {
    try {
      clearError();
      
      // Start the learning session first
      await startLearningSession();
      
      // Determine voice session configuration based on scenario
      const sessionConfig = {
        scenario_type: determineScenarioType(scenario),
        scenario_config: {
          prospect_type: determineProspectType(scenario),
          difficulty_level: mapDifficultyToNumber(scenario.difficulty),
          training_objectives: scenario.objectives || [],
        },
        voice_id: 'default',
        max_duration: 1800, // 30 minutes
      };
      
      // Create and connect to voice session
      await createSession(sessionConfig);
      setConversationState('active');
      
      console.log('Voice conversation and learning session started');
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Could not start voice session. Please check your connection and try again.');
    }
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
      // Voice activity detection is handled by VoiceClient
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not start recording. Please check microphone permissions.');
    }
  };

  const handleStopRecording = async () => {
    try {
      await stopRecording();
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  // Speech processing is now handled by the voice pipeline

  // Mock responses are no longer needed - using real voice processing

  // AI responses are now handled by the ElevenLabs pipeline

  // Contextual responses are generated by Claude in the backend pipeline

  const generateRealTimeFeedback = (userInput: string): string | null => {
    // Enhanced feedback generation based on actual user input
    const input = userInput.toLowerCase();
    
    if (input.includes('?')) {
      return "Great use of questions to engage the prospect!";
    }
    if (input.includes('understand') || input.includes('appreciate')) {
      return "Excellent acknowledgment of the prospect's concerns!";
    }
    if (input.includes('roi') || input.includes('value') || input.includes('benefit')) {
      return "Good focus on value proposition and ROI!";
    }
    if (input.includes('experience') || input.includes('challenge')) {
      return "Nice discovery question to understand their situation!";
    }
    if (userInput.length < 20) {
      return "Try to provide more detailed responses to show engagement.";
    }
    
    return Math.random() > 0.6 ? "Keep building momentum in the conversation!" : null;
  };

  // Helper functions
  const determineScenarioType = (scenario: TrainingScenario): 'coach' | 'prospect' => {
    // Determine if this should be a coaching session or prospect roleplay
    if (scenario.category.toLowerCase().includes('coach') || 
        scenario.category.toLowerCase().includes('training')) {
      return 'coach';
    }
    return 'prospect';
  };

  const determineProspectType = (scenario: TrainingScenario): 'enterprise' | 'smb' | 'startup' => {
    const title = scenario.title.toLowerCase();
    if (title.includes('enterprise') || title.includes('vp') || title.includes('large')) {
      return 'enterprise';
    }
    if (title.includes('startup') || title.includes('founder')) {
      return 'startup';
    }
    return 'smb'; // Default to small/medium business
  };

  const mapDifficultyToNumber = (difficulty: string | undefined): number => {
    switch (difficulty) {
      case 'Beginner': return 1;
      case 'Intermediate': return 2;
      case 'Advanced': return 3;
      default: return 2; // Default to intermediate
    }
  };

  const calculateSessionScore = (): number => {
    // Calculate score based on conversation metrics
    const baseScore = 70;
    const messageBonus = Math.min(messages.length * 2, 20); // Up to 20 points for engagement
    const feedbackBonus = learningAnalytics.realtimeCoachingFeedback.length; // 1 point per feedback
    const latencyPenalty = sessionState.latency > 3000 ? -5 : 0; // Penalty for high latency
    
    return Math.min(100, Math.max(0, baseScore + messageBonus + feedbackBonus + latencyPenalty));
  };

  // Message handling is now managed by the voice session

  const completeSession = async () => {
    try {
      // End voice session
      await endSession();
      
      // End learning session and get final report
      await endLearningSession();
      
      setConversationState('complete');
      
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  // Time formatting is handled by useVoiceSession hook

  const pauseConversation = async () => {
    try {
      if (isRecording) {
        await handleStopRecording();
      }
      await disconnect();
      setConversationState('paused');
    } catch (error) {
      console.error('Error pausing conversation:', error);
    }
  };

  const resumeConversation = async () => {
    try {
      await connect();
      setConversationState('active');
    } catch (error) {
      console.error('Error resuming conversation:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">{scenario.title}</h2>
            <p className="text-blue-100">{scenario.description}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono">{getFormattedDuration()}</div>
            <div className="text-blue-100 text-sm">Session Time</div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-gray-50 p-4">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap
                ${step.completed 
                  ? 'bg-green-100 text-green-800' 
                  : index === currentStep 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-200 text-gray-600'
                }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${step.completed ? 'bg-green-500 text-white' : index === currentStep ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'}`}>
                {step.completed ? '✓' : step.step}
              </span>
              <span>{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        
        {/* Conversation Interface */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Conversation Messages */}
          <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                {conversationState === 'setup' ? (
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎯</div>
                    <p>Ready to start your training session?</p>
                    <p className="text-sm mt-2">Click &ldquo;Start Session&rdquo; to begin</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="animate-pulse">Preparing conversation...</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : message.type === 'ai'
                        ? 'bg-white border border-gray-200'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      <div className="text-sm">{message.content}</div>
                      {message.confidence && (
                        <div className="text-xs mt-1 opacity-75">
                          Confidence: {Math.round(message.confidence * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isAIResponding && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-bounce">●</div>
                        <div className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</div>
                        <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</div>
                        <span className="text-sm text-gray-500 ml-2">AI is responding...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Voice Controls */}
          <div className="text-center space-y-4">
            {conversationState === 'setup' && (
              <div className="space-y-4">
                <button
                  onClick={startConversation}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
                  disabled={sessionState.connectionState === 'connecting'}
                >
                  {sessionState.connectionState === 'connecting' ? '🔄 Connecting...' : '🎤 Start Session'}
                </button>
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p className="text-sm">⚠️ {error}</p>
                    <button 
                      onClick={clearError}
                      className="text-red-600 underline text-sm mt-1"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )}

            {conversationState === 'active' && (
              <div className="space-y-4">
                {/* Connection Status */}
                <div className={`text-sm px-4 py-2 rounded-lg ${
                  isConnected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isConnected ? '🟢 Connected to Voice AI' : '🟡 Connecting...'}
                </div>
                
                {!isRecording && !isAIResponding && isConnected && (
                  <button
                    onClick={handleStartRecording}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    🎤 Start Speaking
                  </button>
                )}
                
                {!isConnected && (
                  <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    <p className="text-sm">⚠️ Voice connection lost. Attempting to reconnect...</p>
                  </div>
                )}

                {isRecording && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-4">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-600 font-medium">Recording...</span>
                    </div>
                    
                    {/* Voice Activity Indicator */}
                    <div className="flex items-center justify-center space-x-2">
                      <div className="text-sm text-gray-600">Voice Level:</div>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all duration-100"
                          style={{ width: `${voiceActivityLevel * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleStopRecording}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      ⏹️ Stop Speaking
                    </button>
                  </div>
                )}

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={pauseConversation}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    ⏸️ Pause
                  </button>
                  <button
                    onClick={completeSession}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors"
                  >
                    ✅ Complete Session
                  </button>
                </div>
              </div>
            )}

            {conversationState === 'paused' && (
              <div className="space-y-4">
                <p className="text-yellow-600 font-medium">Session Paused</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={resumeConversation}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    ▶️ Resume
                  </button>
                  <button
                    onClick={onReset}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    🔄 Restart
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-Time Feedback Panel */}
        <div className="space-y-6">
          
          {/* Current Step */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Current Step</h3>
            <div className="text-sm text-blue-800">
              <strong>{steps[currentStep]?.title}</strong>
              <p className="mt-1">{steps[currentStep]?.description}</p>
            </div>
          </div>

          {/* Real-Time Coaching Feedback */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-2">Live Coaching</h3>
            {learningAnalytics.realtimeCoachingFeedback.length === 0 ? (
              <p className="text-sm text-green-700">Coaching tips will appear here during the conversation</p>
            ) : (
              <div className="space-y-2">
                {learningAnalytics.realtimeCoachingFeedback.slice(-3).map((feedback, index) => (
                  <div 
                    key={feedback.feedback_id} 
                    className={`text-sm p-3 rounded border-l-4 ${
                      feedback.priority >= 4 
                        ? 'bg-red-100 border-red-500 text-red-800' 
                        : feedback.priority >= 3 
                        ? 'bg-yellow-100 border-yellow-500 text-yellow-800'
                        : 'bg-green-100 border-green-500 text-green-800'
                    }`}
                  >
                    <div className="font-medium text-xs uppercase mb-1">
                      {feedback.trigger_type.replace('_', ' ')} • Priority {feedback.priority}
                    </div>
                    <div>{feedback.message}</div>
                    {feedback.coaching_hint && (
                      <div className="mt-2 text-xs opacity-75">
                        💡 {feedback.coaching_hint}
                      </div>
                    )}
                    {feedback.socratic_question && (
                      <div className="mt-2 text-xs italic">
                        🤔 {feedback.socratic_question}
                      </div>
                    )}
                    <button
                      onClick={() => learningAnalytics.dismissCoachingFeedback(feedback.feedback_id)}
                      className="text-xs opacity-50 hover:opacity-100 mt-1"
                    >
                      ✕ Dismiss
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance Analytics */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Performance Metrics</h3>
            {learningAnalytics.isSessionActive ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Current Score:</span>
                  <span className="font-medium text-blue-900">
                    {learningAnalytics.currentPerformanceScore ? 
                      `${(learningAnalytics.currentPerformanceScore * 20).toFixed(1)}%` : 
                      'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Conversation Turns:</span>
                  <span className="font-medium text-blue-900">
                    {learningAnalytics.sessionMetrics.turn_count}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Engagement:</span>
                  <span className="font-medium text-blue-900">
                    {learningAnalytics.sessionMetrics.engagement_score ? 
                      `${(learningAnalytics.sessionMetrics.engagement_score * 100).toFixed(0)}%` : 
                      'N/A'
                    }
                  </span>
                </div>
                {learningAnalytics.strengths.length > 0 && (
                  <div className="text-xs">
                    <div className="text-blue-700 font-medium">Strengths:</div>
                    <div className="text-blue-600">
                      {learningAnalytics.strengths.map(skill => 
                        skill.replace('_', ' ')
                      ).join(', ')}
                    </div>
                  </div>
                )}
                {learningAnalytics.skillGaps.length > 0 && (
                  <div className="text-xs">
                    <div className="text-blue-700 font-medium">Focus Areas:</div>
                    <div className="text-blue-600">
                      {learningAnalytics.skillGaps.map(skill => 
                        skill.replace('_', ' ')
                      ).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-blue-700">Metrics will appear when session is active</p>
            )}
          </div>

          {/* Scenario Objectives */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Session Objectives</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {scenario.objectives.map((objective, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}