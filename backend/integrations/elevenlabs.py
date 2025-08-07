"""
ElevenLabs Conversational AI Integration
Handles real-time voice processing via ElevenLabs Conversational AI
"""

import asyncio
import json
import logging
import time
import uuid
import websockets
from typing import Optional, Dict, Any, Callable, AsyncGenerator
from dataclasses import dataclass, asdict
from enum import Enum
import base64
import aiohttp
from config.settings import settings

# Configure logging
logger = logging.getLogger(__name__)

class ConversationState(Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    SPEAKING = "speaking"
    LISTENING = "listening"
    ERROR = "error"

@dataclass
class ElevenLabsConfig:
    """Configuration for ElevenLabs integration"""
    api_key: str
    voice_id: str = "default"
    model_id: str = "eleven_turbo_v2_5"
    sample_rate: int = 16000
    latency_target_ms: int = 2000
    
    def __post_init__(self):
        if not self.api_key:
            raise ValueError("ElevenLabs API key is required")

@dataclass
class AudioChunk:
    """Represents an audio data chunk"""
    data: bytes
    timestamp: float
    chunk_id: str
    is_final: bool = False
    
    def to_base64(self) -> str:
        return base64.b64encode(self.data).decode('utf-8')

@dataclass
class ConversationMessage:
    """Represents a conversation message"""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: float
    audio_chunk_id: Optional[str] = None
    confidence: Optional[float] = None

class ElevenLabsConversationalClient:
    """
    ElevenLabs Conversational AI client for real-time voice processing.
    Handles WebSocket connections, audio streaming, and conversation management.
    """
    
    def __init__(self, config: ElevenLabsConfig):
        self.config = config
        self.websocket = None
        self.session_id = None
        self.state = ConversationState.DISCONNECTED
        self.conversation_history = []
        self.audio_buffer = []
        self.message_callbacks = []
        self.state_callbacks = []
        self.error_callbacks = []
        self._reconnect_attempts = 0
        self._max_reconnect_attempts = 5
        self._latency_tracker = []
        
    async def start_conversation(self, agent_config: Dict[str, Any]) -> str:
        """
        Start a new conversation session with ElevenLabs Conversational AI
        
        Args:
            agent_config: Configuration for the conversation agent
            
        Returns:
            session_id: Unique identifier for the conversation session
        """
        try:
            self.session_id = str(uuid.uuid4())
            self.state = ConversationState.CONNECTING
            self._notify_state_change()
            
            # Create conversation via REST API first
            conversation_data = await self._create_conversation(agent_config)
            
            # Connect to WebSocket for real-time communication
            await self._connect_websocket()
            
            self.state = ConversationState.CONNECTED
            self._notify_state_change()
            
            logger.info(f"Started conversation session: {self.session_id}")
            return self.session_id
            
        except Exception as e:
            logger.error(f"Failed to start conversation: {e}")
            self.state = ConversationState.ERROR
            self._notify_error(f"Failed to start conversation: {e}")
            raise
    
    async def _create_conversation(self, agent_config: Dict[str, Any]) -> Dict[str, Any]:
        """Create a conversation session via ElevenLabs REST API"""
        url = "https://api.elevenlabs.io/v1/convai/conversations"
        
        headers = {
            "xi-api-key": self.config.api_key,
            "Content-Type": "application/json"
        }
        
        # Default agent configuration for sales training
        default_config = {
            "agent_id": agent_config.get("agent_id", "default"),
            "voice_id": self.config.voice_id,
            "model_id": self.config.model_id,
            "conversation_config": {
                "agent": {
                    "prompt": agent_config.get("prompt", self._get_default_prompt()),
                    "language": agent_config.get("language", "en"),
                    "max_duration_seconds": agent_config.get("max_duration", 1800),
                    "response_generation": {
                        "temperature": 0.7,
                        "max_tokens": 150
                    }
                },
                "conversation": {
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 500
                    }
                }
            }
        }
        
        # Merge with provided config
        conversation_config = {**default_config, **agent_config}
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=conversation_config) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Failed to create conversation: {error_text}")
                
                return await response.json()
    
    async def _connect_websocket(self):
        """Connect to ElevenLabs WebSocket for real-time communication"""
        ws_url = f"wss://api.elevenlabs.io/v1/convai/conversation?agent_id={self.config.voice_id}"
        
        headers = {
            "xi-api-key": self.config.api_key,
        }
        
        try:
            self.websocket = await websockets.connect(
                ws_url,
                extra_headers=headers,
                ping_interval=30,
                ping_timeout=10,
                close_timeout=10
            )
            
            # Start message handling
            asyncio.create_task(self._handle_websocket_messages())
            
        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            raise
    
    async def _handle_websocket_messages(self):
        """Handle incoming WebSocket messages from ElevenLabs"""
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    await self._process_websocket_message(data)
                except json.JSONDecodeError as e:
                    logger.warning(f"Invalid JSON received: {e}")
                except Exception as e:
                    logger.error(f"Error processing WebSocket message: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket connection closed")
            await self._handle_disconnection()
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            self.state = ConversationState.ERROR
            self._notify_error(f"WebSocket error: {e}")
    
    async def _process_websocket_message(self, data: Dict[str, Any]):
        """Process individual WebSocket messages"""
        message_type = data.get("type", "unknown")
        
        if message_type == "conversation_initiation_metadata":
            await self._handle_conversation_init(data)
        elif message_type == "audio":
            await self._handle_audio_message(data)
        elif message_type == "user_transcript":
            await self._handle_user_transcript(data)
        elif message_type == "agent_response":
            await self._handle_agent_response(data)
        elif message_type == "interruption":
            await self._handle_interruption(data)
        elif message_type == "ping":
            await self._handle_ping()
        else:
            logger.debug(f"Unknown message type: {message_type}")
    
    async def _handle_conversation_init(self, data: Dict[str, Any]):
        """Handle conversation initialization"""
        logger.info("Conversation initialized")
        self.state = ConversationState.LISTENING
        self._notify_state_change()
    
    async def _handle_audio_message(self, data: Dict[str, Any]):
        """Handle incoming audio data from agent"""
        audio_data = base64.b64decode(data.get("audio_base_64", ""))
        chunk_id = data.get("chunk_id", str(uuid.uuid4()))
        is_final = data.get("is_final", False)
        
        audio_chunk = AudioChunk(
            data=audio_data,
            timestamp=time.time(),
            chunk_id=chunk_id,
            is_final=is_final
        )
        
        self.audio_buffer.append(audio_chunk)
        
        # Notify subscribers about new audio
        for callback in self.message_callbacks:
            try:
                await callback("audio", audio_chunk)
            except Exception as e:
                logger.warning(f"Error in audio callback: {e}")
    
    async def _handle_user_transcript(self, data: Dict[str, Any]):
        """Handle user speech transcript"""
        transcript = data.get("user_transcript", "")
        confidence = data.get("confidence", 0.0)
        is_final = data.get("is_final", False)
        
        if transcript and is_final:
            message = ConversationMessage(
                role="user",
                content=transcript,
                timestamp=time.time(),
                confidence=confidence
            )
            
            self.conversation_history.append(message)
            
            # Notify subscribers
            for callback in self.message_callbacks:
                try:
                    await callback("user_message", message)
                except Exception as e:
                    logger.warning(f"Error in user message callback: {e}")
    
    async def _handle_agent_response(self, data: Dict[str, Any]):
        """Handle agent text response"""
        response_text = data.get("agent_response", "")
        
        if response_text:
            message = ConversationMessage(
                role="assistant",
                content=response_text,
                timestamp=time.time()
            )
            
            self.conversation_history.append(message)
            
            # Track response latency
            self._track_latency()
            
            # Notify subscribers
            for callback in self.message_callbacks:
                try:
                    await callback("agent_message", message)
                except Exception as e:
                    logger.warning(f"Error in agent message callback: {e}")
    
    async def _handle_interruption(self, data: Dict[str, Any]):
        """Handle conversation interruption"""
        logger.info("Conversation interrupted")
        self.state = ConversationState.LISTENING
        self._notify_state_change()
    
    async def _handle_ping(self):
        """Handle ping message"""
        if self.websocket:
            await self.websocket.send(json.dumps({"type": "pong"}))
    
    async def send_audio(self, audio_data: bytes) -> bool:
        """
        Send audio data to ElevenLabs for processing
        
        Args:
            audio_data: Raw audio bytes (PCM 16kHz)
            
        Returns:
            bool: Success status
        """
        if not self.websocket or self.state != ConversationState.CONNECTED:
            logger.warning("Cannot send audio - not connected")
            return False
        
        try:
            self.state = ConversationState.SPEAKING
            self._notify_state_change()
            
            message = {
                "type": "audio",
                "audio_base_64": base64.b64encode(audio_data).decode('utf-8'),
                "sample_rate": self.config.sample_rate,
                "chunk_id": str(uuid.uuid4())
            }
            
            await self.websocket.send(json.dumps(message))
            
            self.state = ConversationState.LISTENING
            self._notify_state_change()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send audio: {e}")
            return False
    
    async def send_text_interrupt(self, text: str) -> bool:
        """
        Send text message for processing (intercepted by Claude)
        
        Args:
            text: Text to process
            
        Returns:
            bool: Success status
        """
        if not text.strip():
            return False
            
        try:
            # This would be intercepted by our Claude processing layer
            # before being sent to ElevenLabs
            message = ConversationMessage(
                role="user",
                content=text,
                timestamp=time.time()
            )
            
            # Process through Claude intelligence layer
            enhanced_response = await self._process_with_claude(text)
            
            # Send enhanced response to ElevenLabs for synthesis
            if enhanced_response:
                await self._send_text_for_synthesis(enhanced_response)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send text interrupt: {e}")
            return False
    
    async def _process_with_claude(self, user_text: str) -> Optional[str]:
        """
        Process user input through Claude for sales coaching intelligence
        This is where the learning intelligence layer would integrate
        """
        # TODO: Integrate with Claude API for sales coaching
        # For now, return a placeholder response
        return f"Claude-enhanced response to: {user_text}"
    
    async def _send_text_for_synthesis(self, text: str):
        """Send text to ElevenLabs for voice synthesis"""
        if not self.websocket:
            return
            
        try:
            message = {
                "type": "text",
                "text": text,
                "timestamp": time.time()
            }
            
            await self.websocket.send(json.dumps(message))
            
        except Exception as e:
            logger.error(f"Failed to send text for synthesis: {e}")
    
    async def end_conversation(self):
        """End the current conversation session"""
        try:
            if self.websocket:
                await self.websocket.close()
                self.websocket = None
            
            self.state = ConversationState.DISCONNECTED
            self._notify_state_change()
            
            logger.info(f"Ended conversation session: {self.session_id}")
            
        except Exception as e:
            logger.error(f"Error ending conversation: {e}")
    
    async def _handle_disconnection(self):
        """Handle WebSocket disconnection with reconnection logic"""
        if self._reconnect_attempts < self._max_reconnect_attempts:
            self._reconnect_attempts += 1
            wait_time = min(2 ** self._reconnect_attempts, 30)  # Exponential backoff
            
            logger.info(f"Attempting reconnection {self._reconnect_attempts}/{self._max_reconnect_attempts} in {wait_time}s")
            
            await asyncio.sleep(wait_time)
            
            try:
                await self._connect_websocket()
                self._reconnect_attempts = 0  # Reset on successful reconnection
                self.state = ConversationState.CONNECTED
                self._notify_state_change()
                
            except Exception as e:
                logger.error(f"Reconnection attempt failed: {e}")
        else:
            logger.error("Max reconnection attempts reached")
            self.state = ConversationState.ERROR
            self._notify_error("Connection lost - max reconnection attempts reached")
    
    def add_message_callback(self, callback: Callable):
        """Add callback for conversation messages"""
        self.message_callbacks.append(callback)
    
    def add_state_callback(self, callback: Callable):
        """Add callback for state changes"""
        self.state_callbacks.append(callback)
    
    def add_error_callback(self, callback: Callable):
        """Add callback for errors"""
        self.error_callbacks.append(callback)
    
    def _notify_state_change(self):
        """Notify subscribers of state changes"""
        for callback in self.state_callbacks:
            try:
                asyncio.create_task(callback(self.state))
            except Exception as e:
                logger.warning(f"Error in state callback: {e}")
    
    def _notify_error(self, error_message: str):
        """Notify subscribers of errors"""
        for callback in self.error_callbacks:
            try:
                asyncio.create_task(callback(error_message))
            except Exception as e:
                logger.warning(f"Error in error callback: {e}")
    
    def _track_latency(self):
        """Track response latency for performance monitoring"""
        current_time = time.time()
        self._latency_tracker.append(current_time)
        
        # Keep only last 10 measurements
        if len(self._latency_tracker) > 10:
            self._latency_tracker.pop(0)
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for the conversation"""
        return {
            "session_id": self.session_id,
            "state": self.state.value,
            "message_count": len(self.conversation_history),
            "audio_chunks": len(self.audio_buffer),
            "reconnection_attempts": self._reconnect_attempts,
            "average_latency_ms": self._calculate_average_latency(),
            "target_latency_ms": self.config.latency_target_ms
        }
    
    def _calculate_average_latency(self) -> float:
        """Calculate average response latency"""
        if len(self._latency_tracker) < 2:
            return 0.0
        
        latencies = []
        for i in range(1, len(self._latency_tracker)):
            latency_ms = (self._latency_tracker[i] - self._latency_tracker[i-1]) * 1000
            latencies.append(latency_ms)
        
        return sum(latencies) / len(latencies) if latencies else 0.0
    
    def _get_default_prompt(self) -> str:
        """Get default prompt for sales training scenarios"""
        return """You are an expert sales trainer and conversation partner. Your role is to:

1. Conduct realistic sales conversations as various prospect personas
2. Adapt your responses based on the training scenario
3. Provide natural, human-like reactions and objections
4. Challenge the user appropriately to improve their skills
5. Stay in character throughout the conversation

You should be conversational, realistic, and focused on helping the user practice and improve their sales skills. Respond as a prospect would in a real sales situation."""

# Convenience functions for common use cases

async def create_sales_coach_session(api_key: str, voice_id: str = "default") -> ElevenLabsConversationalClient:
    """Create a conversation session configured for sales coaching"""
    config = ElevenLabsConfig(
        api_key=api_key,
        voice_id=voice_id,
        model_id="eleven_turbo_v2_5"
    )
    
    client = ElevenLabsConversationalClient(config)
    
    coach_config = {
        "agent_id": "sales_coach_marcus",
        "prompt": """You are Coach Marcus, an experienced sales trainer with 15 years in B2B sales. 
        Your role is to guide sales training sessions with encouraging but realistic feedback. 
        You help salespeople practice difficult conversations and improve their techniques.""",
        "language": "en",
        "max_duration": 1800
    }
    
    await client.start_conversation(coach_config)
    return client

async def create_prospect_session(api_key: str, prospect_type: str = "enterprise", voice_id: str = "default") -> ElevenLabsConversationalClient:
    """Create a conversation session configured for prospect role-play"""
    config = ElevenLabsConfig(
        api_key=api_key,
        voice_id=voice_id,
        model_id="eleven_turbo_v2_5"
    )
    
    client = ElevenLabsConversationalClient(config)
    
    # Different prospect personas based on type
    prospect_prompts = {
        "enterprise": """You are Tim, a busy VP of Sales at a 500-person SaaS company. 
        You're skeptical of new vendors, focused on ROI, and have limited time for calls. 
        You ask tough questions about pricing, implementation, and measurable results.""",
        
        "smb": """You are Sarah, a business owner of a 50-person company. 
        You're budget-conscious, hands-on, and need to see immediate value. 
        You're interested but cautious about new investments.""",
        
        "startup": """You are Alex, a founder of a 15-person startup. 
        You move fast, are open to new tools, but have very limited budget. 
        You need solutions that can scale with rapid growth."""
    }
    
    prospect_config = {
        "agent_id": f"prospect_{prospect_type}",
        "prompt": prospect_prompts.get(prospect_type, prospect_prompts["enterprise"]),
        "language": "en",
        "max_duration": 1200
    }
    
    await client.start_conversation(prospect_config)
    return client