'use client';

import { useState, useRef, useEffect } from 'react';

// Mock scenarios for standalone app
const MOCK_SCENARIOS = [
  {
    id: '1',
    title: 'Cold Call - Software Sales',
    description: 'Practice making a cold call to a potential software client',
    category: 'Cold Calling',
    difficulty: 'Beginner'
  },
  {
    id: '2', 
    title: 'Handling Price Objections',
    description: 'Learn to address cost concerns effectively',
    category: 'Objection Handling',
    difficulty: 'Intermediate'
  },
  {
    id: '3',
    title: 'Closing Enterprise Deals',
    description: 'Navigate complex enterprise sales processes',
    category: 'Closing',
    difficulty: 'Advanced'
  }
];

interface TrainingSession {
  id: string;
  scenario: string;
  status: 'idle' | 'recording' | 'processing' | 'complete';
  duration: number;
  score?: number;
  feedback?: string[];
}

export default function SimpleVoiceTrainer() {
  const [selectedScenario, setSelectedScenario] = useState<any>(null);
  const [currentSession, setCurrentSession] = useState<TrainingSession | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  // API Configuration
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [showApiConfig, setShowApiConfig] = useState(true);
  
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

  const startTrainingSession = (scenario: any) => {
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
        
        // Simulate processing with mock feedback
        setTimeout(() => {
          setCurrentSession(prev => prev ? {
            ...prev,
            status: 'complete',
            score: Math.floor(Math.random() * 40) + 60,
            feedback: [
              'Strong opening with clear value proposition',
              'Consider asking more discovery questions early',
              'Great handling of objections',
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

  const handleApiConfigSave = () => {
    if (claudeApiKey && elevenLabsApiKey) {
      setShowApiConfig(false);
      // Store in localStorage for persistence
      localStorage.setItem('claudeApiKey', claudeApiKey);
      localStorage.setItem('elevenLabsApiKey', elevenLabsApiKey);
    } else {
      alert('Please enter both API keys');
    }
  };

  // Load saved API keys on mount
  useEffect(() => {
    const savedClaude = localStorage.getItem('claudeApiKey');
    const savedElevenLabs = localStorage.getItem('elevenLabsApiKey');
    
    if (savedClaude && savedElevenLabs) {
      setClaudeApiKey(savedClaude);
      setElevenLabsApiKey(savedElevenLabs);
      setShowApiConfig(false);
    }
  }, []);

  // Show API configuration
  if (showApiConfig) {
    return (
      <div className="container">
        <div style={{ maxWidth: '600px', margin: '50px auto', padding: '30px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Voice Sales Trainer Setup</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Claude API Key:
            </label>
            <input
              type="password"
              value={claudeApiKey}
              onChange={(e) => setClaudeApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px',
                fontSize: '16px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              ElevenLabs API Key:
            </label>
            <input
              type="password"
              value={elevenLabsApiKey}
              onChange={(e) => setElevenLabsApiKey(e.target.value)}
              placeholder="sk_..."
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px',
                fontSize: '16px'
              }}
            />
          </div>
          
          <button
            onClick={handleApiConfigSave}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
          >
            Start Training
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '10px' }}>
          Voice Sales Trainer
        </h1>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>
          Practice your sales conversations with AI-powered feedback
        </p>
        <button
          onClick={() => setShowApiConfig(true)}
          style={{ 
            marginTop: '10px', 
            padding: '6px 12px', 
            backgroundColor: '#6b7280', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Configure API Keys
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Scenario Selection */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '20px' }}>
            🎯 Training Scenarios
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {MOCK_SCENARIOS.map((scenario) => (
              <div
                key={scenario.id}
                className={`scenario-card ${selectedScenario?.id === scenario.id ? 'selected' : ''}`}
                onClick={() => startTrainingSession(scenario)}
                style={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontWeight: '500', margin: '0' }}>{scenario.title}</h3>
                  <span style={{ 
                    padding: '4px 8px', 
                    fontSize: '12px', 
                    borderRadius: '12px',
                    backgroundColor: scenario.difficulty === 'Beginner' ? '#dcfce7' : scenario.difficulty === 'Intermediate' ? '#fef3c7' : '#fecaca',
                    color: scenario.difficulty === 'Beginner' ? '#166534' : scenario.difficulty === 'Intermediate' ? '#92400e' : '#991b1b'
                  }}>
                    {scenario.difficulty}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{scenario.description}</p>
                <span style={{ 
                  display: 'inline-block',
                  padding: '4px 8px', 
                  fontSize: '12px', 
                  backgroundColor: '#f3f4f6', 
                  color: '#374151', 
                  borderRadius: '4px'
                }}>
                  {scenario.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recording Interface */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '20px' }}>
            🎙️ Voice Training Session
          </h2>

          {!selectedScenario ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>👤</div>
              <p style={{ color: '#666' }}>Select a training scenario to get started</p>
            </div>
          ) : (
            <div>
              {/* Current Scenario Info */}
              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                <h3 style={{ fontWeight: '500', marginBottom: '8px' }}>{selectedScenario.title}</h3>
                <p style={{ color: '#666', fontSize: '14px', margin: '0' }}>{selectedScenario.description}</p>
              </div>

              {/* Recording Controls */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                {currentSession?.status === 'idle' && (
                  <button
                    onClick={startRecording}
                    className="btn btn-danger"
                    style={{ padding: '12px 24px', fontSize: '16px' }}
                  >
                    🎤 Start Recording
                  </button>
                )}

                {isRecording && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '12px', 
                          height: '12px', 
                          backgroundColor: '#ef4444', 
                          borderRadius: '50%',
                          animation: 'pulse 1s infinite'
                        }}></div>
                        <span style={{ color: '#ef4444', fontWeight: '500' }}>Recording</span>
                      </div>
                      <span style={{ fontSize: '1.5rem', fontFamily: 'monospace' }}>
                        {formatTime(recordingTime)}
                      </span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="btn btn-secondary"
                      style={{ padding: '12px 24px', fontSize: '16px' }}
                    >
                      ⏹️ Stop Recording
                    </button>
                  </div>
                )}

                {currentSession?.status === 'processing' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ color: '#3b82f6' }}>🔄</div>
                    <span style={{ color: '#3b82f6' }}>Processing your recording...</span>
                  </div>
                )}
              </div>

              {/* Session Results */}
              {currentSession?.status === 'complete' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Score */}
                  <div className="feedback-positive" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ margin: '0', fontWeight: '500' }}>Session Score</h4>
                      <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {currentSession.score}/100
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '8px', 
                      backgroundColor: '#bbf7d0', 
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          backgroundColor: '#16a34a', 
                          width: `${currentSession.score}%`,
                          transition: 'width 0.5s ease-in-out'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div>
                    <h4 style={{ fontWeight: '500', marginBottom: '12px' }}>
                      📈 Detailed Feedback
                    </h4>
                    <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                      {currentSession.feedback?.map((item, index) => (
                        <li key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: '8px', 
                          marginBottom: '8px' 
                        }}>
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            backgroundColor: '#3b82f6', 
                            borderRadius: '50%', 
                            marginTop: '8px',
                            flexShrink: '0'
                          }}></span>
                          <span style={{ color: '#374151' }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Session Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', color: '#666', margin: '0 0 4px 0' }}>Duration</p>
                      <p style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0' }}>
                        {formatTime(currentSession.duration)}
                      </p>
                    </div>
                    <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', color: '#666', margin: '0 0 4px 0' }}>Scenario</p>
                      <p style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0' }}>{selectedScenario.difficulty}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={startRecording}
                      className="btn btn-primary"
                      style={{ flex: '1', padding: '8px 16px' }}
                    >
                      Try Again
                    </button>
                    <button
                      onClick={resetSession}
                      className="btn btn-secondary"
                      style={{ flex: '1', padding: '8px 16px' }}
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
  );
}