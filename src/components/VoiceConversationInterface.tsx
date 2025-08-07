'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { TrainingScenario } from './ScenarioDashboard';
import VoiceStatusIndicator, { useVoiceStatus, type VoiceStatusData } from './VoiceStatusIndicator';
import VoiceErrorHandler, { VoiceErrors, type VoiceError } from './VoiceErrorHandler';
import RealTimeFeedbackPanel, { useFeedbackManager, FeedbackGenerators } from './RealTimeFeedbackPanel';
import VoiceControlPanel, { MobileVoiceButton, type VoiceControlState } from './VoiceControlPanel';

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

export default function VoiceConversationInterface({ scenario, onComplete, onReset }: VoiceConversationProps) {
  const [conversationState, setConversationState] = useState<'setup' | 'active' | 'paused' | 'complete'>('setup');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [voiceActivityLevel, setVoiceActivityLevel] = useState(0);
  const [currentError, setCurrentError] = useState<VoiceError | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Enhanced status management
  const voiceStatus = useVoiceStatus();
  const feedbackManager = useFeedbackManager();
  
  // Voice control state mapping
  const getVoiceControlState = (): VoiceControlState => {
    if (currentError) return 'error';
    if (conversationState === 'paused') return 'paused';
    if (isAIResponding) return 'speaking';
    if (isRecording) return 'listening';
    if (conversationState === 'active') return 'inactive';
    return 'inactive';
  };
  
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  // Voice activity detection
  const startVoiceActivityDetection = useCallback((stream: MediaStream) => {
    audioContextRef.current = new AudioContext();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    
    source.connect(analyserRef.current);
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateVoiceActivity = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        setVoiceActivityLevel(average / 255);
        
        animationFrameRef.current = requestAnimationFrame(updateVoiceActivity);
      }
    };
    
    updateVoiceActivity();
  }, []);

  const stopVoiceActivityDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  }, []);

  const startConversation = async () => {
    try {
      setCurrentError(null);
      voiceStatus.updateWebSocketStatus('connecting');
      voiceStatus.updateMicrophoneStatus('requesting');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const recorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      
      setMediaRecorder(recorder);
      setConversationState('active');
      setIsConnected(true);
      
      // Update status indicators
      voiceStatus.updateWebSocketStatus('connected', 'demo-session-' + Date.now());
      voiceStatus.updateMicrophoneStatus('active');
      voiceStatus.updateAIStatus('idle');
      voiceStatus.updateAudioQuality('excellent', 45);
      
      startVoiceActivityDetection(stream);
      
      // Add initial feedback
      feedbackManager.addFeedback('coaching', 'technique', 'Session started! Remember to speak clearly and at a natural pace.', { priority: 3 });
      
      // Start with AI context gathering
      addSystemMessage("Welcome! I'm your AI conversation partner. Let's start with some context gathering to personalize this training session.");
      simulateAIResponse("Hi there! Before we begin the role-play, I'd like to understand a bit about your background. What's your current role in sales, and how much experience do you have with " + scenario.category.toLowerCase() + "?");
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      const voiceError = error instanceof DOMException && error.name === 'NotAllowedError' 
        ? VoiceErrors.microphonePermission(error.message)
        : VoiceErrors.microphoneHardware(error.message);
      setCurrentError(voiceError);
      voiceStatus.updateMicrophoneStatus('denied');
    }
  };

  const startRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
      setAudioChunks([]);
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      voiceStatus.updateAIStatus('listening');
      feedbackManager.addFeedback('coaching', 'technique', 'Good! I\'m listening. Speak clearly and confidently.', { priority: 3 });
    }
  };

  const stopRecording = async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      voiceStatus.updateAIStatus('thinking');
      
      // Simulate processing user speech
      setTimeout(() => {
        processUserSpeech();
      }, 1000);
    }
  };

  const processUserSpeech = () => {
    // Simulate speech-to-text and AI processing
    const mockTranscript = generateMockUserResponse();
    addUserMessage(mockTranscript);
    
    // Update steps and provide feedback
    updateConversationProgress();
    
    // Generate AI response
    setTimeout(() => {
      generateAIResponse(mockTranscript);
    }, 2000);
  };

  const generateMockUserResponse = () => {
    const responses = [
      "I'm a sales development rep with about 2 years of experience. I've been working on improving my cold calling skills.",
      "That's a great question. I think the biggest challenge for me is handling price objections when prospects say we're too expensive.",
      "I usually try to explain our value proposition, but sometimes I feel like I'm not connecting it to their specific needs.",
      "Yes, I'd be interested in learning more about how to quantify the ROI for prospects.",
      "That makes sense. I think I need to ask better discovery questions upfront."
    ];
    return responses[Math.min(messages.filter(m => m.type === 'user').length, responses.length - 1)];
  };

  const generateAIResponse = (userInput: string) => {
    setIsAIResponding(true);
    voiceStatus.updateAIStatus('thinking');
    
    // Simulate AI processing time
    setTimeout(() => {
      const aiResponse = generateContextualResponse(userInput);
      simulateAIResponse(aiResponse);
      voiceStatus.updateAIStatus('speaking');
      
      // Add real-time feedback based on user input analysis
      generateSmartFeedback(userInput);
      
      // Return to idle after AI finishes speaking
      setTimeout(() => {
        setIsAIResponding(false);
        voiceStatus.updateAIStatus('idle');
      }, 3000);
    }, 1500);
  };

  const generateContextualResponse = (userInput: string) => {
    const stepResponses = [
      "Thanks for sharing that background! Two years is a solid foundation. Now let me set up a realistic scenario for you. You'll be calling a prospect who has shown some initial interest but hasn't committed to a meeting yet. Your goal is to secure a 30-minute discovery call. Ready to begin?",
      "Perfect! Let's dive in. *Phone rings* Hello, this is Sarah from TechCorp. Thanks for taking my call. I understand you downloaded our sales automation guide last week?",
      "I appreciate your interest. You mentioned budget concerns - that's totally understandable. Can you help me understand what specific ROI metrics would need to be met for this to make financial sense for your team?",
      "That's exactly the kind of insight I was hoping to uncover. Based on those efficiency goals, let me share how other companies in your industry have achieved similar results...",
      "Great conversation! You demonstrated strong discovery skills and handled my objections well. One area for improvement would be quantifying the cost of inaction earlier in the conversation."
    ];
    
    return stepResponses[Math.min(currentStep, stepResponses.length - 1)];
  };

  const generateSmartFeedback = (userInput: string) => {
    // Enhanced feedback generation based on conversation analysis
    const inputLower = userInput.toLowerCase();
    
    // Positive feedback triggers
    if (inputLower.includes('question') || inputLower.includes('how') || inputLower.includes('what') || inputLower.includes('why')) {
      feedbackManager.addFeedback('positive', 'technique', 'Excellent use of open-ended questions!', { 
        priority: 2, 
        context: 'User asked an open-ended question',
        suggestion: 'Continue building on this discovery approach'
      });
    }
    
    // Improvement suggestions
    if (inputLower.length < 20) {
      feedbackManager.addFeedback('improvement', 'content', 'Try elaborating more on your points', {
        priority: 2,
        context: 'Response seemed brief',
        suggestion: 'Add specific examples or ask follow-up questions'
      });
    }
    
    // Tone analysis (simulated)
    if (Math.random() > 0.8) {
      const toneOptions = [
        { type: 'positive' as const, message: 'Great confident tone!', context: 'Tone analysis positive' },
        { type: 'improvement' as const, message: 'Consider slowing down slightly', context: 'Pace seemed fast' },
        { type: 'coaching' as const, message: 'Remember to pause for responses', context: 'Conversation flow' }
      ];
      
      const feedback = toneOptions[Math.floor(Math.random() * toneOptions.length)];
      feedbackManager.addFeedback(feedback.type, 'tone', feedback.message, {
        priority: 2,
        context: feedback.context
      });
    }
  };

  const updateConversationProgress = () => {
    const userMessageCount = messages.filter(m => m.type === 'user').length;
    
    if (userMessageCount >= 1 && !steps[0].completed) {
      setSteps(prev => prev.map((step, idx) => 
        idx === 0 ? { ...step, completed: true } : step
      ));
      setCurrentStep(1);
    } else if (userMessageCount >= 2 && !steps[2].completed) {
      setSteps(prev => prev.map((step, idx) => 
        idx === 2 ? { ...step, completed: true } : step
      ));
      setCurrentStep(2);
    } else if (userMessageCount >= 4 && !steps[3].completed) {
      setSteps(prev => prev.map((step, idx) => 
        idx === 3 ? { ...step, completed: true } : step
      ));
      setCurrentStep(3);
    }
  };

  const addUserMessage = (content: string) => {
    const message: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
      confidence: Math.random() * 0.2 + 0.8 // Simulate 80-100% confidence
    };
    setMessages(prev => [...prev, message]);
  };

  const simulateAIResponse = (content: string) => {
    const message: ConversationMessage = {
      id: Date.now().toString(),
      type: 'ai',
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

  const completeSession = () => {
    setConversationState('complete');
    stopVoiceActivityDetection();
    
    // Update final status
    voiceStatus.resetStatus();
    setIsConnected(false);
    
    // Add completion achievement
    feedbackManager.addFeedback('achievement', 'technique', 'Session completed successfully!', {
      priority: 1,
      context: 'Training session finished'
    });
    
    const sessionData = {
      scenario: scenario,
      duration: sessionTimer,
      messages: messages,
      steps: steps,
      feedback: feedbackManager.feedbackItems,
      score: Math.floor(Math.random() * 30) + 70 // Random score 70-100
    };
    
    onComplete(sessionData);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pauseConversation = () => {
    setConversationState('paused');
    if (isRecording) {
      stopRecording();
    }
    voiceStatus.updateAIStatus('idle');
  };

  const resumeConversation = () => {
    setConversationState('active');
    voiceStatus.updateAIStatus('idle');
  };

  // Error handling functions
  const handleRetryConnection = () => {
    setCurrentError(null);
    startConversation();
  };

  const handleDismissError = () => {
    setCurrentError(null);
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="card-header">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 leading-tight">{scenario.title}</h2>
            <p className="text-white opacity-90 text-sm sm:text-base">{scenario.description}</p>
          </div>
          <div className="text-center sm:text-right flex-shrink-0">
            <div className="text-2xl sm:text-3xl font-mono font-bold">{formatTime(sessionTimer)}</div>
            <div className="text-white opacity-75 text-xs sm:text-sm">Session Time</div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-class-pale-purple p-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap font-medium min-w-max
                ${step.completed 
                  ? 'bg-green-100 text-green-800' 
                  : index === currentStep 
                    ? 'bg-class-light-purple text-class-purple' 
                    : 'bg-white text-middle-gray'
                }`}
            >
              <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${step.completed 
                  ? 'bg-green-500 text-white' 
                  : index === currentStep 
                    ? 'bg-class-purple text-white' 
                    : 'bg-middle-gray text-white'}`}>
                {step.completed ? '✓' : step.step}
              </span>
              <span className="hidden sm:inline">{step.title}</span>
              <span className="sm:hidden">{step.title.split(' ')[0]}</span>
            </div>
          ))}
        </div>
        {/* Mobile scroll indicator */}
        <div className="flex justify-center mt-2 sm:hidden">
          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? 'bg-class-purple' : 'bg-white opacity-50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6 p-4 lg:p-6">
        
        {/* Conversation Interface */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6 order-2 lg:order-1">
          
          {/* Conversation Messages */}
          <div className="bg-lightest-purple rounded-lg p-3 sm:p-4 h-80 sm:h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-middle-gray">
                {conversationState === 'setup' ? (
                  <div className="text-center px-4">
                    <div className="text-4xl sm:text-6xl mb-4">🎯</div>
                    <p className="font-medium text-sm sm:text-base">Ready to start your training session?</p>
                    <p className="text-xs sm:text-sm mt-2">Click "Start Session" to begin</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="animate-pulse text-sm sm:text-base">Preparing conversation...</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-lg font-medium ${
                      message.type === 'user' 
                        ? 'bg-class-purple text-white' 
                        : message.type === 'ai'
                        ? 'bg-white border-2 border-class-light-purple text-midnight-blue'
                        : 'bg-light-gray text-dark-gray'
                    }`}>
                      <div className="text-xs sm:text-sm leading-relaxed">{message.content}</div>
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
                    <div className="bg-white border-2 border-class-light-purple px-3 sm:px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-bounce text-class-purple">●</div>
                        <div className="animate-bounce text-class-purple" style={{ animationDelay: '0.1s' }}>●</div>
                        <div className="animate-bounce text-class-purple" style={{ animationDelay: '0.2s' }}>●</div>
                        <span className="text-xs sm:text-sm text-middle-gray ml-2">AI is responding...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Voice Controls */}
          <div className="text-center space-y-3 sm:space-y-4">
            {conversationState === 'setup' && (
              <button
                onClick={startConversation}
                className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto min-h-[48px] touch-manipulation"
              >
                🎤 Start Session
              </button>
            )}

            {conversationState === 'active' && (
              <div className="space-y-3 sm:space-y-4">
                {!isRecording && !isAIResponding && (
                  <button
                    onClick={startRecording}
                    className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-6 py-4 rounded-lg font-bold transition-colors w-full sm:w-auto min-h-[56px] text-base sm:text-lg touch-manipulation"
                  >
                    🎤 Start Speaking
                  </button>
                )}

                {isRecording && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-600 font-bold text-sm sm:text-base">Recording...</span>
                      </div>
                      
                      {/* Voice Activity Indicator */}
                      <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <div className="text-xs sm:text-sm text-dark-gray font-medium">Voice:</div>
                        <div className="w-24 sm:w-32 h-2 bg-light-gray rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all duration-100"
                            style={{ width: `${voiceActivityLevel * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={stopRecording}
                      className="bg-middle-gray hover:bg-dark-gray active:bg-gray-800 text-white px-6 py-4 rounded-lg font-bold transition-colors w-full sm:w-auto min-h-[56px] text-base sm:text-lg touch-manipulation"
                    >
                      ⏹️ Stop Speaking
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={pauseConversation}
                    className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-4 py-3 rounded-lg font-bold transition-colors min-h-[48px] touch-manipulation text-sm sm:text-base"
                  >
                    ⏸️ Pause
                  </button>
                  <button
                    onClick={completeSession}
                    className="btn-secondary px-4 py-3 min-h-[48px] touch-manipulation text-sm sm:text-base"
                  >
                    ✅ Complete Session
                  </button>
                </div>
              </div>
            )}

            {conversationState === 'paused' && (
              <div className="space-y-3 sm:space-y-4">
                <p className="text-amber-600 font-bold text-sm sm:text-base">Session Paused</p>
                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={resumeConversation}
                    className="btn-secondary px-6 py-3 min-h-[48px] touch-manipulation text-sm sm:text-base"
                  >
                    ▶️ Resume
                  </button>
                  <button
                    onClick={onReset}
                    className="bg-middle-gray hover:bg-dark-gray active:bg-gray-800 text-white px-6 py-3 rounded-lg font-bold transition-colors min-h-[48px] touch-manipulation text-sm sm:text-base"
                  >
                    🔄 Restart
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:space-y-6 order-1 lg:order-2">
            
            {/* Enhanced Real-Time Feedback */}
            <RealTimeFeedbackPanel
              feedbackItems={feedbackManager.feedbackItems}
              isActive={conversationState === 'active'}
              onFeedbackDismiss={feedbackManager.removeFeedback}
              maxVisibleItems={4}
            />
            
            {/* Current Step */}
            <div className="bg-white rounded-lg shadow-lg border-2 border-class-light-purple p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-lg sm:text-xl">📍</span>
                <h3 className="font-bold text-class-purple text-sm sm:text-base">Current Step</h3>
              </div>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg border-2 ${
                  steps[currentStep]?.completed 
                    ? 'bg-green-50 border-green-200'
                    : 'bg-class-pale-purple border-class-light-purple'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      steps[currentStep]?.completed
                        ? 'bg-green-500 text-white'
                        : 'bg-class-purple text-white'
                    }`}>
                      {steps[currentStep]?.completed ? '✓' : steps[currentStep]?.step}
                    </div>
                    <strong className="text-xs sm:text-sm text-midnight-blue">{steps[currentStep]?.title}</strong>
                  </div>
                  <p className="text-xs text-dark-gray leading-relaxed">{steps[currentStep]?.description}</p>
                </div>
              </div>
            </div>

            {/* Scenario Objectives */}
            <div className="bg-white rounded-lg shadow-lg border-2 border-class-light-purple p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-lg sm:text-xl">🎯</span>
                <h3 className="font-bold text-class-purple text-sm sm:text-base">Session Objectives</h3>
              </div>
              <ul className="space-y-2">
                {scenario.objectives.map((objective, index) => (
                  <li key={index} className="flex items-start space-x-2 sm:space-x-3 text-xs sm:text-sm">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-class-purple rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <span className="text-dark-gray leading-relaxed">{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// CSS-in-JS for custom animations
const customStyles = `
  @keyframes fadeIn {
    from { 
      opacity: 0; 
      transform: translateY(10px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
  
  @keyframes scaleIn {
    from { 
      opacity: 0; 
      transform: scale(0.9); 
    }
    to { 
      opacity: 1; 
      transform: scale(1); 
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }
  
  .animate-scaleIn {
    animation: scaleIn 0.3s ease-out forwards;
  }
  
  .hover\\:scale-102:hover {
    transform: scale(1.02);
  }
  
  .transform-gpu {
    transform: translateZ(0);
  }
  
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  .touch-manipulation {
    touch-action: manipulation;
  }
`;

// Inject styles only in browser environment
if (typeof document !== 'undefined' && !document.querySelector('#voice-interface-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'voice-interface-styles';
  styleSheet.textContent = customStyles;
  document.head.appendChild(styleSheet);
}