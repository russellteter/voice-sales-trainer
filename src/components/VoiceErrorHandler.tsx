'use client';

import { useState } from 'react';

export type VoiceErrorType = 
  | 'microphone_permission'
  | 'microphone_hardware'
  | 'websocket_connection'
  | 'api_configuration'
  | 'elevenlabs_api'
  | 'audio_playback'
  | 'network_timeout'
  | 'browser_compatibility'
  | 'unknown';

export interface VoiceError {
  type: VoiceErrorType;
  message: string;
  technicalDetails?: string;
  code?: string | number;
  timestamp: Date;
  canRetry: boolean;
  actionRequired?: 'user_action' | 'admin_action' | 'wait';
}

interface VoiceErrorHandlerProps {
  error: VoiceError;
  onRetry?: () => void;
  onDismiss?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

export default function VoiceErrorHandler({
  error,
  onRetry,
  onDismiss,
  onContactSupport,
  className = ''
}: VoiceErrorHandlerProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };

  const getErrorConfig = () => {
    switch (error.type) {
      case 'microphone_permission':
        return {
          icon: '🎤',
          title: 'Microphone Access Needed',
          severity: 'warning' as const,
          userMessage: 'Please allow microphone access to start voice training.',
          instructions: [
            'Click the microphone icon in your browser\'s address bar',
            'Select "Allow" for microphone permissions',
            'If you don\'t see the option, try refreshing the page'
          ],
          browserSpecific: {
            chrome: 'Look for the microphone icon in the address bar',
            firefox: 'Check the shield icon for blocked permissions',
            safari: 'Go to Safari > Preferences > Websites > Microphone'
          }
        };

      case 'microphone_hardware':
        return {
          icon: '🔧',
          title: 'Microphone Not Available',
          severity: 'error' as const,
          userMessage: 'Your microphone could not be accessed.',
          instructions: [
            'Check that your microphone is properly connected',
            'Make sure no other applications are using the microphone',
            'Try using headphones with a built-in microphone',
            'Restart your browser and try again'
          ]
        };

      case 'websocket_connection':
        return {
          icon: '🔌',
          title: 'Connection Issue',
          severity: 'error' as const,
          userMessage: 'Unable to connect to the voice service.',
          instructions: [
            'Check your internet connection',
            'Disable any VPN or proxy services temporarily',
            'Try refreshing the page',
            'Contact support if the issue persists'
          ]
        };

      case 'api_configuration':
        return {
          icon: '⚙️',
          title: 'Service Configuration Error',
          severity: 'error' as const,
          userMessage: 'The voice service is not properly configured.',
          instructions: [
            'This appears to be a configuration issue',
            'Please contact your administrator',
            'Reference the error code below when reporting'
          ],
          requiresAdmin: true
        };

      case 'elevenlabs_api':
        return {
          icon: '🤖',
          title: 'AI Voice Service Error',
          severity: 'error' as const,
          userMessage: 'The AI voice service encountered an error.',
          instructions: [
            'This is usually a temporary service issue',
            'Try again in a few moments',
            'If the problem continues, contact support'
          ]
        };

      case 'audio_playback':
        return {
          icon: '🔊',
          title: 'Audio Playback Issue',
          severity: 'warning' as const,
          userMessage: 'Unable to play audio responses.',
          instructions: [
            'Check your speaker or headphone volume',
            'Make sure audio isn\'t muted in your browser',
            'Try using different audio output device',
            'Refresh the page to reset audio settings'
          ]
        };

      case 'network_timeout':
        return {
          icon: '⏱️',
          title: 'Connection Timeout',
          severity: 'warning' as const,
          userMessage: 'The connection timed out.',
          instructions: [
            'Your internet connection may be slow',
            'Try moving closer to your WiFi router',
            'Close other bandwidth-intensive applications',
            'Retry the connection'
          ]
        };

      case 'browser_compatibility':
        return {
          icon: '🌐',
          title: 'Browser Compatibility Issue',
          severity: 'error' as const,
          userMessage: 'Your browser may not support voice features.',
          instructions: [
            'Try using Chrome, Firefox, or Edge browsers',
            'Make sure your browser is up to date',
            'Enable JavaScript if it\'s disabled',
            'Clear browser cache and cookies'
          ],
          recommendedBrowsers: ['Chrome 90+', 'Firefox 85+', 'Safari 14+', 'Edge 90+']
        };

      default:
        return {
          icon: '❌',
          title: 'Unexpected Error',
          severity: 'error' as const,
          userMessage: 'An unexpected error occurred.',
          instructions: [
            'Try refreshing the page',
            'Check your internet connection',
            'Contact support if the issue persists'
          ]
        };
    }
  };

  const config = getErrorConfig();

  const getSeverityStyles = () => {
    switch (config.severity) {
      case 'warning':
        return {
          border: 'border-yellow-300',
          background: 'bg-yellow-50',
          header: 'bg-yellow-100',
          text: 'text-yellow-900',
          icon: 'text-yellow-600'
        };
      case 'error':
      default:
        return {
          border: 'border-red-300',
          background: 'bg-red-50',
          header: 'bg-red-100',
          text: 'text-red-900',
          icon: 'text-red-600'
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <div className={`${styles.background} ${styles.border} border-2 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className={`${styles.header} px-6 py-4 rounded-t-lg`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <span className={`text-2xl ${styles.icon}`}>{config.icon}</span>
            <div>
              <h3 className={`text-lg font-bold ${styles.text}`}>{config.title}</h3>
              <p className={`text-sm ${styles.text} opacity-90 mt-1`}>{config.userMessage}</p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`${styles.text} hover:opacity-75 text-xl font-bold leading-none`}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-4">
        
        {/* Instructions */}
        <div>
          <h4 className={`font-semibold ${styles.text} mb-3`}>How to fix this:</h4>
          <ol className={`list-decimal list-inside space-y-2 ${styles.text} text-sm`}>
            {config.instructions.map((instruction, index) => (
              <li key={index} className="leading-relaxed">{instruction}</li>
            ))}
          </ol>
        </div>

        {/* Browser-specific instructions */}
        {config.browserSpecific && (
          <div className={`p-3 bg-white rounded border ${styles.border}`}>
            <h4 className={`font-semibold ${styles.text} mb-2 text-sm`}>Browser-specific help:</h4>
            <div className="space-y-1">
              {Object.entries(config.browserSpecific).map(([browser, instruction]) => (
                <div key={browser} className={`text-xs ${styles.text}`}>
                  <strong className="capitalize">{browser}:</strong> {instruction}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended browsers */}
        {config.recommendedBrowsers && (
          <div className={`p-3 bg-white rounded border ${styles.border}`}>
            <h4 className={`font-semibold ${styles.text} mb-2 text-sm`}>Recommended browsers:</h4>
            <div className="flex flex-wrap gap-2">
              {config.recommendedBrowsers.map((browser) => (
                <span key={browser} className={`px-2 py-1 bg-lightest-gray text-xs rounded font-medium ${styles.text}`}>
                  {browser}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Technical Details Toggle */}
        {error.technicalDetails && (
          <div>
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className={`text-sm ${styles.text} underline hover:no-underline`}
            >
              {showTechnicalDetails ? 'Hide' : 'Show'} technical details
            </button>
            
            {showTechnicalDetails && (
              <div className={`mt-3 p-3 bg-white rounded border ${styles.border} font-mono text-xs`}>
                <div className="space-y-1">
                  <div><strong>Error:</strong> {error.message}</div>
                  {error.code && <div><strong>Code:</strong> {error.code}</div>}
                  <div><strong>Time:</strong> {error.timestamp.toLocaleString()}</div>
                  {error.technicalDetails && (
                    <div className="mt-2">
                      <strong>Details:</strong>
                      <pre className="mt-1 text-xs text-dark-gray whitespace-pre-wrap">{error.technicalDetails}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          {error.canRetry && onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className={`btn-secondary flex items-center space-x-2 ${isRetrying ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isRetrying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Retrying...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Try Again</span>
                </>
              )}
            </button>
          )}
          
          {config.requiresAdmin && onContactSupport && (
            <button
              onClick={onContactSupport}
              className="bg-middle-gray hover:bg-dark-gray text-white px-4 py-2 rounded font-bold transition-colors"
            >
              💬 Contact Support
            </button>
          )}
          
          {error.actionRequired === 'wait' && (
            <div className={`flex items-center space-x-2 px-4 py-2 rounded ${styles.header} ${styles.text}`}>
              <span>⏳</span>
              <span className="text-sm font-medium">Please wait and try again</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Utility function to create error objects
export function createVoiceError(
  type: VoiceErrorType,
  message: string,
  options: {
    technicalDetails?: string;
    code?: string | number;
    canRetry?: boolean;
    actionRequired?: 'user_action' | 'admin_action' | 'wait';
  } = {}
): VoiceError {
  return {
    type,
    message,
    technicalDetails: options.technicalDetails,
    code: options.code,
    timestamp: new Date(),
    canRetry: options.canRetry ?? true,
    actionRequired: options.actionRequired
  };
}

// Common error factory functions
export const VoiceErrors = {
  microphonePermission: (details?: string) => 
    createVoiceError('microphone_permission', 'Microphone permission denied', {
      technicalDetails: details,
      canRetry: true,
      actionRequired: 'user_action'
    }),

  microphoneHardware: (details?: string) =>
    createVoiceError('microphone_hardware', 'Microphone not available', {
      technicalDetails: details,
      canRetry: true,
      actionRequired: 'user_action'
    }),

  websocketConnection: (details?: string, code?: string | number) =>
    createVoiceError('websocket_connection', 'WebSocket connection failed', {
      technicalDetails: details,
      code,
      canRetry: true
    }),

  apiConfiguration: (details?: string, code?: string | number) =>
    createVoiceError('api_configuration', 'API configuration error', {
      technicalDetails: details,
      code,
      canRetry: false,
      actionRequired: 'admin_action'
    }),

  elevenLabsAPI: (message: string, details?: string, code?: string | number) =>
    createVoiceError('elevenlabs_api', `ElevenLabs API Error: ${message}`, {
      technicalDetails: details,
      code,
      canRetry: true,
      actionRequired: 'wait'
    }),

  networkTimeout: (details?: string) =>
    createVoiceError('network_timeout', 'Connection timed out', {
      technicalDetails: details,
      canRetry: true
    }),

  browserCompatibility: (details?: string) =>
    createVoiceError('browser_compatibility', 'Browser not compatible', {
      technicalDetails: details,
      canRetry: false,
      actionRequired: 'user_action'
    })
};