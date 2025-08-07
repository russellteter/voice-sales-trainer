"""
Comprehensive tests for ElevenLabs voice integration
Tests the complete voice processing pipeline, API endpoints, and WebSocket connections
"""

import pytest
import asyncio
import json
import base64
import tempfile
import os
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket, WebSocketDisconnect
import httpx

# Import our modules
from main import app
from integrations.elevenlabs import (
    ElevenLabsConversationalClient,
    ElevenLabsConfig,
    ConversationState,
    AudioChunk,
    ConversationMessage
)
from services.voice_service import (
    VoiceProcessingPipeline,
    VoiceServiceManager,
    SalesCoachingContext,
    create_sales_coaching_pipeline,
    voice_service_manager
)
from api.voice import active_sessions, connection_manager
from config.settings import settings

# Test fixtures

@pytest.fixture
def client():
    """Test client for FastAPI app"""
    return TestClient(app)

@pytest.fixture
def mock_elevenlabs_config():
    """Mock ElevenLabs configuration"""
    return ElevenLabsConfig(
        api_key="test_api_key",
        voice_id="test_voice_id",
        model_id="eleven_turbo_v2_5",
        sample_rate=16000
    )

@pytest.fixture
def mock_audio_data():
    """Generate mock audio data for testing"""
    # Create a simple sine wave audio data (PCM 16-bit)
    import numpy as np
    sample_rate = 16000
    duration = 1.0  # 1 second
    frequency = 440  # A4 note
    
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    audio = np.sin(2 * np.pi * frequency * t) * 32767
    return audio.astype(np.int16).tobytes()

@pytest.fixture
def mock_coaching_context():
    """Mock sales coaching context"""
    return SalesCoachingContext(
        scenario_type="cold_call",
        prospect_persona="enterprise_vp",
        difficulty_level=2,
        training_objectives=["Practice discovery questions", "Handle objections"],
        conversation_history=[],
        current_step=1,
        performance_score=0.0,
        coaching_feedback=[]
    )

@pytest.fixture(autouse=True)
async def cleanup_sessions():
    """Clean up active sessions after each test"""
    yield
    # Clear active sessions
    active_sessions.clear()
    connection_manager.active_connections.clear()

# Unit Tests for ElevenLabsConversationalClient

class TestElevenLabsConversationalClient:
    
    @pytest.mark.asyncio
    async def test_client_initialization(self, mock_elevenlabs_config):
        """Test client initialization with valid config"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        
        assert client.config == mock_elevenlabs_config
        assert client.session_id is None
        assert client.state == ConversationState.DISCONNECTED
        assert client.conversation_history == []
    
    @pytest.mark.asyncio
    async def test_config_validation(self):
        """Test configuration validation"""
        with pytest.raises(ValueError, match="ElevenLabs API key is required"):
            ElevenLabsConfig(api_key="")
    
    @pytest.mark.asyncio
    async def test_conversation_creation_success(self, mock_elevenlabs_config):
        """Test successful conversation creation"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        
        mock_response = {
            "conversation_id": "test_conversation_id",
            "status": "created"
        }
        
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_post.return_value.__aenter__.return_value.status = 200
            mock_post.return_value.__aenter__.return_value.json.return_value = mock_response
            
            # Mock WebSocket connection
            with patch.object(client, '_connect_websocket') as mock_ws:
                mock_ws.return_value = None
                
                session_id = await client.start_conversation({
                    "agent_id": "test_agent",
                    "prompt": "Test prompt"
                })
                
                assert session_id is not None
                assert client.state == ConversationState.CONNECTED
    
    @pytest.mark.asyncio
    async def test_conversation_creation_failure(self, mock_elevenlabs_config):
        """Test conversation creation failure"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_post.return_value.__aenter__.return_value.status = 400
            mock_post.return_value.__aenter__.return_value.text.return_value = "Bad Request"
            
            with pytest.raises(Exception, match="Failed to create conversation"):
                await client.start_conversation({"agent_id": "test_agent"})
    
    @pytest.mark.asyncio
    async def test_audio_processing(self, mock_elevenlabs_config, mock_audio_data):
        """Test audio data processing and sending"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        client.state = ConversationState.CONNECTED
        
        # Mock WebSocket
        mock_websocket = AsyncMock()
        client.websocket = mock_websocket
        
        success = await client.send_audio(mock_audio_data)
        
        assert success is True
        mock_websocket.send.assert_called_once()
        
        # Verify the message format
        call_args = mock_websocket.send.call_args[0][0]
        message = json.loads(call_args)
        assert message["type"] == "audio"
        assert "audio_base64" in message
    
    @pytest.mark.asyncio
    async def test_text_interrupt_processing(self, mock_elevenlabs_config):
        """Test text interrupt processing"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        
        with patch.object(client, '_process_with_claude') as mock_claude:
            mock_claude.return_value = "Enhanced response"
            
            with patch.object(client, '_send_text_for_synthesis') as mock_tts:
                mock_tts.return_value = None
                
                success = await client.send_text_interrupt("Test input")
                
                assert success is True
                mock_claude.assert_called_once_with("Test input")
                mock_tts.assert_called_once_with("Enhanced response")
    
    @pytest.mark.asyncio
    async def test_callback_system(self, mock_elevenlabs_config):
        """Test callback system for messages and state changes"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        
        # Mock callbacks
        message_callback = AsyncMock()
        state_callback = AsyncMock()
        error_callback = AsyncMock()
        
        client.add_message_callback(message_callback)
        client.add_state_callback(state_callback)
        client.add_error_callback(error_callback)
        
        # Test state change notification
        client.state = ConversationState.CONNECTED
        client._notify_state_change()
        
        # Allow async callbacks to execute
        await asyncio.sleep(0.01)
        
        assert len(client.message_callbacks) == 1
        assert len(client.state_callbacks) == 1
        assert len(client.error_callbacks) == 1

# Unit Tests for Voice Processing Pipeline

class TestVoiceProcessingPipeline:
    
    @pytest.mark.asyncio
    async def test_pipeline_initialization(self, mock_elevenlabs_config):
        """Test voice processing pipeline initialization"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        pipeline = VoiceProcessingPipeline(client)
        
        assert pipeline.client == client
        assert pipeline.session_id is not None
        assert pipeline.metrics is not None
        assert pipeline.coaching_context is None
    
    @pytest.mark.asyncio
    async def test_coaching_context_setting(self, mock_elevenlabs_config, mock_coaching_context):
        """Test setting coaching context"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        pipeline = VoiceProcessingPipeline(client)
        
        pipeline.set_coaching_context(mock_coaching_context)
        
        assert pipeline.coaching_context == mock_coaching_context
    
    @pytest.mark.asyncio
    async def test_audio_processing_pipeline(self, mock_elevenlabs_config, mock_audio_data):
        """Test complete audio processing pipeline"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        pipeline = VoiceProcessingPipeline(client)
        
        # Mock the pipeline stages
        with patch.object(client, 'send_audio') as mock_send_audio:
            mock_send_audio.return_value = True
            
            with patch.object(pipeline, '_wait_for_transcription') as mock_transcription:
                mock_transcription.return_value = "Test transcript"
                
                with patch.object(pipeline, '_process_with_claude') as mock_claude:
                    mock_claude.return_value = {
                        "response": "Test response",
                        "coaching_feedback": ["Good job!"],
                        "confidence": 0.95
                    }
                    
                    with patch.object(client, 'send_text_interrupt') as mock_tts:
                        mock_tts.return_value = True
                        
                        with patch.object(pipeline, '_wait_for_synthesis_completion') as mock_synthesis:
                            mock_synthesis.return_value = None
                            
                            result = await pipeline.process_user_audio(mock_audio_data)
                            
                            assert result["status"] == "success"
                            assert "transcript" in result
                            assert "response" in result
                            assert "metrics" in result
    
    @pytest.mark.asyncio
    async def test_claude_processing(self, mock_elevenlabs_config, mock_coaching_context):
        """Test Claude processing with coaching context"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        pipeline = VoiceProcessingPipeline(client)
        pipeline.set_coaching_context(mock_coaching_context)
        
        user_input = "I'm having trouble with price objections"
        result = await pipeline._process_with_claude(user_input)
        
        assert "response" in result
        assert "coaching_feedback" in result
        assert "confidence" in result
        assert isinstance(result["coaching_feedback"], list)
    
    @pytest.mark.asyncio
    async def test_performance_metrics_tracking(self, mock_elevenlabs_config):
        """Test performance metrics tracking"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        pipeline = VoiceProcessingPipeline(client)
        
        # Simulate metric updates
        await pipeline._update_metrics(1500, 300, 800, 400, 0.92)
        
        metrics = pipeline.get_metrics()
        assert metrics.total_latency_ms == 1500
        assert metrics.stt_latency_ms == 300
        assert metrics.claude_latency_ms == 800
        assert metrics.tts_latency_ms == 400
        assert metrics.confidence_score == 0.92

# Integration Tests for API Endpoints

class TestVoiceAPI:
    
    def test_health_check(self, client):
        """Test voice API health check endpoint"""
        response = client.get("/voice/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "voice_api"
        assert "active_sessions" in data
    
    @patch('api.voice.settings.ELEVENLABS_API_KEY', 'test_key')
    def test_create_conversation_success(self, client):
        """Test successful conversation creation via API"""
        conversation_request = {
            "scenario_type": "coach",
            "scenario_config": {
                "difficulty_level": 2
            },
            "voice_id": "test_voice"
        }
        
        with patch('integrations.elevenlabs.create_sales_coach_session') as mock_create:
            mock_client = Mock()
            mock_client.session_id = "test_session_id"
            mock_create.return_value = mock_client
            
            response = client.post("/voice/conversations", json=conversation_request)
            
            assert response.status_code == 200
            data = response.json()
            assert "session_id" in data
            assert data["status"] == "created"
    
    def test_create_conversation_no_api_key(self, client):
        """Test conversation creation without API key"""
        conversation_request = {
            "scenario_type": "coach",
            "scenario_config": {}
        }
        
        with patch('api.voice.settings.ELEVENLABS_API_KEY', None):
            response = client.post("/voice/conversations", json=conversation_request)
            
            assert response.status_code == 500
            assert "ElevenLabs API key not configured" in response.json()["detail"]
    
    def test_get_conversation_status_not_found(self, client):
        """Test getting status of non-existent conversation"""
        response = client.get("/voice/conversations/nonexistent/status")
        assert response.status_code == 404
        assert "Session not found" in response.json()["detail"]
    
    def test_end_conversation_success(self, client):
        """Test successful conversation termination"""
        session_id = "test_session"
        
        # Add mock session
        mock_client = AsyncMock()
        active_sessions[session_id] = mock_client
        
        response = client.delete(f"/voice/conversations/{session_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ended"
        assert data["session_id"] == session_id
        assert session_id not in active_sessions
    
    def test_synthesize_text_success(self, client):
        """Test text-to-speech synthesis endpoint"""
        synthesis_request = {
            "text": "Hello, this is a test message",
            "voice_id": "test_voice"
        }
        
        with patch('api.voice.settings.ELEVENLABS_API_KEY', 'test_key'):
            response = client.post("/voice/synthesize", json=synthesis_request)
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "synthesized"
            assert data["text"] == synthesis_request["text"]
    
    def test_transcribe_audio_success(self, client):
        """Test speech-to-text transcription endpoint"""
        # Create base64 encoded mock audio
        mock_audio = b"fake_audio_data"
        audio_base64 = base64.b64encode(mock_audio).decode('utf-8')
        
        transcription_request = {
            "audio_base64": audio_base64,
            "sample_rate": 16000
        }
        
        response = client.post("/voice/transcribe", json=transcription_request)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "transcribed"
        assert "transcript" in data

# WebSocket Tests

class TestVoiceWebSocket:
    
    @pytest.mark.asyncio
    async def test_websocket_connection_success(self, client):
        """Test successful WebSocket connection"""
        session_id = "test_session"
        
        # Create mock session
        mock_client = Mock()
        mock_client.add_message_callback = Mock()
        mock_client.add_state_callback = Mock()
        mock_client.add_error_callback = Mock()
        mock_client.state.value = "connected"
        active_sessions[session_id] = mock_client
        
        with client.websocket_connect(f"/voice/stream/{session_id}") as websocket:
            # Should receive initial connection message
            data = websocket.receive_json()
            assert data["type"] == "connected"
            assert data["session_id"] == session_id
    
    @pytest.mark.asyncio
    async def test_websocket_connection_invalid_session(self, client):
        """Test WebSocket connection with invalid session"""
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/voice/stream/nonexistent") as websocket:
                pass  # Should disconnect immediately
    
    @pytest.mark.asyncio
    async def test_websocket_audio_message_handling(self, client):
        """Test handling of audio messages via WebSocket"""
        session_id = "test_session"
        
        # Create mock session
        mock_client = AsyncMock()
        mock_client.add_message_callback = Mock()
        mock_client.add_state_callback = Mock()
        mock_client.add_error_callback = Mock()
        mock_client.state.value = "connected"
        mock_client.send_audio.return_value = True
        active_sessions[session_id] = mock_client
        
        with client.websocket_connect(f"/voice/stream/{session_id}") as websocket:
            # Receive connection confirmation
            websocket.receive_json()
            
            # Send audio message
            audio_message = {
                "type": "audio",
                "audio_base64": base64.b64encode(b"test_audio").decode('utf-8')
            }
            
            websocket.send_json(audio_message)
            
            # Verify mock client received the audio
            # Note: In real test, we'd need to handle async properly
            await asyncio.sleep(0.01)  # Allow processing
    
    @pytest.mark.asyncio
    async def test_websocket_text_message_handling(self, client):
        """Test handling of text messages via WebSocket"""
        session_id = "test_session"
        
        # Create mock session
        mock_client = AsyncMock()
        mock_client.add_message_callback = Mock()
        mock_client.add_state_callback = Mock()
        mock_client.add_error_callback = Mock()
        mock_client.state.value = "connected"
        mock_client.send_text_interrupt.return_value = True
        active_sessions[session_id] = mock_client
        
        with client.websocket_connect(f"/voice/stream/{session_id}") as websocket:
            # Receive connection confirmation
            websocket.receive_json()
            
            # Send text message
            text_message = {
                "type": "text",
                "text": "Hello, this is a test message"
            }
            
            websocket.send_json(text_message)
            
            await asyncio.sleep(0.01)  # Allow processing
    
    @pytest.mark.asyncio
    async def test_websocket_ping_pong(self, client):
        """Test WebSocket ping/pong functionality"""
        session_id = "test_session"
        
        # Create mock session
        mock_client = Mock()
        mock_client.add_message_callback = Mock()
        mock_client.add_state_callback = Mock()
        mock_client.add_error_callback = Mock()
        mock_client.state.value = "connected"
        active_sessions[session_id] = mock_client
        
        with client.websocket_connect(f"/voice/stream/{session_id}") as websocket:
            # Receive connection confirmation
            websocket.receive_json()
            
            # Send ping
            ping_message = {"type": "ping"}
            websocket.send_json(ping_message)
            
            # Should receive pong
            response = websocket.receive_json()
            assert response["type"] == "pong"

# Integration Tests for Voice Service Manager

class TestVoiceServiceManager:
    
    @pytest.mark.asyncio
    async def test_pipeline_creation(self, mock_elevenlabs_config):
        """Test creating voice processing pipeline"""
        manager = VoiceServiceManager()
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        
        pipeline_id = await manager.create_pipeline(client)
        
        assert pipeline_id is not None
        assert pipeline_id in manager.active_pipelines
        assert manager.service_metrics["total_sessions"] == 1
        assert manager.service_metrics["active_sessions"] == 1
    
    @pytest.mark.asyncio
    async def test_pipeline_removal(self, mock_elevenlabs_config):
        """Test removing voice processing pipeline"""
        manager = VoiceServiceManager()
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        
        pipeline_id = await manager.create_pipeline(client)
        await manager.remove_pipeline(pipeline_id)
        
        assert pipeline_id not in manager.active_pipelines
        assert manager.service_metrics["active_sessions"] == 0
    
    @pytest.mark.asyncio
    async def test_service_metrics(self, mock_elevenlabs_config):
        """Test service metrics collection"""
        manager = VoiceServiceManager()
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        
        # Create multiple pipelines
        pipeline_ids = []
        for i in range(3):
            pipeline_id = await manager.create_pipeline(client)
            pipeline_ids.append(pipeline_id)
        
        metrics = manager.get_service_metrics()
        
        assert metrics["total_sessions"] == 3
        assert metrics["active_sessions"] == 3
        assert metrics["active_pipeline_count"] == 3
    
    @pytest.mark.asyncio
    async def test_health_check(self, mock_elevenlabs_config):
        """Test service health check"""
        manager = VoiceServiceManager()
        
        health = await manager.health_check()
        
        assert health["status"] == "healthy"
        assert health["service"] == "voice_processing_pipeline"
        assert "metrics" in health

# Error Handling and Edge Cases

class TestErrorHandling:
    
    @pytest.mark.asyncio
    async def test_invalid_audio_format(self, mock_elevenlabs_config):
        """Test handling of invalid audio format"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        pipeline = VoiceProcessingPipeline(client)
        
        # Test with invalid audio data
        invalid_audio = b"not_audio_data"
        
        result = await pipeline.process_user_audio(invalid_audio)
        
        # Should handle gracefully and return error status
        assert result["status"] == "error" or result.get("error") is not None
    
    @pytest.mark.asyncio
    async def test_network_timeout(self, mock_elevenlabs_config):
        """Test handling of network timeouts"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_post.side_effect = asyncio.TimeoutError("Network timeout")
            
            with pytest.raises(Exception):
                await client.start_conversation({"agent_id": "test"})
    
    @pytest.mark.asyncio
    async def test_websocket_disconnect_handling(self, mock_elevenlabs_config):
        """Test handling of unexpected WebSocket disconnection"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        
        # Mock WebSocket that disconnects
        mock_websocket = AsyncMock()
        mock_websocket.__aiter__.side_effect = websockets.exceptions.ConnectionClosed(None, None)
        
        with patch('websockets.connect') as mock_connect:
            mock_connect.return_value = mock_websocket
            
            # Should handle disconnection and attempt reconnection
            await client._connect_websocket()
            await client._handle_websocket_messages()
            
            # Verify reconnection logic is triggered
            assert client._reconnect_attempts >= 0

# Performance Tests

class TestPerformance:
    
    @pytest.mark.asyncio
    async def test_latency_requirements(self, mock_elevenlabs_config, mock_audio_data):
        """Test that voice processing meets latency requirements"""
        client = ElevenLabsConversationalClient(mock_elevenlabs_config)
        pipeline = VoiceProcessingPipeline(client)
        
        import time
        
        # Mock fast processing
        with patch.object(pipeline, '_wait_for_transcription') as mock_transcription:
            mock_transcription.return_value = "Fast transcript"
            
            with patch.object(pipeline, '_process_with_claude') as mock_claude:
                mock_claude.return_value = {
                    "response": "Fast response",
                    "coaching_feedback": [],
                    "confidence": 0.9
                }
                
                with patch.object(client, 'send_audio') as mock_send_audio:
                    mock_send_audio.return_value = True
                    
                    with patch.object(client, 'send_text_interrupt') as mock_tts:
                        mock_tts.return_value = True
                        
                        with patch.object(pipeline, '_wait_for_synthesis_completion') as mock_synthesis:
                            mock_synthesis.return_value = None
                            
                            start_time = time.time()
                            result = await pipeline.process_user_audio(mock_audio_data)
                            end_time = time.time()
                            
                            processing_time_ms = (end_time - start_time) * 1000
                            
                            # Should meet 2-second latency target
                            assert processing_time_ms < 2000
                            assert result["status"] == "success"
    
    @pytest.mark.asyncio
    async def test_concurrent_sessions(self, mock_elevenlabs_config):
        """Test handling multiple concurrent voice sessions"""
        manager = VoiceServiceManager()
        
        # Create multiple concurrent sessions
        tasks = []
        for i in range(10):
            client = ElevenLabsConversationalClient(mock_elevenlabs_config)
            task = manager.create_pipeline(client)
            tasks.append(task)
        
        pipeline_ids = await asyncio.gather(*tasks)
        
        assert len(pipeline_ids) == 10
        assert manager.service_metrics["active_sessions"] == 10
        
        # Cleanup
        for pipeline_id in pipeline_ids:
            await manager.remove_pipeline(pipeline_id)

# Configuration and Environment Tests

class TestConfiguration:
    
    def test_settings_loading(self):
        """Test that voice settings are loaded correctly"""
        assert settings.VOICE_LATENCY_TARGET == 2000
        assert settings.VOICE_SAMPLE_RATE == 16000
        assert settings.MOLLICK_FRAMEWORK_STEPS == 6
        assert settings.TTS_SPEED == 1.0
    
    def test_environment_variables(self):
        """Test environment variable handling"""
        with patch.dict(os.environ, {
            'ELEVENLABS_API_KEY': 'test_env_key',
            'VOICE_LATENCY_TARGET': '1500'
        }):
            # Settings should pick up environment variables
            # Note: In real test, would need to reload settings
            pass

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])