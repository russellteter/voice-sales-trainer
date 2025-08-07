"""
Voice Processing API
FastAPI endpoints for ElevenLabs Conversational AI integration
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from pydantic import BaseModel
import uuid
from datetime import datetime

from integrations.elevenlabs import (
    ElevenLabsConversationalClient, 
    ElevenLabsConfig, 
    create_sales_coach_session,
    create_prospect_session,
    ConversationState
)
from config.settings import settings

# Configure logging
logger = logging.getLogger(__name__)

# Router for voice endpoints
router = APIRouter()

# In-memory session storage (in production, use Redis or database)
active_sessions: Dict[str, ElevenLabsConversationalClient] = {}

# Pydantic models for API requests/responses

class ConversationCreateRequest(BaseModel):
    """Request model for creating a conversation"""
    scenario_type: str  # "coach" or "prospect"
    scenario_config: Dict[str, Any]
    voice_id: Optional[str] = "default"
    max_duration: Optional[int] = 1800

class ConversationCreateResponse(BaseModel):
    """Response model for conversation creation"""
    session_id: str
    websocket_url: str
    status: str
    created_at: datetime

class SynthesizeRequest(BaseModel):
    """Request model for text-to-speech synthesis"""
    text: str
    voice_id: Optional[str] = "default"
    model_id: Optional[str] = "eleven_turbo_v2_5"

class TranscribeRequest(BaseModel):
    """Request model for speech-to-text transcription"""
    audio_base64: str
    sample_rate: Optional[int] = 16000

class VoiceSessionStatus(BaseModel):
    """Voice session status response"""
    session_id: str
    state: str
    connected_at: Optional[datetime]
    message_count: int
    performance_metrics: Dict[str, Any]

# REST API Endpoints

@router.post("/conversations", response_model=ConversationCreateResponse)
async def create_conversation(request: ConversationCreateRequest):
    """
    Create a new voice conversation session with ElevenLabs
    
    This endpoint creates either a sales coach session or prospect role-play session
    based on the scenario type specified in the request.
    """
    try:
        session_id = str(uuid.uuid4())
        
        # Validate ElevenLabs API key
        if not settings.ELEVENLABS_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="ElevenLabs API key not configured"
            )
        
        # Create appropriate session based on type
        if request.scenario_type == "coach":
            client = await create_sales_coach_session(
                api_key=settings.ELEVENLABS_API_KEY,
                voice_id=request.voice_id or settings.ELEVENLABS_VOICE_ID
            )
        elif request.scenario_type == "prospect":
            prospect_type = request.scenario_config.get("prospect_type", "enterprise")
            client = await create_prospect_session(
                api_key=settings.ELEVENLABS_API_KEY,
                prospect_type=prospect_type,
                voice_id=request.voice_id or settings.ELEVENLABS_VOICE_ID
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown scenario type: {request.scenario_type}"
            )
        
        # Store session
        active_sessions[session_id] = client
        
        logger.info(f"Created voice conversation session: {session_id}")
        
        return ConversationCreateResponse(
            session_id=session_id,
            websocket_url=f"/voice/stream/{session_id}",
            status="created",
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Failed to create conversation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create conversation: {str(e)}"
        )

@router.get("/conversations/{session_id}/status", response_model=VoiceSessionStatus)
async def get_conversation_status(session_id: str):
    """Get the status of a voice conversation session"""
    if session_id not in active_sessions:
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )
    
    client = active_sessions[session_id]
    metrics = client.get_performance_metrics()
    
    return VoiceSessionStatus(
        session_id=session_id,
        state=client.state.value,
        connected_at=datetime.utcnow(),  # In real implementation, track this
        message_count=len(client.conversation_history),
        performance_metrics=metrics
    )

@router.delete("/conversations/{session_id}")
async def end_conversation(session_id: str):
    """End and cleanup a voice conversation session"""
    if session_id not in active_sessions:
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )
    
    try:
        client = active_sessions[session_id]
        await client.end_conversation()
        del active_sessions[session_id]
        
        logger.info(f"Ended conversation session: {session_id}")
        
        return {"status": "ended", "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Failed to end conversation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to end conversation: {str(e)}"
        )

@router.post("/synthesize")
async def synthesize_text(request: SynthesizeRequest):
    """
    Text-to-speech synthesis for testing and debugging
    
    This endpoint allows direct text-to-speech conversion using ElevenLabs
    without a full conversation session.
    """
    try:
        if not settings.ELEVENLABS_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="ElevenLabs API key not configured"
            )
        
        # Create temporary client for synthesis
        config = ElevenLabsConfig(
            api_key=settings.ELEVENLABS_API_KEY,
            voice_id=request.voice_id or settings.ELEVENLABS_VOICE_ID,
            model_id=request.model_id or settings.ELEVENLABS_MODEL_ID
        )
        
        # TODO: Implement direct TTS call to ElevenLabs
        # For now, return a success response
        
        return {
            "status": "synthesized",
            "text": request.text,
            "voice_id": config.voice_id,
            "audio_url": f"/audio/synthesis/{uuid.uuid4()}.mp3"  # Placeholder
        }
        
    except Exception as e:
        logger.error(f"Text synthesis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Text synthesis failed: {str(e)}"
        )

@router.post("/transcribe")
async def transcribe_audio(request: TranscribeRequest):
    """
    Speech-to-text transcription for testing and debugging
    
    This endpoint allows direct audio transcription for testing purposes.
    """
    try:
        if not request.audio_base64:
            raise HTTPException(
                status_code=400,
                detail="Audio data is required"
            )
        
        # TODO: Implement direct STT call to ElevenLabs or other service
        # For now, return a mock response
        
        return {
            "status": "transcribed",
            "transcript": "This is a mock transcription for testing purposes.",
            "confidence": 0.95,
            "duration_ms": 2500
        }
        
    except Exception as e:
        logger.error(f"Audio transcription failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Audio transcription failed: {str(e)}"
        )

# WebSocket Connection Manager

class VoiceConnectionManager:
    """Manages WebSocket connections for voice sessions"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept a WebSocket connection and link it to a session"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected for session: {session_id}")
    
    async def disconnect(self, session_id: str):
        """Disconnect and cleanup WebSocket connection"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket disconnected for session: {session_id}")
    
    async def send_message(self, session_id: str, message: Dict[str, Any]):
        """Send a message to a specific WebSocket connection"""
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to send message to {session_id}: {e}")
    
    async def broadcast_to_session(self, session_id: str, message_type: str, data: Any):
        """Broadcast a message to all connections for a session"""
        message = {
            "type": message_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": session_id
        }
        await self.send_message(session_id, message)

# Connection manager instance
connection_manager = VoiceConnectionManager()

# WebSocket Endpoints

@router.websocket("/stream/{session_id}")
async def voice_stream_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time voice streaming
    
    This endpoint handles bidirectional audio streaming between the client
    and ElevenLabs Conversational AI service.
    """
    # Verify session exists
    if session_id not in active_sessions:
        await websocket.close(code=4004, reason="Session not found")
        return
    
    try:
        # Accept connection
        await connection_manager.connect(websocket, session_id)
        client = active_sessions[session_id]
        
        # Set up message forwarding from ElevenLabs to client
        async def forward_elevenlabs_messages(message_type: str, data: Any):
            """Forward messages from ElevenLabs to WebSocket client"""
            try:
                await connection_manager.broadcast_to_session(
                    session_id, message_type, data
                )
            except Exception as e:
                logger.error(f"Error forwarding message: {e}")
        
        # Register callbacks
        client.add_message_callback(forward_elevenlabs_messages)
        client.add_state_callback(
            lambda state: connection_manager.broadcast_to_session(
                session_id, "state_change", {"state": state.value}
            )
        )
        client.add_error_callback(
            lambda error: connection_manager.broadcast_to_session(
                session_id, "error", {"error": error}
            )
        )
        
        # Send initial connection confirmation
        await connection_manager.send_message(session_id, {
            "type": "connected",
            "session_id": session_id,
            "state": client.state.value,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Handle incoming messages from client
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                await handle_client_message(client, message, session_id)
                
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for session: {session_id}")
                break
            except json.JSONDecodeError as e:
                logger.warning(f"Invalid JSON from client: {e}")
                await connection_manager.send_message(session_id, {
                    "type": "error",
                    "error": "Invalid JSON format"
                })
            except Exception as e:
                logger.error(f"Error handling client message: {e}")
                await connection_manager.send_message(session_id, {
                    "type": "error",
                    "error": str(e)
                })
                break
    
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
    
    finally:
        # Cleanup
        await connection_manager.disconnect(session_id)

async def handle_client_message(client: ElevenLabsConversationalClient, message: Dict[str, Any], session_id: str):
    """Handle messages received from WebSocket client"""
    message_type = message.get("type", "unknown")
    
    if message_type == "audio":
        # Handle audio data from client
        audio_base64 = message.get("audio_base64", "")
        if audio_base64:
            import base64
            audio_data = base64.b64decode(audio_base64)
            success = await client.send_audio(audio_data)
            
            if not success:
                await connection_manager.send_message(session_id, {
                    "type": "error",
                    "error": "Failed to process audio"
                })
    
    elif message_type == "text":
        # Handle text message from client
        text = message.get("text", "")
        if text:
            success = await client.send_text_interrupt(text)
            
            if not success:
                await connection_manager.send_message(session_id, {
                    "type": "error", 
                    "error": "Failed to process text"
                })
    
    elif message_type == "ping":
        # Handle ping/pong for connection health
        await connection_manager.send_message(session_id, {
            "type": "pong",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    elif message_type == "get_status":
        # Handle status request
        metrics = client.get_performance_metrics()
        await connection_manager.send_message(session_id, {
            "type": "status",
            "data": metrics
        })
    
    else:
        logger.warning(f"Unknown message type from client: {message_type}")
        await connection_manager.send_message(session_id, {
            "type": "error",
            "error": f"Unknown message type: {message_type}"
        })

# Health check and monitoring endpoints

@router.get("/health")
async def voice_health_check():
    """Health check for voice services"""
    return {
        "status": "healthy",
        "service": "voice_api",
        "active_sessions": len(active_sessions),
        "active_connections": len(connection_manager.active_connections),
        "elevenlabs_configured": bool(settings.ELEVENLABS_API_KEY),
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/sessions")
async def list_active_sessions():
    """List all active voice sessions (for monitoring)"""
    sessions = []
    for session_id, client in active_sessions.items():
        sessions.append({
            "session_id": session_id,
            "state": client.state.value,
            "message_count": len(client.conversation_history),
            "has_websocket": session_id in connection_manager.active_connections
        })
    
    return {
        "active_sessions": sessions,
        "total_count": len(sessions)
    }

# Cleanup task for inactive sessions
async def cleanup_inactive_sessions():
    """Background task to cleanup inactive sessions"""
    while True:
        try:
            # Check for sessions in error state or disconnected for too long
            sessions_to_remove = []
            
            for session_id, client in active_sessions.items():
                if client.state == ConversationState.ERROR:
                    sessions_to_remove.append(session_id)
                elif (client.state == ConversationState.DISCONNECTED and 
                      session_id not in connection_manager.active_connections):
                    sessions_to_remove.append(session_id)
            
            # Remove inactive sessions
            for session_id in sessions_to_remove:
                try:
                    client = active_sessions[session_id]
                    await client.end_conversation()
                    del active_sessions[session_id]
                    logger.info(f"Cleaned up inactive session: {session_id}")
                except Exception as e:
                    logger.error(f"Error cleaning up session {session_id}: {e}")
            
            # Wait before next cleanup cycle
            await asyncio.sleep(300)  # Check every 5 minutes
            
        except Exception as e:
            logger.error(f"Error in cleanup task: {e}")
            await asyncio.sleep(60)  # Wait 1 minute on error

# Start cleanup task when module loads
asyncio.create_task(cleanup_inactive_sessions())