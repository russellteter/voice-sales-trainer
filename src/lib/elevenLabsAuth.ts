// ElevenLabs Authentication Helper for Client-Side Applications

export interface ElevenLabsAgent {
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

export interface SignedUrlResponse {
  signed_url: string;
  agent_id: string;
  expires_at: string;
}

// Create a simple proxy function to handle CORS
export async function createElevenLabsAgent(
  agentConfig: Omit<ElevenLabsAgent, 'agent_id'>,
  apiKey: string
): Promise<string> {
  
  // For demo purposes, we'll use a simple approach with pre-created public agents
  // In production, you'd want a backend service to handle this
  
  try {
    // Try to create agent directly (this might fail due to CORS)
    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const agent = await response.json();
    return agent.agent_id;
    
  } catch (error) {
    console.error('Direct API call failed:', error);
    
    // Fallback: Use a pre-created public agent ID or demo agent
    // This would be replaced with proper signed URL generation in production
    throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate signed URL for WebSocket connection (requires backend)
export async function getSignedWebSocketUrl(
  agentId: string, 
  apiKey: string
): Promise<string> {
  try {
    // This would typically be a call to your backend service
    // For now, we'll return the direct WebSocket URL (may fail due to CORS)
    
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        require_auth: false // For demo purposes
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status}`);
    }

    const conversation = await response.json();
    return `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}&conversation_id=${conversation.conversation_id}`;
    
  } catch (error) {
    // Fallback to direct WebSocket URL
    return `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
  }
}

// Demo agent configurations that can be used without authentication
export const DEMO_AGENTS = {
  coldCall: {
    // This would be a pre-created public agent ID
    agent_id: 'demo-cold-call-agent',
    name: 'Cold Call Demo Agent'
  },
  objectionHandling: {
    agent_id: 'demo-objection-agent', 
    name: 'Objection Handling Demo Agent'
  },
  closing: {
    agent_id: 'demo-closing-agent',
    name: 'Closing Demo Agent'
  }
};

// Alternative: Use ElevenLabs TTS + OpenAI for a hybrid approach
export async function createHybridVoiceAgent(
  scenario: string,
  claudeApiKey: string,
  elevenLabsApiKey: string
) {
  // This approach would use:
  // 1. Browser's speech recognition for user input
  // 2. Claude API for conversation logic  
  // 3. ElevenLabs TTS API for voice responses
  // This avoids the need for WebSocket connections
  
  return {
    type: 'hybrid',
    scenario,
    claudeApiKey,
    elevenLabsApiKey
  };
}