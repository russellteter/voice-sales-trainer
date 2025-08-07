'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceSessionConfig {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAudioResponse?: (audioData: ArrayBuffer) => void;
  onError?: (error: string) => void;
  onConnectionChange?: (connected: boolean) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

interface VoiceSessionState {
  isConnected: boolean;
  isActive: boolean;
  conversationId: string;
  error: string | null;
  retryCount: number;
  connectionHealth: {
    latency: number;
    lastPing: Date | null;
    reconnectCount: number;
  };
}

interface VoiceSessionControls {
  startSession: () => Promise<void>;
  stopSession: () => void;
  sendAudio: (audioData: string) => void;
  getConnectionHealth: () => VoiceSessionState['connectionHealth'];
  clearError: () => void;
}

export function useVoiceSession(config: VoiceSessionConfig = {}): [VoiceSessionState, VoiceSessionControls] {
  const [state, setState] = useState<VoiceSessionState>({
    isConnected: false,
    isActive: false,
    conversationId: '',
    error: null,
    retryCount: 0,
    connectionHealth: {
      latency: 0,
      lastPing: null,
      reconnectCount: 0,
    },
  });

  const websocketRef = useRef<WebSocket | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef(config);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const clearPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const updateConnectionHealth = useCallback((updates: Partial<VoiceSessionState['connectionHealth']>) => {
    setState(prev => ({
      ...prev,
      connectionHealth: {
        ...prev.connectionHealth,
        ...updates,
      },
    }));
  }, []);

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'conversation_initiation_metadata':
          if (message.conversation_initiation_metadata_event?.conversation_id) {
            setState(prev => ({
              ...prev,
              conversationId: message.conversation_initiation_metadata_event.conversation_id,
              error: null,
            }));
          }
          break;

        case 'audio':
          if (message.audio_event?.audio_base_64 && configRef.current.onAudioResponse) {
            // Convert base64 to ArrayBuffer
            const binaryString = window.atob(message.audio_event.audio_base_64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            configRef.current.onAudioResponse(bytes.buffer);
          }
          break;

        case 'user_transcript':
          if (message.user_transcript_event && configRef.current.onTranscript) {
            configRef.current.onTranscript(
              message.user_transcript_event.user_transcript,
              message.user_transcript_event.is_final
            );
          }
          break;

        case 'agent_response':
          // Handle agent text responses
          break;

        case 'error':
          if (message.error_event) {
            const errorMsg = `ElevenLabs API Error: ${message.error_event.message}`;
            setState(prev => ({ ...prev, error: errorMsg }));
            if (configRef.current.onError) {
              configRef.current.onError(errorMsg);
            }
          }
          break;

        case 'ping':
          // Respond to ping for connection health
          if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            websocketRef.current.send(JSON.stringify({ type: 'pong' }));
            updateConnectionHealth({ lastPing: new Date() });
          }
          break;

        case 'pong':
          // Handle pong response for latency calculation
          const now = Date.now();
          const latency = state.connectionHealth.lastPing 
            ? now - state.connectionHealth.lastPing.getTime()
            : 0;
          updateConnectionHealth({ latency });
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      const errorMsg = 'Invalid message format from voice service';
      setState(prev => ({ ...prev, error: errorMsg }));
      if (configRef.current.onError) {
        configRef.current.onError(errorMsg);
      }
    }
  }, [state.connectionHealth.lastPing, updateConnectionHealth]);

  const connectWebSocket = useCallback(async () => {
    try {
      // Get voice configuration from secure API
      const configResponse = await fetch('/api/voice/config');
      if (!configResponse.ok) {
        throw new Error('Voice configuration not available');
      }
      
      const configData = await configResponse.json();
      if (!configData.hasApiKey || !configData.hasVoiceId) {
        throw new Error('ElevenLabs configuration incomplete');
      }
      
      // Get WebSocket URL and credentials
      const wsResponse = await fetch('/api/voice/websocket');
      if (!wsResponse.ok) {
        throw new Error('Could not get WebSocket configuration');
      }
      
      const wsData = await wsResponse.json();
      
      // Create WebSocket connection
      const ws = new WebSocket(wsData.wsUrl);
      
      ws.onopen = () => {
        console.log('✅ Voice WebSocket connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          error: null,
          retryCount: 0,
        }));
        
        if (configRef.current.onConnectionChange) {
          configRef.current.onConnectionChange(true);
        }

        // Start ping interval for connection health monitoring
        clearPingInterval();
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
            updateConnectionHealth({ lastPing: new Date() });
          }
        }, 30000); // Ping every 30 seconds

        // Send initialization message
        const initMessage = {
          type: 'conversation_initiation_metadata',
          conversation_initiation_metadata_event: {
            conversation_config_override: {
              agent: {
                prompt: {
                  prompt: `# Multi-Voice Sales Training Agent

## Personality

You are a dual-persona sales training system combining two distinct professional identities:

**Primary Identity - Coach Marcus**: You are a seasoned sales trainer with 15+ years in B2B enterprise sales. You're direct, analytical, and focused on measurable improvement. You deliver feedback efficiently without unnecessary enthusiasm, maintaining professional neutrality while clearly marking what works and what doesn't. Your background as a former VP of Sales informs your practical, results-oriented approach.

**Secondary Identity - Tim**: You are a realistic business decision-maker at a mid-sized technology company. You're a busy VP of Operations who values efficiency, has budget constraints, and typical enterprise buying concerns. You respond authentically as someone who receives 10+ cold calls daily.

Both personas maintain consistent character traits throughout interactions, with Coach Marcus being professionally direct and instructional, while Tim provides realistic but fair prospect responses.

Begin every session with Coach Marcus introducing the scenario.`
                }
              }
            }
          }
        };

        ws.send(JSON.stringify(initMessage));
      };

      ws.onmessage = handleWebSocketMessage;

      ws.onerror = (error) => {
        console.error('❌ Voice WebSocket error:', error);
        const errorMsg = 'WebSocket connection error';
        setState(prev => ({ ...prev, error: errorMsg, isConnected: false }));
        if (configRef.current.onError) {
          configRef.current.onError(errorMsg);
        }
      };

      ws.onclose = (event) => {
        console.log('Voice WebSocket closed:', event.code, event.reason);
        setState(prev => ({ ...prev, isConnected: false }));
        clearPingInterval();
        
        if (configRef.current.onConnectionChange) {
          configRef.current.onConnectionChange(false);
        }
        
        // Attempt to reconnect if session is still active and close was unexpected
        if (state.isActive && event.code !== 1000) {
          scheduleReconnect();
        }
      };

      websocketRef.current = ws;

    } catch (error) {
      console.error('Error connecting to voice service:', error);
      const errorMsg = `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setState(prev => ({ ...prev, error: errorMsg, isConnected: false }));
      if (configRef.current.onError) {
        configRef.current.onError(errorMsg);
      }
      
      if (state.isActive) {
        scheduleReconnect();
      }
    }
  }, [state.isActive, handleWebSocketMessage, clearPingInterval, updateConnectionHealth]);

  const scheduleReconnect = useCallback(() => {
    const maxRetries = configRef.current.retryAttempts || 5;
    const baseDelay = configRef.current.retryDelay || 1000;
    
    if (state.retryCount < maxRetries) {
      clearRetryTimeout();
      
      const delay = Math.min(baseDelay * Math.pow(2, state.retryCount), 30000);
      
      setState(prev => ({
        ...prev,
        retryCount: prev.retryCount + 1,
        connectionHealth: {
          ...prev.connectionHealth,
          reconnectCount: prev.connectionHealth.reconnectCount + 1,
        },
      }));
      
      retryTimeoutRef.current = setTimeout(() => {
        if (state.isActive) {
          connectWebSocket();
        }
      }, delay);
    } else {
      const errorMsg = `Failed to connect after ${maxRetries} attempts`;
      setState(prev => ({ ...prev, error: errorMsg }));
      if (configRef.current.onError) {
        configRef.current.onError(errorMsg);
      }
    }
  }, [state.retryCount, state.isActive, connectWebSocket, clearRetryTimeout]);

  const startSession = useCallback(async () => {
    setState(prev => ({ ...prev, isActive: true, error: null, retryCount: 0 }));
    await connectWebSocket();
  }, [connectWebSocket]);

  const stopSession = useCallback(() => {
    setState(prev => ({ ...prev, isActive: false }));
    clearRetryTimeout();
    clearPingInterval();
    
    if (websocketRef.current) {
      websocketRef.current.close(1000, 'Session ended');
      websocketRef.current = null;
    }
  }, [clearRetryTimeout, clearPingInterval]);

  const sendAudio = useCallback((audioData: string) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'audio',
        audio_event: {
          audio_base_64: audioData
        }
      }));
    }
  }, []);

  const getConnectionHealth = useCallback(() => {
    return state.connectionHealth;
  }, [state.connectionHealth]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return [
    state,
    {
      startSession,
      stopSession,
      sendAudio,
      getConnectionHealth,
      clearError,
    }
  ];
}