import { NextResponse } from 'next/server';

export async function GET() {
  // Validate that required environment variables are present
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ElevenLabs API key not configured' },
      { status: 500 }
    );
  }
  
  if (!voiceId) {
    return NextResponse.json(
      { error: 'ElevenLabs Voice ID not configured' },
      { status: 500 }
    );
  }
  
  // Return configuration without exposing the actual API key
  return NextResponse.json({
    hasApiKey: true,
    hasVoiceId: true,
    voiceId: voiceId,
    // Never return the actual API key to the client
  });
}