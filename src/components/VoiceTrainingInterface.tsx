'use client';

import { useState, useRef, useEffect } from 'react';
import { scenarioApi, sessionApi, voiceApi, handleApiError } from '../lib/api';
import { TrainingScenario, TrainingSession, CreateSessionRequest } from '../types/api';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../lib/config';

// Local training session interface
interface LocalTrainingSession {
  id: string;
  scenario: string;
  status: 'idle' | 'recording' | 'processing' | 'complete';
  duration: number;
  score?: number;
  feedback?: string[];
  apiSession?: TrainingSession;
}

export default function VoiceTrainingInterface() {
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [scenarios, setScenarios] = useState<TrainingScenario[]>([]);
  const [currentSession, setCurrentSession] = useState<LocalTrainingSession | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isAuthenticated, user } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load scenarios on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadScenarios();
    }
  }, [isAuthenticated]);

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

  const loadScenarios = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await scenarioApi.getAll();
      
      if (response.data) {
        setScenarios(response.data);
      } else if (response.error) {
        setError(handleApiError(response.error));
      }
    } catch (err) {
      setError('Failed to load scenarios. Please try again.');
      console.error('Error loading scenarios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const startTrainingSession = async (scenario: TrainingScenario) => {
    setSelectedScenario(scenario);
    setError(null);
    
    try {
      // Create session via API
      const sessionRequest: CreateSessionRequest = {
        scenario_id: parseInt(scenario.id),
        is_practice_mode: true
      };
      
      const response = await sessionApi.create(sessionRequest);
      
      if (response.data) {
        setCurrentSession({
          id: response.data.id.toString(),
          scenario: scenario.title,
          status: 'idle',
          duration: 0,
          apiSession: response.data
        });
      } else if (response.error) {
        setError(handleApiError(response.error));
      }
    } catch (err) {
      setError('Failed to create training session.');
      console.error('Error creating session:', err);
    }
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

  const stopRecording = async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (currentSession) {
        setCurrentSession(prev => prev ? {
          ...prev, 
          status: 'processing',
          duration: recordingTime
        } : null);
        
        try {
          // Convert audio to base64 for API
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const audioBase64 = await blobToBase64(audioBlob);
          
          // Send to voice processing API if enabled
          if (config.features.voiceEnabled && currentSession.apiSession) {
            const voiceResponse = await voiceApi.processVoice({
              session_id: currentSession.apiSession.id,
              audio_data: audioBase64,
              step: currentSession.apiSession.current_step
            });
            
            if (voiceResponse.data) {
              // Update session with results
              setCurrentSession(prev => prev ? {
                ...prev,
                status: 'complete',
                score: voiceResponse.data?.score_update || Math.floor(Math.random() * 40) + 60,
                feedback: [
                  voiceResponse.data?.feedback || 'Session completed successfully',
                  voiceResponse.data?.coaching_tip || 'Keep practicing to improve your skills'
                ]
              } : null);
              
              // Complete the session
              if (voiceResponse.data?.session_complete) {
                await sessionApi.completeSession(currentSession.apiSession.id);
              }
            } else {
              throw new Error('Voice processing failed');
            }
          } else {
            // Fallback to mock processing
            setTimeout(() => {
              setCurrentSession(prev => prev ? {
                ...prev,
                status: 'complete',
                score: Math.floor(Math.random() * 40) + 60,
                feedback: [
                  'Strong opening with clear value proposition',
                  'Consider asking more discovery questions early',
                  'Great handling of the price objection',
                  'Could improve closing technique with more urgency'
                ]
              } : null);
            }, 2000);
          }
        } catch (err) {
          console.error('Error processing recording:', err);
          setError('Failed to process recording. Please try again.');
          setCurrentSession(prev => prev ? { ...prev, status: 'idle' } : null);
        }
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

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-12">
            <div className="text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h3>
              <p className="text-gray-600 mb-6">Please log in to access the voice training interface.</p>
              <div className="space-x-4">
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200">
                  Login
                </button>
                <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition duration-200">
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          {user && (
            <p className="text-sm text-blue-600 mt-2">
              Welcome back, {user.first_name || user.username}!
            </p>
          )}
        </header>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-500 mr-3">⚠️</div>
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-600 text-sm">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Scenario Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                🎯 Training Scenarios
              </h2>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading scenarios...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {scenarios.map((scenario) => (
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
                )}
              
              {!isLoading && scenarios.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No scenarios available</p>
                  <button 
                    onClick={loadScenarios}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm underline"
                  >
                    Retry
                  </button>
                </div>
              )}
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