import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  
  if (!apiKey || !voiceId) {
    return new Response('API configuration missing', { status: 500 });
  }
  
  // For WebSocket connections, we need to return the configuration
  // The client will need to handle the WebSocket connection directly
  // but we'll provide a secure endpoint to get the necessary config
  return Response.json({
    wsUrl: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${voiceId}`,
    voiceId: voiceId,
    // We'll provide the API key through a different secure mechanism
  });
}

export async function POST(request: NextRequest) {
  // This endpoint will handle WebSocket authentication
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    return Response.json({ error: 'API key not configured' }, { status: 500 });
  }
  
  // Return the API key for WebSocket authentication
  // This should only be called from the server-side or through secure means
  return Response.json({ 
    apiKey: apiKey,
    timestamp: Date.now() // Add timestamp for security
  });
}