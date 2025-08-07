'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { TrainingScenario } from './ScenarioDashboard';

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
  const [realTimeFeedback, setRealTimeFeedback] = useState<string[]>([]);
  const [voiceActivityLevel, setVoiceActivityLevel] = useState(0);
  
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
      startVoiceActivityDetection(stream);
      
      // Start with AI context gathering
      addSystemMessage("Welcome! I'm your AI conversation partner. Let's start with some context gathering to personalize this training session.");
      simulateAIResponse("Hi there! Before we begin the role-play, I'd like to understand a bit about your background. What's your current role in sales, and how much experience do you have with " + scenario.category.toLowerCase() + "?");
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const startRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
      setAudioChunks([]);
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      
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
    
    // Simulate AI processing time
    setTimeout(() => {
      const aiResponse = generateContextualResponse(userInput);
      simulateAIResponse(aiResponse);
      setIsAIResponding(false);
      
      // Add real-time feedback
      const feedback = generateRealTimeFeedback(userInput);
      if (feedback) {
        setRealTimeFeedback(prev => [...prev, feedback]);
      }
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

  const generateRealTimeFeedback = (userInput: string): string | null => {
    const feedbackOptions = [
      "Great use of open-ended questions!",
      "Consider asking about the impact of the current situation",
      "Nice job acknowledging the concern before responding",
      "Try to quantify the business impact",
      "Strong confidence in your delivery"
    ];
    
    return Math.random() > 0.7 ? feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)] : null;
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
    
    const sessionData = {
      scenario: scenario,
      duration: sessionTimer,
      messages: messages,
      steps: steps,
      feedback: realTimeFeedback,
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
  };

  const resumeConversation = () => {
    setConversationState('active');
  };

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
          
          {/* Conversation Messages */}
          <div className="bg-lightest-purple rounded-lg p-4 h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-middle-gray">
                {conversationState === 'setup' ? (
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎯</div>
                    <p className="font-medium">Ready to start your training session?</p>
                    <p className="text-sm mt-2">Click "Start Session" to begin</p>
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
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg font-medium ${
                      message.type === 'user' 
                        ? 'bg-class-purple text-white' 
                        : message.type === 'ai'
                        ? 'bg-white border-2 border-class-light-purple text-midnight-blue'
                        : 'bg-light-gray text-dark-gray'
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
                    <div className="bg-white border-2 border-class-light-purple px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-bounce text-class-purple">●</div>
                        <div className="animate-bounce text-class-purple" style={{ animationDelay: '0.1s' }}>●</div>
                        <div className="animate-bounce text-class-purple" style={{ animationDelay: '0.2s' }}>●</div>
                        <span className="text-sm text-middle-gray ml-2">AI is responding...</span>
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
              <button
                onClick={startConversation}
                className="btn-primary text-lg px-8 py-3"
              >
                🎤 Start Session
              </button>
            )}

            {conversationState === 'active' && (
              <div className="space-y-4">
                {!isRecording && !isAIResponding && (
                  <button
                    onClick={startRecording}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                  >
                    🎤 Start Speaking
                  </button>
                )}

                {isRecording && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-4">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-600 font-bold">Recording...</span>
                    </div>
                    
                    {/* Voice Activity Indicator */}
                    <div className="flex items-center justify-center space-x-2">
                      <div className="text-sm text-dark-gray font-medium">Voice Level:</div>
                      <div className="w-32 h-2 bg-light-gray rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all duration-100"
                          style={{ width: `${voiceActivityLevel * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <button
                      onClick={stopRecording}
                      className="bg-middle-gray hover:bg-dark-gray text-white px-6 py-3 rounded-lg font-bold transition-colors"
                    >
                      ⏹️ Stop Speaking
                    </button>
                  </div>
                )}

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
              <p className="text-sm text-green-700">Coaching tips will appear here during the conversation</p>
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