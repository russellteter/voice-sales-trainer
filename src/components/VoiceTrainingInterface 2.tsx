'use client';

import { useState, useRef, useEffect } from 'react';

interface TrainingSession {
  id: string;
  scenario: string;
  status: 'idle' | 'recording' | 'processing' | 'complete';
  duration: number;
  score?: number;
  feedback?: string[];
}

interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: 'Cold Calling' | 'Objection Handling' | 'Closing' | 'Discovery';
}

const TRAINING_SCENARIOS: TrainingScenario[] = [
  {
    id: '1',
    title: 'Cold Outreach Introduction',
    description: 'Practice introducing yourself and your product to a cold prospect',
    difficulty: 'Beginner',
    category: 'Cold Calling'
  },
  {
    id: '2', 
    title: 'Price Objection Handling',
    description: 'Handle common price objections with confidence and value positioning',
    difficulty: 'Intermediate',
    category: 'Objection Handling'
  },
  {
    id: '3',
    title: 'Discovery Questions',
    description: 'Ask the right questions to uncover customer needs and pain points',
    difficulty: 'Beginner',
    category: 'Discovery'
  },
  {
    id: '4',
    title: 'Closing with Urgency',
    description: 'Create appropriate urgency to move prospects toward a decision',
    difficulty: 'Advanced',
    category: 'Closing'
  }
];

export default function VoiceTrainingInterface() {
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [currentSession, setCurrentSession] = useState<TrainingSession | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const startTrainingSession = async (scenario: TrainingScenario) => {
    setSelectedScenario(scenario);
    setCurrentSession({
      id: Date.now().toString(),
      scenario: scenario.title,
      status: 'idle',
      duration: 0
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };
      
      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      if (currentSession) {
        setCurrentSession(prev => prev ? {...prev, status: 'recording'} : null);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (currentSession) {
        setCurrentSession(prev => prev ? {
          ...prev, 
          status: 'processing',
          duration: recordingTime
        } : null);
        
        // Simulate processing and feedback
        setTimeout(() => {
          setCurrentSession(prev => prev ? {
            ...prev,
            status: 'complete',
            score: Math.floor(Math.random() * 40) + 60, // Random score 60-100
            feedback: [
              'Strong opening with clear value proposition',
              'Consider asking more discovery questions early',
              'Great handling of the price objection',
              'Could improve closing technique with more urgency'
            ]
          } : null);
        }, 2000);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetSession = () => {
    setCurrentSession(null);
    setSelectedScenario(null);
    setIsRecording(false);
    setRecordingTime(0);
    setAudioChunks([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Voice Sales Trainer
          </h1>
          <p className="text-gray-600">
            Practice your sales conversations with AI-powered role-play scenarios
          </p>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Scenario Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                🎯 Training Scenarios
              </h2>
              
              <div className="space-y-3">
                {TRAINING_SCENARIOS.map((scenario) => (
                  <div
                    key={scenario.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedScenario?.id === scenario.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                    onClick={() => startTrainingSession(scenario)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{scenario.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        scenario.difficulty === 'Beginner' 
                          ? 'bg-green-100 text-green-800'
                          : scenario.difficulty === 'Intermediate'
                          ? 'bg-yellow-100 text-yellow-800'  
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {scenario.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
                    <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      {scenario.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recording Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                🎙️ Voice Training Session
              </h2>

              {!selectedScenario ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👤</div>
                  <p className="text-gray-600">Select a training scenario to get started</p>
                </div>
              ) : (
                <div>
                  {/* Current Scenario Info */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">{selectedScenario.title}</h3>
                    <p className="text-gray-600 text-sm">{selectedScenario.description}</p>
                  </div>

                  {/* Recording Controls */}
                  <div className="text-center mb-6">
                    {currentSession?.status === 'idle' && (
                      <button
                        onClick={startRecording}
                        className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        🎤
                        Start Recording
                      </button>
                    )}

                    {isRecording && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-red-600 font-medium">Recording</span>
                          </div>
                          <span className="text-2xl font-mono text-gray-900">
                            {formatTime(recordingTime)}
                          </span>
                        </div>
                        <button
                          onClick={stopRecording}
                          className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          ⏹️
                          Stop Recording
                        </button>
                      </div>
                    )}

                    {currentSession?.status === 'processing' && (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin text-blue-600">🔄</div>
                        <span className="text-blue-600">Processing your recording...</span>
                      </div>
                    )}
                  </div>

                  {/* Session Results */}
                  {currentSession?.status === 'complete' && (
                    <div className="space-y-6">
                      {/* Score */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-green-900">Session Score</h4>
                          <span className="text-2xl font-bold text-green-600">
                            {currentSession.score}/100
                          </span>
                        </div>
                        <div className="w-full bg-green-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${currentSession.score}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Feedback */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          📈 Detailed Feedback
                        </h4>
                        <ul className="space-y-2">
                          {currentSession.feedback?.map((item, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                              <span className="text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Session Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-600">Duration</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatTime(currentSession.duration)}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-600">Scenario</p>
                          <p className="text-lg font-semibold text-gray-900">{selectedScenario.difficulty}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => startRecording()}
                          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Try Again
                        </button>
                        <button
                          onClick={resetSession}
                          className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          New Scenario
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">How to Use Voice Sales Trainer</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h4 className="font-medium mb-2">Choose Scenario</h4>
              <p className="text-sm text-gray-600">Select a sales scenario that matches your training goals</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h4 className="font-medium mb-2">Record Practice</h4>
              <p className="text-sm text-gray-600">Practice your sales conversation out loud and record it</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h4 className="font-medium mb-2">Get Feedback</h4>
              <p className="text-sm text-gray-600">Receive AI-powered feedback to improve your technique</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}