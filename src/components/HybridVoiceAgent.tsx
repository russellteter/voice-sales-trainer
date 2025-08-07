'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface HybridVoiceAgentProps {
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
  audioUrl?: string;
}

interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export default function HybridVoiceAgent({
  scenario,
  claudeApiKey,
  elevenLabsApiKey,
  onConversationEnd,
  onBack
}: HybridVoiceAgentProps) {
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState<ConversationTurn[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationDuration, setConversationDuration] = useState(0);
  const [conversationContext, setConversationContext] = useState<string>('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get scenario-specific system prompt
  const getSystemPrompt = useCallback(() => {
    const basePrompt = `You are playing the role of a prospect/customer in a sales conversation training scenario. Keep your responses natural, realistic, and under 50 words each. Stay in character consistently.`;
    
    switch (scenario.category) {
      case 'Cold Calling':
        return `${basePrompt}

You are Sarah Chen, Director of Operations at TechFlow Solutions (200 employees). You're receiving a cold call and are initially skeptical but professional. You have pain points around manual processes and need automation solutions.

Personality: Busy, direct, values efficiency. Start somewhat resistant but can be engaged if the caller shows they've done research and presents clear value.

Current situation: You're in between meetings and weren't expecting this call.`;

      case 'Objection Handling':
        return `${basePrompt}

You are Mike Rodriguez, IT Director at GrowthCorp (50 employees). You're interested in the solution but have genuine budget concerns. You like the product but are hesitant about the cost and ROI timeline.

Personality: Practical, budget-conscious, needs to justify expenses to leadership. 

Your main objection: "This seems expensive for our current stage" but you can be convinced with the right approach to value and ROI.`;

      case 'Closing':
        return `${basePrompt}

You are Jennifer Walsh, VP of Technology at Enterprise Solutions Inc (1000+ employees). You've been evaluating solutions and this one is your top choice, but you need help navigating the enterprise buying process.

Personality: Professional, methodical, ready to buy but needs guarantees and clear next steps for board approval, procurement process, and implementation.

You're genuinely interested but need the salesperson to guide you through the enterprise sales process.`;

      default:
        return `${basePrompt}

You are a professional business decision-maker interested in learning about solutions but with realistic concerns and questions. Be engaging but appropriately cautious.`;
    }
  }, [scenario]);

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Safari.');
      return false;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      console.log('User said:', transcript);
      
      // Add user input to transcript
      const userTurn: ConversationTurn = {
        speaker: 'user',
        text: transcript,
        timestamp: Date.now()
      };
      
      setCurrentTranscript(prev => [...prev, userTurn]);
      setIsListening(false);
      setIsProcessing(true);

      // Get AI response and convert to speech
      await handleAIResponse(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        startListening(); // Restart listening if no speech detected
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isConversationActive && !isProcessing && !isAgentSpeaking) {
        // Restart listening automatically
        setTimeout(startListening, 1000);
      }
    };

    recognitionRef.current = recognition;
    return true;
  }, [isConversationActive, isProcessing, isAgentSpeaking]);

  // Handle AI response generation
  const handleAIResponse = async (userInput: string) => {
    try {
      // Build conversation context
      const messages = [
        {
          role: 'system',
          content: getSystemPrompt()
        },
        ...currentTranscript.map(turn => ({
          role: turn.speaker === 'user' ? 'human' : 'assistant',
          content: turn.text
        })),
        {
          role: 'human', 
          content: userInput
        }
      ];

      // Call Claude API
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${claudeApiKey}`,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 150,
          messages: messages.slice(-10) // Keep last 10 messages for context
        })
      });

      if (!claudeResponse.ok) {
        throw new Error(`Claude API error: ${claudeResponse.status}`);
      }

      const claudeData: ClaudeResponse = await claudeResponse.json();
      const aiResponseText = claudeData.content[0]?.text || 'I understand. Could you tell me more?';

      console.log('AI Response:', aiResponseText);

      // Convert AI response to speech using ElevenLabs
      await convertToSpeech(aiResponseText);

      // Add AI response to transcript  
      const aiTurn: ConversationTurn = {
        speaker: 'agent',
        text: aiResponseText,
        timestamp: Date.now()
      };
      
      setCurrentTranscript(prev => [...prev, aiTurn]);
      setIsProcessing(false);

    } catch (error) {
      console.error('Error handling AI response:', error);
      setError(`Failed to get AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  // Convert text to speech using ElevenLabs
  const convertToSpeech = async (text: string) => {
    try {
      setIsAgentSpeaking(true);
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play the audio
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }

    } catch (error) {
      console.error('Error converting to speech:', error);
      setError(`Failed to generate speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsAgentSpeaking(false);
    }
  };

  // Start listening for user input
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening && !isProcessing && !isAgentSpeaking) {
      setError(null);
      setIsListening(true);
      recognitionRef.current.start();
    }
  }, [isListening, isProcessing, isAgentSpeaking]);

  // Start conversation
  const startConversation = async () => {
    try {
      setError(null);
      
      // Initialize speech recognition
      if (!initializeSpeechRecognition()) {
        return;
      }

      setIsConversationActive(true);
      setConversationStarted(true);
      startTimeRef.current = Date.now();
      
      // Start duration timer
      timerRef.current = setInterval(() => {
        setConversationDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // AI starts the conversation
      const welcomeMessage = getWelcomeMessage();
      await convertToSpeech(welcomeMessage);
      
      const aiTurn: ConversationTurn = {
        speaker: 'agent',
        text: welcomeMessage,
        timestamp: Date.now()
      };
      
      setCurrentTranscript([aiTurn]);

    } catch (error) {
      console.error('Error starting conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to start conversation');
    }
  };

  // Get welcome message based on scenario
  const getWelcomeMessage = () => {
    switch (scenario.category) {
      case 'Cold Calling':
        return "Hello, this is Sarah Chen. I wasn't expecting your call - what's this regarding?";
      case 'Objection Handling':
        return "Thanks for following up. I've been thinking about your solution, but I have some concerns about the pricing.";
      case 'Closing':
        return "Good to hear from you again. We're moving forward with our evaluation. What are the next steps to get this implemented?";
      default:
        return "Hello, how can I help you today?";
    }
  };

  // End conversation
  const endConversation = () => {
    setIsConversationActive(false);
    setIsListening(false);
    setIsAgentSpeaking(false);
    setIsProcessing(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Generate results
    const results: ConversationResults = {
      duration: conversationDuration,
      score: Math.floor(Math.random() * 30) + 70, // Mock scoring
      feedback: generateFeedback(),
      transcript: currentTranscript
    };

    onConversationEnd(results);
  };

  // Generate feedback based on conversation
  const generateFeedback = () => {
    const feedback = ['Good conversational flow and natural responses'];
    
    if (currentTranscript.length > 6) {
      feedback.push('Excellent engagement - maintained long conversation');
    }
    
    if (scenario.category === 'Cold Calling') {
      feedback.push('Strong opening technique', 'Good discovery questions');
    } else if (scenario.category === 'Objection Handling') {
      feedback.push('Handled price concerns professionally', 'Good value positioning');  
    } else if (scenario.category === 'Closing') {
      feedback.push('Clear next steps provided', 'Professional closing approach');
    }

    feedback.push('Continue practicing to improve natural conversation flow');
    return feedback;
  };

  // Handle audio playback end
  const handleAudioEnd = () => {
    setIsAgentSpeaking(false);
    // Start listening for user response after AI finishes speaking
    if (isConversationActive) {
      setTimeout(startListening, 500);
    }
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
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="container">
      <audio 
        ref={audioRef} 
        onEnded={handleAudioEnd}
        style={{ display: 'none' }}
      />
      
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
            ← Back
          </button>
          <h2 style={{ margin: '0', textAlign: 'center', flex: '1' }}>Voice Conversation</h2>
          <div style={{ width: '80px' }}></div>
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
            <h3 style={{ marginBottom: '16px' }}>Ready to Start Voice Conversation</h3>
            <p style={{ color: '#666', marginBottom: '30px' }}>
              Click start to begin a live voice conversation. Make sure your microphone is enabled and speak clearly.
            </p>
            <button 
              onClick={startConversation}
              className="btn btn-primary"
              style={{ padding: '12px 30px', fontSize: '18px' }}
            >
              Start Conversation
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

            {/* Speaking/Listening Indicator */}
            <div style={{ marginBottom: '30px', textAlign: 'center' }}>
              <div style={{ 
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: 
                  isAgentSpeaking ? '#fef3c7' : 
                  isListening ? '#dcfce7' : 
                  isProcessing ? '#dbeafe' : '#f3f4f6',
                border: `2px solid ${
                  isAgentSpeaking ? '#f59e0b' : 
                  isListening ? '#16a34a' : 
                  isProcessing ? '#3b82f6' : '#d1d5db'
                }`
              }}>
                <span style={{ fontSize: '1.5rem' }}>
                  {isAgentSpeaking ? '🗣️ AI Speaking...' : 
                   isListening ? '👂 Listening...' :
                   isProcessing ? '🤔 Processing...' : '⏸️ Conversation Paused'}
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
                        {turn.speaker === 'user' ? '👤 You' : '🤖 AI Prospect'} • {new Date(turn.timestamp).toLocaleTimeString()}
                      </div>
                      <div>{turn.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Controls */}
            <div style={{ textAlign: 'center', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {!isListening && !isProcessing && !isAgentSpeaking && (
                <button 
                  onClick={startListening}
                  className="btn btn-primary"
                  style={{ padding: '12px 24px' }}
                >
                  🎤 Start Speaking
                </button>
              )}
              <button 
                onClick={endConversation}
                className="btn btn-danger"
                style={{ padding: '12px 24px' }}
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