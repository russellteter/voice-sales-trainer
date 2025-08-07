'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface VoiceConversationAgentProps {
  scenario: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
  };
  claudeApiKey: string;
  elevenLabsApiKey: string;
  onConversationEnd: (results: ConversationResults) => void;
  onBack: () => void;
}

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

interface AgentConfig {
  agent_id: string;
  name: string;
  prompt: string;
  language: string;
  model: string;
  voice_id: string;
  conversation_config: {
    agent_starts_conversation: boolean;
    agent_warmth: number;
    agent_max_tokens: number;
    enable_backchannel: boolean;
    backchannel_frequency: number;
    interruption_threshold: number;
    turn_detection: {
      type: 'server_vad' | 'client_vad';
      threshold: number;
      prefix_padding_ms: number;
      silence_duration_ms: number;
    };
  };
}

export default function VoiceConversationAgent({
  scenario,
  claudeApiKey,
  elevenLabsApiKey,
  onConversationEnd,
  onBack
}: VoiceConversationAgentProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState<ConversationTurn[]>([]);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [conversationDuration, setConversationDuration] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Create agent configuration based on scenario
  const createAgentConfig = useCallback((): AgentConfig => {
    const getScenarioPrompt = (scenario: any) => {
      switch (scenario.category) {
        case 'Cold Calling':
          return `You are playing the role of a busy software company executive receiving a cold call. You are initially skeptical and somewhat resistant, but can be convinced if the salesperson demonstrates clear value and professionalism. 

Your persona:
- Name: Sarah Chen, Director of Operations at TechFlow Solutions
- Company: Mid-size B2B software company (200 employees)
- Pain points: Struggling with inefficient manual processes, looking for automation solutions
- Personality: Professional but guarded, values efficiency, needs concrete ROI data
- Initial response: Slightly annoyed by cold call but willing to listen if value is clear

Respond naturally and realistically. Start with mild resistance but become more engaged if the caller:
- Shows they've researched your company
- Presents clear value proposition
- Asks good discovery questions
- Demonstrates ROI potential

Keep responses conversational and under 30 words each turn.`;

        case 'Objection Handling':
          return `You are playing the role of an interested prospect who has specific price concerns about a software solution. You like the product but are hesitant about the cost.

Your persona:
- Name: Mike Rodriguez, IT Director at GrowthCorp
- Company: Growing startup (50 employees)
- Situation: Need the solution but have budget constraints
- Main objection: "This seems expensive for our current stage"
- Secondary concerns: ROI timeline, implementation costs, ongoing support

Be realistic but fair - you want to be convinced if the salesperson handles objections well. Show interest but push back on price. Can be won over with creative solutions, value demonstration, or flexible terms.

Keep responses conversational and under 30 words each turn.`;

        case 'Closing':
          return `You are playing the role of a decision-maker ready to move forward but with typical enterprise hesitations and process requirements.

Your persona:
- Name: Jennifer Walsh, VP of Technology at Enterprise Solutions Inc
- Company: Large enterprise (1000+ employees)  
- Situation: You've been evaluating solutions and this one is your top choice
- Concerns: Need board approval, procurement process, implementation timeline
- Decision style: Methodical, wants guarantees, needs clear next steps

You're genuinely interested and ready to buy but need the salesperson to help you navigate enterprise sales process. Be professional and engaged but ask for specifics on contracts, guarantees, timelines, and implementation support.

Keep responses conversational and under 30 words each turn.`;

        default:
          return `You are playing the role of a business professional in a sales conversation. Be realistic, professional, and engage naturally with the salesperson. Keep responses conversational and under 30 words each turn.`;
      }
    };

    return {
      agent_id: `sales-trainer-${scenario.id}`,
      name: `Sales Training Agent - ${scenario.category}`,
      prompt: getScenarioPrompt(scenario),
      language: 'en',
      model: 'claude-3-5-sonnet-20241022', // Use Claude for conversation logic
      voice_id: 'EXAVITQu4vr4xnSDxMaL', // Professional female voice
      conversation_config: {
        agent_starts_conversation: true,
        agent_warmth: 0.7,
        agent_max_tokens: 50, // Keep responses concise
        enable_backchannel: true,
        backchannel_frequency: 0.3,
        interruption_threshold: 0.5,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000
        }
      }
    };
  }, [scenario]);

  // Create ElevenLabs agent
  const createAgent = async (): Promise<string> => {
    const agentConfig = createAgentConfig();
    
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${elevenLabsApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: agentConfig.name,
          prompt: agentConfig.prompt,
          language: agentConfig.language,
          model: agentConfig.model,
          voice_id: agentConfig.voice_id,
          conversation_config: agentConfig.conversation_config
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create agent: ${response.status} ${errorData}`);
      }

      const agent = await response.json();
      return agent.agent_id;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw new Error(`Failed to create conversation agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Initialize audio context
  const initializeAudio = useCallback(async () => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (error) {
      console.error('Error initializing audio context:', error);
      throw new Error('Failed to initialize audio system');
    }
  }, []);

  // Play audio buffer
  const playAudioBuffer = useCallback(async (audioBuffer: AudioBuffer) => {
    if (!audioContextRef.current) return;

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    return new Promise<void>((resolve) => {
      source.onended = () => resolve();
      source.start();
    });
  }, []);

  // Process audio queue
  const processAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;
    setIsAgentSpeaking(true);

    while (audioQueueRef.current.length > 0) {
      const buffer = audioQueueRef.current.shift();
      if (buffer) {
        await playAudioBuffer(buffer);
      }
    }

    isPlayingRef.current = false;
    setIsAgentSpeaking(false);
  }, [playAudioBuffer]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback(async (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'user_transcript':
          if (data.transcript) {
            setCurrentTranscript(prev => [...prev, {
              speaker: 'user',
              text: data.transcript,
              timestamp: Date.now()
            }]);
          }
          break;

        case 'agent_response':
          if (data.response) {
            setCurrentTranscript(prev => [...prev, {
              speaker: 'agent',
              text: data.response,
              timestamp: Date.now()
            }]);
          }
          break;

        case 'audio':
          if (data.audio && audioContextRef.current) {
            try {
              const audioData = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
              const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.buffer);
              audioQueueRef.current.push(audioBuffer);
              processAudioQueue();
            } catch (error) {
              console.error('Error processing audio:', error);
            }
          }
          break;

        case 'interruption':
          // Handle conversation interruptions
          audioQueueRef.current = []; // Clear audio queue
          isPlayingRef.current = false;
          setIsAgentSpeaking(false);
          break;

        case 'conversation_ended':
          setIsConversationActive(false);
          break;

        default:
          console.log('Unhandled message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }, [processAudioQueue]);

  // Start conversation
  const startConversation = async () => {
    try {
      setConnectionStatus('connecting');
      setError(null);

      // Initialize audio
      await initializeAudio();

      // Create agent
      const agentId = await createAgent();

      // Start WebSocket connection
      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setConnectionStatus('connected');
        setIsConnected(true);
        setIsConversationActive(true);
        setConversationStarted(true);
        startTimeRef.current = Date.now();
        
        // Start duration timer
        timerRef.current = setInterval(() => {
          setConversationDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
      };

      wsRef.current.onmessage = handleWebSocketMessage;

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setError('Connection failed. Please check your ElevenLabs API key.');
      };

      wsRef.current.onclose = () => {
        setConnectionStatus('disconnected');
        setIsConnected(false);
        setIsConversationActive(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      // Start audio capture
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Convert to base64 and send
          const reader = new FileReader();
          reader.onload = () => {
            const base64Audio = (reader.result as string).split(',')[1];
            wsRef.current?.send(JSON.stringify({
              type: 'user_audio_chunk',
              audio: base64Audio
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorderRef.current.start(250); // Send chunks every 250ms

    } catch (error) {
      console.error('Error starting conversation:', error);
      setConnectionStatus('error');
      setError(error instanceof Error ? error.message : 'Failed to start conversation');
    }
  };

  // End conversation
  const endConversation = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Generate results
    const results: ConversationResults = {
      duration: conversationDuration,
      score: Math.floor(Math.random() * 30) + 70, // Mock scoring for now
      feedback: [
        'Good opening and rapport building',
        'Asked relevant discovery questions',
        'Handled objections professionally',
        'Could improve closing technique'
      ],
      transcript: currentTranscript
    };

    onConversationEnd(results);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="container">
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
            ← Back
          </button>
          <h2 style={{ margin: '0', textAlign: 'center', flex: '1' }}>Voice Conversation</h2>
          <div style={{ width: '80px' }}></div> {/* Spacer for centering */}
        </div>

        {/* Scenario Info */}
        <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontWeight: '600' }}>{scenario.title}</h3>
          <p style={{ margin: '0 0 12px 0', color: '#666' }}>{scenario.description}</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ padding: '4px 12px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '12px', fontSize: '14px', fontWeight: '500' }}>
              {scenario.category}
            </span>
            <span style={{ padding: '4px 12px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '12px', fontSize: '14px', fontWeight: '500' }}>
              {scenario.difficulty}
            </span>
          </div>
        </div>

        {/* Connection Status */}
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <div style={{ 
            padding: '12px 20px', 
            borderRadius: '8px',
            backgroundColor: connectionStatus === 'connected' ? '#dcfce7' : connectionStatus === 'error' ? '#fef2f2' : '#f3f4f6',
            color: connectionStatus === 'connected' ? '#166534' : connectionStatus === 'error' ? '#991b1b' : '#374151'
          }}>
            Status: {connectionStatus === 'connecting' ? 'Connecting...' : 
                     connectionStatus === 'connected' ? 'Connected' :
                     connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
            <p style={{ margin: '0', color: '#991b1b' }}>{error}</p>
          </div>
        )}

        {/* Main Interface */}
        {!conversationStarted ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎤</div>
            <h3 style={{ marginBottom: '16px' }}>Ready to Start Conversation</h3>
            <p style={{ color: '#666', marginBottom: '30px' }}>
              Click start to begin a live voice conversation with an AI playing your {scenario.category.toLowerCase()} scenario.
            </p>
            <button 
              onClick={startConversation}
              disabled={connectionStatus === 'connecting'}
              className="btn btn-primary"
              style={{ padding: '12px 30px', fontSize: '18px' }}
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Start Conversation'}
            </button>
          </div>
        ) : (
          <div>
            {/* Conversation Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: isConversationActive ? '#22c55e' : '#6b7280',
                  animation: isConversationActive ? 'pulse 2s infinite' : 'none'
                }}></div>
                <span style={{ fontWeight: '600' }}>
                  {isConversationActive ? 'Conversation Active' : 'Conversation Ended'}
                </span>
              </div>
              <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: '600' }}>
                {formatTime(conversationDuration)}
              </div>
            </div>

            {/* Speaking Indicator */}
            <div style={{ marginBottom: '30px', textAlign: 'center' }}>
              <div style={{ 
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: isAgentSpeaking ? '#fef3c7' : '#f3f4f6',
                border: `2px solid ${isAgentSpeaking ? '#f59e0b' : '#d1d5db'}`
              }}>
                <span style={{ fontSize: '1.5rem' }}>
                  {isAgentSpeaking ? '🗣️ AI Speaking...' : '👂 Listening...'}
                </span>
              </div>
            </div>

            {/* Live Transcript */}
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ marginBottom: '16px', fontWeight: '600' }}>Live Conversation</h4>
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto', 
                backgroundColor: '#f9fafb', 
                padding: '16px', 
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                {currentTranscript.length === 0 ? (
                  <p style={{ color: '#6b7280', margin: '0', textAlign: 'center' }}>
                    Conversation will appear here...
                  </p>
                ) : (
                  currentTranscript.map((turn, index) => (
                    <div key={index} style={{ 
                      marginBottom: '12px', 
                      padding: '8px 12px', 
                      borderRadius: '6px',
                      backgroundColor: turn.speaker === 'user' ? '#dbeafe' : '#fef3c7'
                    }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                        {turn.speaker === 'user' ? '👤 You' : '🤖 AI Agent'} • {new Date(turn.timestamp).toLocaleTimeString()}
                      </div>
                      <div>{turn.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Controls */}
            <div style={{ textAlign: 'center' }}>
              <button 
                onClick={endConversation}
                className="btn btn-danger"
                style={{ padding: '12px 30px', fontSize: '18px' }}
              >
                End Conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}