'use client';

import { useState, useRef, useEffect } from 'react';
import HybridVoiceAgent from './HybridVoiceAgent';

// Sales training scenarios
const TRAINING_SCENARIOS = [
  {
    id: '1',
    title: 'Cold Call - Software Sales',
    description: 'Practice making a cold call to a potential software client. The AI will play a busy executive who is initially skeptical but can be won over.',
    category: 'Cold Calling',
    difficulty: 'Beginner'
  },
  {
    id: '2', 
    title: 'Handling Price Objections',
    description: 'Learn to address cost concerns effectively. The AI will play an interested prospect with budget concerns.',
    category: 'Objection Handling',
    difficulty: 'Intermediate'
  },
  {
    id: '3',
    title: 'Closing Enterprise Deals',
    description: 'Navigate complex enterprise sales processes. The AI will play a decision-maker ready to buy but needs guidance.',
    category: 'Closing',
    difficulty: 'Advanced'
  },
  {
    id: '4',
    title: 'Product Demo Follow-up',
    description: 'Follow up after a product demonstration. The AI will play a prospect considering multiple solutions.',
    category: 'Follow-up',
    difficulty: 'Intermediate'
  },
  {
    id: '5',
    title: 'Negotiation - Contract Terms',
    description: 'Practice negotiating contract terms and pricing. The AI will push back on terms and seek concessions.',
    category: 'Negotiation',
    difficulty: 'Advanced'
  }
];

interface ConversationResults {
  duration: number;
  score: number;
  feedback: string[];
  transcript: ConversationTurn[];
}

interface ConversationTurn {
  speaker: 'user' | 'agent';
  text: string;
  timestamp: number;
}

export default function SimpleVoiceTrainer() {
  const [selectedScenario, setSelectedScenario] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'scenarios' | 'conversation' | 'results'>('scenarios');
  const [conversationResults, setConversationResults] = useState<ConversationResults | null>(null);
  
  // API Configuration
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [showApiConfig, setShowApiConfig] = useState(true);

  // Handle conversation completion
  const handleConversationEnd = (results: ConversationResults) => {
    setConversationResults(results);
    setCurrentView('results');
  };

  // Handle scenario selection
  const handleScenarioSelect = (scenario: any) => {
    setSelectedScenario(scenario);
    setCurrentView('conversation');
  };

  // Handle back navigation
  const handleBackToScenarios = () => {
    setSelectedScenario(null);
    setCurrentView('scenarios');
    setConversationResults(null);
  };

  // Handle API configuration
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

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show API configuration
  if (showApiConfig) {
    return (
      <div className="container">
        <div style={{ maxWidth: '600px', margin: '50px auto', padding: '30px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Voice Sales Trainer Setup</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
            Enter your API keys to enable intelligent voice conversations with AI prospects.<br/>
            <small style={{ color: '#999' }}>Uses browser speech recognition + Claude AI + ElevenLabs voice synthesis</small>
          </p>
          
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
            <small style={{ color: '#666', fontSize: '14px' }}>
              Powers the conversation logic and AI responses
            </small>
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
            <small style={{ color: '#666', fontSize: '14px' }}>
              Enables real-time voice conversation with AI agents
            </small>
          </div>
          
          <button
            onClick={handleApiConfigSave}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
          >
            Start Voice Training
          </button>
        </div>
      </div>
    );
  }

  // Show conversation interface
  if (currentView === 'conversation' && selectedScenario) {
    return (
      <HybridVoiceAgent
        scenario={selectedScenario}
        claudeApiKey={claudeApiKey}
        elevenLabsApiKey={elevenLabsApiKey}
        onConversationEnd={handleConversationEnd}
        onBack={handleBackToScenarios}
      />
    );
  }

  // Show results
  if (currentView === 'results' && conversationResults) {
    return (
      <div className="container">
        <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
            <button onClick={handleBackToScenarios} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
              ← New Training
            </button>
            <h2 style={{ margin: '0', textAlign: 'center', flex: '1' }}>Training Results</h2>
            <div style={{ width: '120px' }}></div>
          </div>

          {/* Results Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a', marginBottom: '8px' }}>
                {conversationResults.score}
              </div>
              <div style={{ fontSize: '14px', color: '#166534' }}>Overall Score</div>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '8px' }}>
                {formatTime(conversationResults.duration)}
              </div>
              <div style={{ fontSize: '14px', color: '#1d4ed8' }}>Duration</div>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706', marginBottom: '8px' }}>
                {conversationResults.transcript.length}
              </div>
              <div style={{ fontSize: '14px', color: '#92400e' }}>Exchanges</div>
            </div>
          </div>

          {/* Detailed Feedback */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: '600' }}>📈 Performance Feedback</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {conversationResults.feedback.map((item, index) => (
                <div key={index} className="feedback-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ 
                    width: '6px', 
                    height: '6px', 
                    backgroundColor: '#3b82f6', 
                    borderRadius: '50%', 
                    marginTop: '8px',
                    flexShrink: '0'
                  }}></div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conversation Transcript */}
          <div>
            <h3 style={{ marginBottom: '20px', fontWeight: '600' }}>💬 Conversation Transcript</h3>
            <div style={{ 
              maxHeight: '400px', 
              overflowY: 'auto', 
              backgroundColor: '#f9fafb', 
              padding: '20px', 
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              {conversationResults.transcript.map((turn, index) => (
                <div key={index} style={{ 
                  marginBottom: '16px', 
                  padding: '12px 16px', 
                  borderRadius: '8px',
                  backgroundColor: turn.speaker === 'user' ? '#dbeafe' : '#fef3c7'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>
                    {turn.speaker === 'user' ? '👤 You' : '🤖 AI Prospect'} • {new Date(turn.timestamp).toLocaleTimeString()}
                  </div>
                  <div style={{ lineHeight: '1.5' }}>{turn.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show scenario selection (default view)
  return (
    <div className="container">
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '10px' }}>
          Voice Sales Trainer
        </h1>
        <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '20px' }}>
          Have real-time voice conversations with AI prospects to master your sales skills
        </p>
        <button
          onClick={() => setShowApiConfig(true)}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#6b7280', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ⚙️ Configure API Keys
        </button>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '1.5rem', fontWeight: '600' }}>
          🎯 Choose Your Training Scenario
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {TRAINING_SCENARIOS.map((scenario) => (
            <div
              key={scenario.id}
              className="scenario-card"
              onClick={() => handleScenarioSelect(scenario)}
              style={{ 
                padding: '24px',
                cursor: 'pointer',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                border: '2px solid #e5e7eb',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ fontWeight: '600', margin: '0', fontSize: '1.1rem', lineHeight: '1.3' }}>
                  {scenario.title}
                </h3>
                <span style={{ 
                  padding: '4px 10px', 
                  fontSize: '11px', 
                  borderRadius: '12px',
                  backgroundColor: scenario.difficulty === 'Beginner' ? '#dcfce7' : scenario.difficulty === 'Intermediate' ? '#fef3c7' : '#fecaca',
                  color: scenario.difficulty === 'Beginner' ? '#166534' : scenario.difficulty === 'Intermediate' ? '#92400e' : '#991b1b',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}>
                  {scenario.difficulty}
                </span>
              </div>

              {/* Description */}
              <p style={{ 
                fontSize: '14px', 
                color: '#666', 
                marginBottom: '16px', 
                lineHeight: '1.4',
                minHeight: '60px'
              }}>
                {scenario.description}
              </p>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                  display: 'inline-block',
                  padding: '6px 12px', 
                  fontSize: '12px', 
                  backgroundColor: '#f3f4f6', 
                  color: '#374151', 
                  borderRadius: '16px',
                  fontWeight: '500'
                }}>
                  {scenario.category}
                </span>
                <div style={{ 
                  fontSize: '24px',
                  color: '#3b82f6'
                }}>
                  🎙️
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div style={{ marginTop: '50px', backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '1.25rem', fontWeight: '600' }}>
            🚀 How Voice Training Works
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                backgroundColor: '#eff6ff', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px',
                fontSize: '24px'
              }}>
                🎯
              </div>
              <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Choose Scenario</h4>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
                Select from realistic sales scenarios designed to challenge different skills
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                backgroundColor: '#f0fdf4', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px',
                fontSize: '24px'
              }}>
                🗣️
              </div>
              <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Live Conversation</h4>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
                Have a real-time voice conversation with an AI playing your prospect
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                backgroundColor: '#fef3c7', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px',
                fontSize: '24px'
              }}>
                📈
              </div>
              <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Get Feedback</h4>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
                Receive detailed performance analysis and improvement suggestions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}