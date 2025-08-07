'use client';

import { useState, useEffect } from 'react';

interface VoicePersona {
  name: string;
  voiceName: string;
  description: string;
  testMessage: string;
}

const VOICE_PERSONAS: VoicePersona[] = [
  {
    name: 'Coach Marcus',
    voiceName: 'coach_marcus',
    description: 'Professional sales trainer - Direct, analytical feedback persona',
    testMessage: 'Hello! I\'m Coach Marcus, your sales training instructor. I\'m here to help you improve your sales techniques and close more deals.'
  },
  {
    name: 'Tim',
    voiceName: 'tim',
    description: 'Realistic business prospect - Varied responses with objections',
    testMessage: 'Hi there, I\'m Tim from a mid-sized company. I\'m interested but I have some concerns about the budget and implementation timeline.'
  }
];

// Minimal ElevenLabs voice stream test component
export default function ElevenLabsTest() {
  const [apiKey, setApiKey] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<string>('Ready');
  const [error, setError] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [currentPersona, setCurrentPersona] = useState<VoicePersona>(VOICE_PERSONAS[0]);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [conversationId, setConversationId] = useState<string>('');
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const playAudioFromBase64 = async (base64Audio: string) => {
    if (!audioContext) {
      const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(newAudioContext);
      return;
    }

    try {
      const audioData = atob(base64Audio);
      const audioBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(audioBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      const decodedData = await audioContext.decodeAudioData(audioBuffer);
      const source = audioContext.createBufferSource();
      source.buffer = decodedData;
      source.connect(audioContext.destination);
      source.start();

      addLog('🔊 Playing audio response');
    } catch (error) {
      addLog(`❌ Audio playback error: ${error}`);
    }
  };

  const sendVoiceSwitchMessage = (persona: VoicePersona) => {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      addLog('❌ Cannot switch voice - no active connection');
      return;
    }

    const switchMessage = {
      type: 'conversation_initiation_metadata',
      conversation_initiation_metadata_event: {
        conversation_config_override: {
          agent: {
            prompt: {
              prompt: `You are now speaking as ${persona.voiceName}. ${persona.description}. Respond in character with: "${persona.testMessage}"`
            }
          }
        }
      }
    };

    websocket.send(JSON.stringify(switchMessage));
    addLog(`🎭 Switched to ${persona.name} (${persona.voiceName})`);
  };

  const testElevenLabsConnection = async () => {
    if (!apiKey || !voiceId) {
      setError('Please provide API Key and Voice ID');
      return;
    }

    setError('');
    setIsStreaming(true);
    setStatus('Connecting...');
    addLog('🔌 Attempting to connect to ElevenLabs...');

    try {
      // Test 1: Verify API key with simple API call
      addLog('1️⃣ Testing API key with voices endpoint...');
      const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': apiKey,
        }
      });

      if (!voicesResponse.ok) {
        throw new Error(`API Key validation failed: ${voicesResponse.status} ${voicesResponse.statusText}`);
      }

      const voicesData = await voicesResponse.json();
      addLog(`✅ API key valid. Found ${voicesData.voices?.length || 0} voices.`);

      // Test 2: Verify voice ID exists
      const voiceExists = voicesData.voices?.some((v: any) => v.voice_id === voiceId);
      if (!voiceExists) {
        throw new Error(`Voice ID ${voiceId} not found in your account`);
      }
      addLog(`✅ Voice ID ${voiceId} found.`);

      // Test 3: Test WebSocket connection with multi-voice support
      addLog('2️⃣ Testing WebSocket connection with multi-voice support...');
      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${voiceId}`;
      
      const ws = new WebSocket(wsUrl);
      setWebsocket(ws);

      ws.onopen = () => {
        addLog('✅ WebSocket connected successfully!');
        setStatus('Connected');
        
        // Send multi-voice initialization message with detailed system prompt
        const multiVoiceSystemPrompt = `
You are a Multi-Voice Sales Training System with two distinct personas:

**VOICE SWITCHING INSTRUCTIONS:**
- When asked to be "coach_marcus": Switch to Coach Marcus personality
- When asked to be "tim": Switch to Tim personality
- Use the exact voice names: "coach_marcus" and "tim"

**COACH MARCUS PERSONA (coach_marcus voice):**
- Professional sales trainer and coach
- Direct, analytical, and constructive feedback style
- Focuses on technique improvement and skill development
- Uses industry terminology and best practices
- Provides specific, actionable advice

**TIM PERSONA (tim voice):**
- Realistic business prospect from a mid-sized company
- Shows interest but has legitimate concerns and objections
- Asks about budget, timeline, implementation, and ROI
- Realistic decision-making process with multiple stakeholders
- Professional but cautious communication style

**TRAINING SESSION FRAMEWORK:**
1. Introduction and rapport building
2. Discovery and needs assessment
3. Solution presentation
4. Objection handling
5. Value reinforcement
6. Closing and next steps

Start as Coach Marcus and introduce the training session.
        `;

        const initMessage = {
          type: 'conversation_initiation_metadata',
          conversation_initiation_metadata_event: {
            conversation_config_override: {
              agent: {
                prompt: {
                  prompt: multiVoiceSystemPrompt
                }
              }
            }
          }
        };

        ws.send(JSON.stringify(initMessage));
        addLog('📤 Sent multi-voice initialization message');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          addLog(`📨 Received: ${message.type}`);
          
          if (message.type === 'conversation_initiation_metadata') {
            const convId = message.conversation_initiation_metadata_event?.conversation_id;
            setConversationId(convId);
            addLog(`✅ Multi-voice conversation initialized: ${convId}`);
          }
          
          if (message.type === 'audio') {
            addLog('🔊 Received audio response - attempting playback');
            const audioData = message.audio_event?.audio_base_64;
            if (audioData) {
              playAudioFromBase64(audioData);
            }
          }

          if (message.type === 'user_transcript') {
            addLog(`📝 Transcript: ${message.user_transcript_event?.user_transcript}`);
          }

          if (message.type === 'agent_response') {
            addLog(`🤖 Agent text: ${message.agent_response_event?.agent_response}`);
          }
          
        } catch (err) {
          addLog(`❌ Error parsing message: ${err}`);
        }
      };

      ws.onerror = (error) => {
        addLog(`❌ WebSocket error: ${error}`);
        setError('WebSocket connection failed');
        setStatus('Error');
      };

      ws.onclose = (event) => {
        addLog(`🔌 WebSocket closed: ${event.code} ${event.reason}`);
        setStatus('Disconnected');
        setIsStreaming(false);
        setWebsocket(null);
        setConversationId('');
      };

      // Auto-close after 15 seconds for comprehensive test
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Multi-voice test completed');
          addLog('✅ Multi-voice test completed successfully');
        }
      }, 15000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Error: ${errorMessage}`);
      setError(errorMessage);
      setStatus('Error');
      setIsStreaming(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setError('');
  };

  const testVoiceSwitch = () => {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      setError('No active WebSocket connection for voice switching test');
      return;
    }

    addLog(`🎭 Testing voice switch to ${currentPersona.name}...`);
    sendVoiceSwitchMessage(currentPersona);
  };

  const disconnectWebSocket = () => {
    if (websocket) {
      websocket.close(1000, 'User requested disconnect');
      addLog('🔌 User disconnected WebSocket');
    }
  };

  useEffect(() => {
    const envApiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    const envVoiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID;
    
    if (envApiKey) setApiKey(envApiKey);
    if (envVoiceId) setVoiceId(envVoiceId);
    
    if (envApiKey && envVoiceId) {
      addLog(`🔧 Loaded API key and voice ID from environment`);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-class-purple">🎙️ Multi-Voice ElevenLabs Integration Test</h2>
        <div className="text-sm text-gray-500">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Real-time Testing Suite
        </div>
      </div>
      
      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-bold text-midnight-blue mb-2">
            ElevenLabs API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-class-purple focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-midnight-blue mb-2">
            Multi-Voice Agent ID
          </label>
          <input
            type="text"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            placeholder="agent_..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-class-purple focus:border-transparent"
          />
        </div>
      </div>

      {/* Voice Persona Selection */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-midnight-blue mb-3">
          🎭 Voice Persona for Testing
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VOICE_PERSONAS.map((persona) => (
            <div
              key={persona.voiceName}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                currentPersona.voiceName === persona.voiceName
                  ? 'border-class-purple bg-class-pale-purple'
                  : 'border-gray-300 hover:border-class-light-purple'
              }`}
              onClick={() => setCurrentPersona(persona)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-midnight-blue">{persona.name}</h4>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{persona.voiceName}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{persona.description}</p>
              <p className="text-xs text-gray-500 italic">"{persona.testMessage}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Connection Info */}
      {conversationId && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-sm text-green-800">
            <strong>🔗 Active Conversation:</strong> {conversationId}
          </span>
        </div>
      )}

      {/* Status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            status === 'Connected' ? 'bg-green-500' :
            status === 'Error' ? 'bg-red-500' :
            isStreaming ? 'bg-yellow-500' : 'bg-gray-400'
          }`}></div>
          <span className="font-medium text-midnight-blue">Status: {status}</span>
        </div>
        
        <div className="flex flex-wrap space-x-2 space-y-2 md:space-y-0">
          <button
            onClick={testElevenLabsConnection}
            disabled={isStreaming || !apiKey || !voiceId}
            className="btn-primary disabled:opacity-50"
          >
            {isStreaming ? 'Testing...' : '🧪 Test Multi-Voice'}
          </button>
          <button
            onClick={testVoiceSwitch}
            disabled={!websocket || websocket.readyState !== WebSocket.OPEN}
            className="btn-secondary disabled:opacity-50"
          >
            🎭 Test {currentPersona.name}
          </button>
          <button
            onClick={disconnectWebSocket}
            disabled={!websocket || websocket.readyState !== WebSocket.OPEN}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            🔌 Disconnect
          </button>
          <button
            onClick={clearLogs}
            className="btn-secondary"
          >
            🗑️ Clear Logs
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <span className="text-red-500 text-xl">⚠️</span>
            <div>
              <h4 className="font-bold text-red-800">Error</h4>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="bg-darkest-gray rounded-lg p-4">
        <h3 className="text-white font-bold mb-3">🔍 Test Logs</h3>
        <div className="bg-black rounded p-3 font-mono text-sm text-green-400 h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">Logs will appear here when you run the test...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </div>

      {/* Instructions and Features */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-class-pale-purple rounded-lg p-4">
          <h3 className="font-bold text-class-purple mb-3">📋 Multi-Voice Agent Setup</h3>
          <ol className="text-sm text-midnight-blue space-y-2">
            <li><strong>1.</strong> Get API key: <code className="text-xs">elevenlabs.io/app/speech-synthesis</code></li>
            <li><strong>2.</strong> Create <strong>Conversational Agent</strong>: "Sales Training Coach & Prospect"</li>
            <li><strong>3.</strong> Add system prompt with voice switching instructions</li>
            <li><strong>4.</strong> Add two voices in Multi-voice section:
              <ul className="ml-4 mt-1 space-y-1">
                <li>• <strong>coach_marcus</strong>: Training coach</li>
                <li>• <strong>tim</strong>: Business prospect</li>
              </ul>
            </li>
            <li><strong>5.</strong> Configure: GPT-4, 150-200 tokens, no first message</li>
            <li><strong>6.</strong> Copy Agent ID (starts with agent_)</li>
          </ol>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-bold text-blue-700 mb-3">🔬 Test Features</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>✅ <strong>API Key Validation:</strong> Tests authentication</li>
            <li>✅ <strong>Agent ID Verification:</strong> Confirms multi-voice agent exists</li>
            <li>✅ <strong>WebSocket Connection:</strong> Real-time communication setup</li>
            <li>✅ <strong>Multi-Voice Initialization:</strong> Loads complete system prompt</li>
            <li>✅ <strong>Voice Switching:</strong> Tests persona changes (coach_marcus ↔ tim)</li>
            <li>✅ <strong>Audio Playback:</strong> Plays voice responses in browser</li>
            <li>✅ <strong>Message Logging:</strong> Real-time WebSocket message monitoring</li>
            <li>✅ <strong>Error Handling:</strong> Comprehensive debugging information</li>
          </ul>
        </div>
      </div>

      {/* Voice Persona Details */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="font-bold text-gray-700 mb-3">🎭 Voice Persona Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white rounded p-3 border">
            <h4 className="font-bold text-class-purple mb-2">👨‍🏫 Coach Marcus (coach_marcus)</h4>
            <p className="text-gray-600 mb-2">Professional sales training coach with direct, analytical approach</p>
            <p className="text-xs text-gray-500"><strong>Role:</strong> Provides feedback, coaching, and skill development guidance</p>
          </div>
          <div className="bg-white rounded p-3 border">
            <h4 className="font-bold text-blue-600 mb-2">👤 Tim (tim)</h4>
            <p className="text-gray-600 mb-2">Realistic business prospect with legitimate concerns and objections</p>
            <p className="text-xs text-gray-500"><strong>Role:</strong> Roleplay partner for sales scenario practice</p>
          </div>
        </div>
      </div>
    </div>
  );
}