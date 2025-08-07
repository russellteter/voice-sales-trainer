'use client';

import { useState, useEffect } from 'react';

// Voice Status Types
export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';
export type MicrophoneStatus = 'inactive' | 'requesting' | 'active' | 'muted' | 'denied' | 'error';
export type AIStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export interface VoiceStatusData {
  websocket: WebSocketStatus;
  microphone: MicrophoneStatus;
  ai: AIStatus;
  audioQuality: ConnectionQuality;
  latency?: number;
  voiceLevel?: number;
  conversationId?: string;
}

interface VoiceStatusIndicatorProps {
  status: VoiceStatusData;
  isCompact?: boolean;
  showLabels?: boolean;
  className?: string;
}

export default function VoiceStatusIndicator({ 
  status, 
  isCompact = false, 
  showLabels = true, 
  className = '' 
}: VoiceStatusIndicatorProps) {
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Trigger pulse animation for status changes
  useEffect(() => {
    setPulseAnimation(true);
    const timer = setTimeout(() => setPulseAnimation(false), 600);
    return () => clearTimeout(timer);
  }, [status.websocket, status.microphone, status.ai]);

  // Status indicator configurations
  const getWebSocketConfig = () => {
    switch (status.websocket) {
      case 'connected':
        return { color: 'bg-green-500', icon: '🟢', label: 'Connected', description: 'Secure connection established' };
      case 'connecting':
        return { color: 'bg-yellow-500 animate-pulse', icon: '🟡', label: 'Connecting', description: 'Establishing connection...' };
      case 'reconnecting':
        return { color: 'bg-orange-500 animate-pulse', icon: '🟠', label: 'Reconnecting', description: 'Attempting to reconnect...' };
      case 'error':
        return { color: 'bg-red-500', icon: '🔴', label: 'Error', description: 'Connection failed' };
      default:
        return { color: 'bg-middle-gray', icon: '⚪', label: 'Disconnected', description: 'Not connected' };
    }
  };

  const getMicrophoneConfig = () => {
    switch (status.microphone) {
      case 'active':
        return { color: 'bg-green-500', icon: '🎤', label: 'Active', description: 'Microphone is listening' };
      case 'requesting':
        return { color: 'bg-yellow-500 animate-pulse', icon: '🎤', label: 'Requesting', description: 'Requesting permission...' };
      case 'muted':
        return { color: 'bg-orange-500', icon: '🔇', label: 'Muted', description: 'Microphone is muted' };
      case 'denied':
        return { color: 'bg-red-500', icon: '❌', label: 'Access Denied', description: 'Microphone permission denied' };
      case 'error':
        return { color: 'bg-red-500', icon: '⚠️', label: 'Error', description: 'Microphone error' };
      default:
        return { color: 'bg-middle-gray', icon: '🎤', label: 'Inactive', description: 'Microphone not active' };
    }
  };

  const getAIConfig = () => {
    switch (status.ai) {
      case 'listening':
        return { color: 'bg-blue-500 animate-pulse', icon: '👂', label: 'Listening', description: 'AI is listening' };
      case 'thinking':
        return { color: 'bg-purple-500 animate-pulse', icon: '🤔', label: 'Thinking', description: 'AI is processing' };
      case 'speaking':
        return { color: 'bg-green-500', icon: '🗣️', label: 'Speaking', description: 'AI is responding' };
      case 'error':
        return { color: 'bg-red-500', icon: '⚠️', label: 'AI Error', description: 'AI processing error' };
      default:
        return { color: 'bg-middle-gray', icon: '🤖', label: 'Idle', description: 'AI is ready' };
    }
  };

  const getQualityConfig = () => {
    switch (status.audioQuality) {
      case 'excellent':
        return { color: 'text-green-600', bars: 4, label: 'Excellent' };
      case 'good':
        return { color: 'text-green-500', bars: 3, label: 'Good' };
      case 'fair':
        return { color: 'text-yellow-500', bars: 2, label: 'Fair' };
      case 'poor':
        return { color: 'text-red-500', bars: 1, label: 'Poor' };
      default:
        return { color: 'text-middle-gray', bars: 0, label: 'Unknown' };
    }
  };

  const wsConfig = getWebSocketConfig();
  const micConfig = getMicrophoneConfig();
  const aiConfig = getAIConfig();
  const qualityConfig = getQualityConfig();

  // Voice level visualization
  const VoiceLevelIndicator = () => (
    <div className="flex items-center space-x-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-1 transition-all duration-150 ${
            status.voiceLevel && status.voiceLevel * 5 > i
              ? 'bg-green-500 h-4'
              : 'bg-light-gray h-2'
          }`}
        />
      ))}
    </div>
  );

  // Connection quality bars
  const QualityBars = () => (
    <div className="flex items-end space-x-1">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={`w-1 transition-all duration-300 ${
            qualityConfig.bars > i ? qualityConfig.color.replace('text-', 'bg-') : 'bg-light-gray'
          } ${i === 0 ? 'h-2' : i === 1 ? 'h-3' : i === 2 ? 'h-4' : 'h-5'}`}
        />
      ))}
    </div>
  );

  if (isCompact) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <div className={`flex items-center space-x-1 ${pulseAnimation ? 'animate-pulse' : ''}`}>
          <div className={`w-2 h-2 rounded-full ${wsConfig.color}`} />
          <div className={`w-2 h-2 rounded-full ${micConfig.color}`} />
          <div className={`w-2 h-2 rounded-full ${aiConfig.color}`} />
        </div>
        <QualityBars />
        {status.latency && (
          <span className="text-xs text-middle-gray font-mono">
            {status.latency}ms
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border-2 border-class-light-purple p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-class-purple">Voice Status</h3>
        {status.conversationId && (
          <span className="text-xs font-mono text-middle-gray bg-lightest-gray px-2 py-1 rounded">
            ID: {status.conversationId.slice(-8)}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* WebSocket Connection */}
        <div className={`flex items-center space-x-3 ${pulseAnimation ? 'animate-pulse' : ''}`}>
          <div className={`w-4 h-4 rounded-full ${wsConfig.color} shadow-lg`} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-midnight-blue">{wsConfig.icon} Connection</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                status.websocket === 'connected' ? 'bg-green-100 text-green-800' :
                status.websocket === 'error' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {wsConfig.label}
              </span>
            </div>
            {showLabels && (
              <p className="text-xs text-dark-gray mt-1">{wsConfig.description}</p>
            )}
          </div>
        </div>

        {/* Microphone Status */}
        <div className="flex items-center space-x-3">
          <div className={`w-4 h-4 rounded-full ${micConfig.color} shadow-lg`} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-midnight-blue">{micConfig.icon} Microphone</span>
              <div className="flex items-center space-x-2">
                {status.microphone === 'active' && status.voiceLevel !== undefined && (
                  <VoiceLevelIndicator />
                )}
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  status.microphone === 'active' ? 'bg-green-100 text-green-800' :
                  status.microphone === 'denied' || status.microphone === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {micConfig.label}
                </span>
              </div>
            </div>
            {showLabels && (
              <p className="text-xs text-dark-gray mt-1">{micConfig.description}</p>
            )}
          </div>
        </div>

        {/* AI Status */}
        <div className="flex items-center space-x-3">
          <div className={`w-4 h-4 rounded-full ${aiConfig.color} shadow-lg`} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-midnight-blue">{aiConfig.icon} AI Assistant</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                status.ai === 'speaking' || status.ai === 'listening' ? 'bg-blue-100 text-blue-800' :
                status.ai === 'thinking' ? 'bg-purple-100 text-purple-800' :
                status.ai === 'error' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {aiConfig.label}
              </span>
            </div>
            {showLabels && (
              <p className="text-xs text-dark-gray mt-1">{aiConfig.description}</p>
            )}
          </div>
        </div>

        {/* Audio Quality & Latency */}
        <div className="flex items-center justify-between pt-2 border-t border-light-gray">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-midnight-blue">Quality:</span>
            <QualityBars />
            <span className={`text-xs font-bold ${qualityConfig.color}`}>
              {qualityConfig.label}
            </span>
          </div>
          {status.latency && (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-middle-gray">Latency:</span>
              <span className={`text-xs font-mono font-bold ${
                status.latency < 100 ? 'text-green-600' :
                status.latency < 300 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {status.latency}ms
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Utility hook for managing voice status
export function useVoiceStatus() {
  const [status, setStatus] = useState<VoiceStatusData>({
    websocket: 'disconnected',
    microphone: 'inactive',
    ai: 'idle',
    audioQuality: 'unknown',
    latency: undefined,
    voiceLevel: 0,
    conversationId: undefined
  });

  const updateWebSocketStatus = (newStatus: WebSocketStatus, conversationId?: string) => {
    setStatus(prev => ({ ...prev, websocket: newStatus, conversationId }));
  };

  const updateMicrophoneStatus = (newStatus: MicrophoneStatus, voiceLevel?: number) => {
    setStatus(prev => ({ ...prev, microphone: newStatus, voiceLevel }));
  };

  const updateAIStatus = (newStatus: AIStatus) => {
    setStatus(prev => ({ ...prev, ai: newStatus }));
  };

  const updateAudioQuality = (quality: ConnectionQuality, latency?: number) => {
    setStatus(prev => ({ ...prev, audioQuality: quality, latency }));
  };

  const resetStatus = () => {
    setStatus({
      websocket: 'disconnected',
      microphone: 'inactive',
      ai: 'idle',
      audioQuality: 'unknown',
      latency: undefined,
      voiceLevel: 0,
      conversationId: undefined
    });
  };

  return {
    status,
    updateWebSocketStatus,
    updateMicrophoneStatus,
    updateAIStatus,
    updateAudioQuality,
    resetStatus
  };
}