'use client';

import { useState, useEffect } from 'react';

// Minimal ElevenLabs voice stream test component
export default function ElevenLabsTest() {
  const [apiKey, setApiKey] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<string>('Ready');
  const [error, setError] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
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

      // Test 3: Test WebSocket connection
      addLog('2️⃣ Testing WebSocket connection...');
      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${voiceId}`;
      
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        addLog('✅ WebSocket connected successfully!');
        setStatus('Connected');
        
        // Send test message
        const initMessage = {
          type: 'conversation_initiation_metadata',
          conversation_initiation_metadata_event: {
            conversation_config_override: {
              agent: {
                prompt: {
                  prompt: 'You are a test agent. Say hello and confirm you can hear me.'
                }
              }
            }
          }
        };

        ws.send(JSON.stringify(initMessage));
        addLog('📤 Sent initialization message');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          addLog(`📨 Received: ${message.type}`);
          
          if (message.type === 'conversation_initiation_metadata') {
            addLog(`✅ Conversation initialized: ${message.conversation_initiation_metadata_event?.conversation_id}`);
          }
          
          if (message.type === 'audio') {
            addLog('🔊 Received audio response from agent');
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
      };

      // Auto-close after 10 seconds for test
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Test completed');
          addLog('✅ Test completed successfully');
        }
      }, 10000);

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

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-class-purple mb-6">🎙️ ElevenLabs Voice Integration Test</h2>
      
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
            Voice ID
          </label>
          <input
            type="text"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            placeholder="voice_id_here"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-class-purple focus:border-transparent"
          />
        </div>
      </div>

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
        
        <div className="flex space-x-2">
          <button
            onClick={testElevenLabsConnection}
            disabled={isStreaming || !apiKey || !voiceId}
            className="btn-primary disabled:opacity-50"
          >
            {isStreaming ? 'Testing...' : '🧪 Test Connection'}
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

      {/* Instructions */}
      <div className="mt-6 bg-class-pale-purple rounded-lg p-4">
        <h3 className="font-bold text-class-purple mb-3">📋 Setup Instructions for Multi-Voice Agent</h3>
        <ol className="text-sm text-midnight-blue space-y-2">
          <li><strong>1.</strong> Get your ElevenLabs API key from: <code>https://elevenlabs.io/app/speech-synthesis</code></li>
          <li><strong>2.</strong> Create a new <strong>Conversational Agent</strong> named "Sales Training Coach & Prospect"</li>
          <li><strong>3.</strong> Paste your detailed multi-voice system prompt in the System Prompt field</li>
          <li><strong>4.</strong> Click "Add voice" in Multi-voice support section</li>
          <li><strong>5.</strong> Add two voices:
            <ul className="ml-4 mt-1 space-y-1">
              <li>• <strong>coach_marcus</strong>: Professional coaching voice</li>
              <li>• <strong>tim</strong>: Business prospect voice</li>
            </ul>
          </li>
          <li><strong>6.</strong> Configure: GPT-4, 150-200 token limit, leave "First Message" blank</li>
          <li><strong>7.</strong> Copy the Agent ID and use it as your Voice ID above</li>
          <li><strong>8.</strong> Click "Test Connection" to verify both Coach Marcus and Tim respond</li>
        </ol>
      </div>
    </div>
  );
}