/**
 * Voice Client - Frontend ElevenLabs Integration
 * Handles WebSocket connections, audio streaming, and voice session management
 */

export interface VoiceMessage {
  type: 'audio' | 'text' | 'transcript' | 'state_change' | 'error' | 'connected' | 'pong' | 'status';
  data?: any;
  timestamp?: string;
  session_id?: string;
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  chunk_id: string;
  is_final?: boolean;
}

export interface VoiceSessionConfig {
  scenario_type: 'coach' | 'prospect';
  scenario_config: {
    prospect_type?: 'enterprise' | 'smb' | 'startup';
    difficulty_level?: number;
    training_objectives?: string[];
  };
  voice_id?: string;
  max_duration?: number;
}

export interface VoiceSessionStatus {
  session_id: string;
  state: 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';
  connected_at?: string;
  message_count: number;
  performance_metrics: {
    total_latency_ms: number;
    average_latency_ms: number;
    success_rate: number;
  };
}

export interface ConversationMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  confidence?: number;
}

export class VoiceClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private apiBaseUrl: string;
  private messageCallbacks: Map<string, (message: VoiceMessage) => void> = new Map();
  private stateCallbacks: Map<string, (state: string) => void> = new Map();
  private errorCallbacks: Map<string, (error: string) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private isRecording = false;

  constructor(apiBaseUrl: string = 'http://localhost:8000') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Create a new voice conversation session
   */
  async createSession(config: VoiceSessionConfig): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/voice/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create session: ${errorData.detail}`);
      }

      const data = await response.json();
      this.sessionId = data.session_id;
      
      console.log('Created voice session:', this.sessionId);
      return this.sessionId!; // We know it's not null here
    } catch (error) {
      console.error('Error creating voice session:', error);
      throw error;
    }
  }

  /**
   * Connect to the voice session WebSocket
   */
  async connect(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No session ID available. Create a session first.');
    }

    const wsUrl = `${this.apiBaseUrl.replace('http', 'ws')}/voice/stream/${this.sessionId}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = (event) => {
        console.log('WebSocket connected:', event);
        this.reconnectAttempts = 0;
        this.startPingInterval();
        this.notifyStateChange('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message: VoiceMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event);
        this.stopPingInterval();
        this.notifyStateChange('disconnected');
        
        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the voice session
   */
  async disconnect(): Promise<void> {
    this.stopPingInterval();
    this.clearReconnectTimer();
    
    if (this.mediaRecorder && this.isRecording) {
      await this.stopRecording();
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.notifyStateChange('disconnected');
  }

  /**
   * Start recording audio from the user's microphone
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      });

      // Create audio context for processing
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(stream);
      
      // Set up MediaRecorder for capturing audio
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000,
      });

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          await this.processAudioChunk(event.data);
        }
      };

      this.mediaRecorder.start(250); // Collect data every 250ms for real-time processing
      this.isRecording = true;
      this.notifyStateChange('speaking');
      
      console.log('Started recording audio');
    } catch (error) {
      console.error('Error starting recording:', error);
      this.notifyError('Failed to start audio recording');
      throw error;
    }
  }

  /**
   * Stop recording audio
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording || !this.mediaRecorder) {
      return;
    }

    this.mediaRecorder.stop();
    this.mediaRecorder = null;
    this.isRecording = false;
    this.notifyStateChange('listening');
    
    console.log('Stopped recording audio');
  }

  /**
   * Process audio chunk and send to backend
   */
  private async processAudioChunk(audioBlob: Blob): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, skipping audio chunk');
      return;
    }

    try {
      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Convert to base64 for transmission
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

      const message: VoiceMessage = {
        type: 'audio',
        data: {
          audio_base64: base64Audio,
          timestamp: Date.now(),
          chunk_id: this.generateChunkId(),
        },
      };

      this.sendMessage(message);
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  }

  /**
   * Send text message for processing
   */
  async sendText(text: string): Promise<void> {
    if (!text.trim()) {
      return;
    }

    const message: VoiceMessage = {
      type: 'text',
      data: {
        text: text.trim(),
        timestamp: Date.now(),
      },
    };

    this.sendMessage(message);
  }

  /**
   * Send message via WebSocket
   */
  private sendMessage(message: VoiceMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
      this.notifyError('Failed to send message');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: VoiceMessage): void {
    console.log('Received message:', message.type, message.data);

    switch (message.type) {
      case 'connected':
        this.notifyStateChange('connected');
        break;
        
      case 'audio':
        this.handleAudioMessage(message);
        break;
        
      case 'transcript':
        this.handleTranscriptMessage(message);
        break;
        
      case 'state_change':
        if (message.data?.state) {
          this.notifyStateChange(message.data.state);
        }
        break;
        
      case 'error':
        this.notifyError(message.data?.error || 'Unknown error');
        break;
        
      case 'pong':
        // Handle pong response for connection health
        break;
        
      case 'status':
        this.handleStatusMessage(message);
        break;
        
      default:
        console.warn('Unknown message type:', message.type);
    }

    // Notify all message callbacks
    this.messageCallbacks.forEach((callback) => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    });
  }

  /**
   * Handle incoming audio messages (AI responses)
   */
  private handleAudioMessage(message: VoiceMessage): void {
    if (message.data?.audio_base64) {
      // Convert base64 back to audio and play
      this.playAudioFromBase64(message.data.audio_base64);
    }
  }

  /**
   * Handle transcript messages (speech-to-text results)
   */
  private handleTranscriptMessage(message: VoiceMessage): void {
    const transcript = message.data?.transcript;
    const confidence = message.data?.confidence;
    
    if (transcript) {
      console.log('Received transcript:', transcript, 'confidence:', confidence);
    }
  }

  /**
   * Handle status messages
   */
  private handleStatusMessage(message: VoiceMessage): void {
    console.log('Session status:', message.data);
  }

  /**
   * Play audio from base64 encoded data
   */
  private async playAudioFromBase64(base64Audio: string): Promise<void> {
    try {
      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create audio context if not exists
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
      
      // Create audio source and play
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();

    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(): Promise<VoiceSessionStatus | null> {
    if (!this.sessionId) {
      return null;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/voice/conversations/${this.sessionId}/status`);
      
      if (!response.ok) {
        throw new Error(`Failed to get session status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting session status:', error);
      return null;
    }
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    try {
      await this.disconnect();
      
      const response = await fetch(`${this.apiBaseUrl}/voice/conversations/${this.sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.warn('Failed to end session on server:', response.statusText);
      }
      
      this.sessionId = null;
      console.log('Session ended');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s

    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
      }
    }, delay);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Start ping interval for connection health
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.sendMessage({ type: 'text', data: { type: 'ping' } });
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Generate unique chunk ID
   */
  private generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add message callback
   */
  addMessageCallback(id: string, callback: (message: VoiceMessage) => void): void {
    this.messageCallbacks.set(id, callback);
  }

  /**
   * Remove message callback
   */
  removeMessageCallback(id: string): void {
    this.messageCallbacks.delete(id);
  }

  /**
   * Add state change callback
   */
  addStateCallback(id: string, callback: (state: string) => void): void {
    this.stateCallbacks.set(id, callback);
  }

  /**
   * Remove state change callback
   */
  removeStateCallback(id: string): void {
    this.stateCallbacks.delete(id);
  }

  /**
   * Add error callback
   */
  addErrorCallback(id: string, callback: (error: string) => void): void {
    this.errorCallbacks.set(id, callback);
  }

  /**
   * Remove error callback
   */
  removeErrorCallback(id: string): void {
    this.errorCallbacks.delete(id);
  }

  /**
   * Notify state change callbacks
   */
  private notifyStateChange(state: string): void {
    this.stateCallbacks.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in state callback:', error);
      }
    });
  }

  /**
   * Notify error callbacks
   */
  private notifyError(error: string): void {
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error);
      } catch (error) {
        console.error('Error in error callback:', error);
      }
    });
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

// Utility functions for voice processing

/**
 * Convert audio buffer to PCM format
 */
export function convertToPCM(audioBuffer: AudioBuffer): ArrayBuffer {
  const numberOfChannels = 1; // Mono
  const sampleRate = 16000;
  const length = audioBuffer.length;
  const result = new Int16Array(length);

  // Convert float32 samples to int16
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    result[i] = sample * 0x7FFF;
  }

  return result.buffer;
}

/**
 * Calculate audio volume level for visualization
 */
export function calculateVolumeLevel(audioData: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  const rms = Math.sqrt(sum / audioData.length);
  return Math.min(1, rms * 10); // Scale and clamp to [0, 1]
}

/**
 * Create default voice client instance
 */
export function createVoiceClient(apiBaseUrl?: string): VoiceClient {
  return new VoiceClient(apiBaseUrl);
}

export default VoiceClient;