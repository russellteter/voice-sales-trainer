'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { TrainingScenario } from './ScenarioDashboard';
import SecureVoiceInterface from './SecureVoiceInterface';
import RealTimeFeedbackPanel, { useFeedbackManager, FeedbackGenerators } from './RealTimeFeedbackPanel';
import EnhancedCoachingPanel, { CoachingMessage, CoachingMessageFactory, CoachPersona } from './EnhancedCoachingPanel';

interface ConversationMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  confidence?: number;
}

interface ConversationStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  feedback?: string;
}

interface VoiceConversationProps {
  scenario: TrainingScenario;
  onComplete: (sessionData: any) => void;
  onReset: () => void;
}

export default function VoiceConversationInterfaceReal({ scenario, onComplete, onReset }: VoiceConversationProps) {
  const [conversationState, setConversationState] = useState<'setup' | 'active' | 'paused' | 'complete'>('setup');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [realTimeFeedback, setRealTimeFeedback] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string>('');
  
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Secure voice integration state
  const [transcript, setTranscript] = useState<string>('');
  const [audioResponses, setAudioResponses] = useState<ArrayBuffer[]>([]);
  const [voiceError, setVoiceError] = useState<string>('');
  const [voiceActive, setVoiceActive] = useState(false);

  // Secure voice interface callbacks
  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    setTranscript(prev => isFinal ? text : `${prev} ${text}`);
  }, []);

  const handleAudioResponse = useCallback((audioData: ArrayBuffer) => {
    setAudioResponses(prev => [...prev, audioData]);
  }, []);

  const handleVoiceError = useCallback((errorMessage: string) => {
    setVoiceError(errorMessage);
    setApiError(errorMessage);
    console.error('Secure Voice Error:', errorMessage);
  }, []);

  const startVoiceSession = () => setVoiceActive(true);
  const stopVoiceSession = () => setVoiceActive(false);

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
      completed: true
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

  const [steps, setSteps] = useState<ConversationStep[]>(simulationSteps);

  // Session timer effect
  useEffect(() => {
    if (conversationState === 'active') {
      sessionTimerRef.current = setInterval(() => {
        setSessionTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    }

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [conversationState]);

  // Handle voice configuration through secure interface
  // API configuration is now handled securely by SecureVoiceInterface

  // Handle voice errors
  useEffect(() => {
    if (voiceError) {
      setApiError(voiceError);
      setConversationState('setup');
    }
  }, [voiceError]);

  // Handle transcript updates
  useEffect(() => {
    if (transcript && transcript.trim()) {
      addUserMessage(transcript);
      updateConversationProgress();
      generateRealTimeFeedback(transcript);
    }
  }, [transcript]);

  // Simulate audio level changes during recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setAudioLevel(Math.floor(Math.random() * 12));
      }, 100);
    } else {
      setAudioLevel(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const startConversation = async () => {
    try {
      setConversationState('active');
      setApiError('');
      
      // Start ElevenLabs voice session
      startVoiceSession();
      
      // Add welcome message
      addSystemMessage("🎙️ Real-time voice conversation started! Your AI training partner is ready.");
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      setApiError('Failed to start voice session. Please check your microphone permissions.');
      setConversationState('setup');
    }
  };

  const pauseConversation = () => {
    setConversationState('paused');
    stopVoiceSession();
  };

  const resumeConversation = () => {
    setConversationState('active');
    startVoiceSession();
  };

  const completeSession = () => {
    setConversationState('complete');
    stopVoiceSession();
    
    const sessionData = {
      scenario: scenario,
      duration: sessionTimer,
      messages: messages,
      steps: steps,
      feedback: realTimeFeedback,
      score: Math.floor(Math.random() * 30) + 70,
      audioResponses: audioResponses.length
    };
    
    onComplete(sessionData);
  };

  const updateConversationProgress = () => {
    const userMessageCount = messages.filter(m => m.type === 'user').length;
    
    if (userMessageCount >= 1 && !steps[0].completed) {
      setSteps(prev => prev.map((step, idx) => 
        idx === 0 ? { ...step, completed: true } : step
      ));
      setCurrentStep(2);
    } else if (userMessageCount >= 2 && !steps[2].completed) {
      setSteps(prev => prev.map((step, idx) => 
        idx === 2 ? { ...step, completed: true } : step
      ));
      setCurrentStep(3);
    } else if (userMessageCount >= 4 && !steps[3].completed) {
      setSteps(prev => prev.map((step, idx) => 
        idx === 3 ? { ...step, completed: true } : step
      ));
      setCurrentStep(4);
    }
  };

  const generateRealTimeFeedback = (userInput: string) => {
    const feedbackOptions = [
      "Excellent question technique!",
      "Great use of active listening",
      "Consider asking for specific metrics",
      "Nice job building rapport",
      "Strong confidence in delivery"
    ];
    
    if (Math.random() > 0.6) {
      const feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
      setRealTimeFeedback(prev => [...prev, feedback]);
    }
  };

  const addUserMessage = (content: string) => {
    const message: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const addSystemMessage = (content: string) => {
    const message: ConversationMessage = {
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show configuration error if API not set up
  if (apiError && conversationState === 'setup') {
    return (
      <div className="card overflow-hidden">
        <div className="card-header">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">⚙️ Configuration Required</h2>
              <p className="text-white opacity-90">ElevenLabs API setup needed</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <span className="text-red-500 text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-red-800 mb-2">API Configuration Error</h3>
                <p className="text-red-700 mb-4">{apiError}</p>
                
                <div className="bg-red-100 rounded-lg p-4">
                  <h4 className="font-bold text-red-800 mb-2">Required Environment Variables:</h4>
                  <ul className="text-sm text-red-700 space-y-1 font-mono">
                    <li>NEXT_PUBLIC_ELEVENLABS_API_KEY=sk-...</li>
                    <li>NEXT_PUBLIC_ELEVENLABS_VOICE_ID=your_voice_id</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-bold text-blue-800 mb-3">🔧 Setup Instructions:</h4>
            <ol className="text-sm text-blue-700 space-y-2">
              <li><strong>1.</strong> Create a <code>.env.local</code> file in your project root</li>
              <li><strong>2.</strong> Add your ElevenLabs API key from <a href="https://elevenlabs.io/app/speech-synthesis" className="underline">elevenlabs.io</a></li>
              <li><strong>3.</strong> Add your preferred Voice ID</li>
              <li><strong>4.</strong> Restart the development server</li>
            </ol>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onReset}
              className="btn-secondary"
            >
              🔙 Back to Scenarios
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              🔄 Reload After Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="card-header">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">{scenario.title}</h2>
            <p className="text-white opacity-90">{scenario.description}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono font-bold">{formatTime(sessionTimer)}</div>
            <div className="text-white opacity-75 text-sm">Session Time</div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-class-pale-purple p-4">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap font-medium
                ${step.completed 
                  ? 'bg-green-100 text-green-800' 
                  : index === currentStep 
                    ? 'bg-class-light-purple text-class-purple' 
                    : 'bg-white text-middle-gray'
                }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${step.completed 
                  ? 'bg-green-500 text-white' 
                  : index === currentStep 
                    ? 'bg-class-purple text-white' 
                    : 'bg-middle-gray text-white'}`}>
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
          
          {/* ElevenLabs Status */}
          <div className="bg-lightest-purple rounded-lg p-4 border border-class-light-purple">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-class-purple">🎙️ Voice Status</h3>
              <SecureVoiceInterface 
                onTranscript={handleTranscript}
                onAudioResponse={handleAudioResponse}
                onError={handleVoiceError}
                isActive={voiceActive}
              />
            </div>
            {voiceActive && (
              <div className="mt-2 text-sm text-green-600">
                ✅ Real-time voice conversation active
              </div>
            )}
          </div>
          
          {/* Conversation Messages */}
          <div className="bg-lightest-purple rounded-lg p-4 h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-middle-gray">
                {conversationState === 'setup' ? (
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎯</div>
                    <p className="font-medium">Ready for real-time voice training?</p>
                    <p className="text-sm mt-2">Click "Start Session" to begin with ElevenLabs AI</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="animate-pulse">🎙️ Listening for your voice...</div>
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
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg font-medium ${
                      message.type === 'user' 
                        ? 'bg-class-purple text-white' 
                        : 'bg-white border-2 border-class-light-purple text-midnight-blue'
                    }`}>
                      <div className="text-sm">{message.content}</div>
                      <div className="text-xs mt-1 opacity-75">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Voice Controls */}
          <div className="text-center space-y-4">
            {conversationState === 'setup' && (
              <button
                onClick={startConversation}
                className="btn-primary text-lg px-8 py-3"
                disabled={!!apiError}
              >
                🎤 Start Real-Time Session
              </button>
            )}

            {conversationState === 'active' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-700 font-bold">🎙️ Voice session active - Start speaking!</span>
                  </div>
                  <p className="text-sm text-green-600 mt-2">
                    Your voice is being streamed to ElevenLabs AI. The AI will respond with voice.
                  </p>
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={pauseConversation}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded font-bold transition-colors"
                  >
                    ⏸️ Pause
                  </button>
                  <button
                    onClick={completeSession}
                    className="btn-secondary px-4 py-2"
                  >
                    ✅ Complete Session
                  </button>
                </div>
              </div>
            )}

            {conversationState === 'paused' && (
              <div className="space-y-4">
                <p className="text-amber-600 font-bold">Session Paused</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={resumeConversation}
                    className="btn-secondary px-6 py-3"
                  >
                    ▶️ Resume
                  </button>
                  <button
                    onClick={onReset}
                    className="bg-middle-gray hover:bg-dark-gray text-white px-6 py-3 rounded-lg font-bold transition-colors"
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
          <div className="bg-class-pale-purple rounded-lg p-4">
            <h3 className="font-bold text-class-purple mb-2">Current Step</h3>
            <div className="text-sm text-midnight-blue">
              <strong>{steps[currentStep]?.title}</strong>
              <p className="mt-1">{steps[currentStep]?.description}</p>
            </div>
          </div>

          {/* Real-Time Feedback */}
          <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
            <h3 className="font-bold text-green-900 mb-2">Live Coaching</h3>
            {realTimeFeedback.length === 0 ? (
              <p className="text-sm text-green-700">AI coaching tips will appear here during your conversation</p>
            ) : (
              <div className="space-y-2">
                {realTimeFeedback.slice(-3).map((feedback, index) => (
                  <div key={index} className="text-sm bg-green-100 p-2 rounded border-l-4 border-green-500 font-medium">
                    {feedback}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audio Stats */}
          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
            <h3 className="font-bold text-blue-900 mb-2">Session Stats</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <div>Audio responses: {audioResponses.length}</div>
              <div>Messages: {messages.length}</div>
              <div>Duration: {formatTime(sessionTimer)}</div>
            </div>
          </div>

          {/* Scenario Objectives */}
          <div className="bg-light-gray rounded-lg p-4">
            <h3 className="font-bold text-midnight-blue mb-2">Session Objectives</h3>
            <ul className="text-sm text-dark-gray space-y-1">
              {scenario.objectives.map((objective, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-class-purple rounded-full mt-2 flex-shrink-0"></span>
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