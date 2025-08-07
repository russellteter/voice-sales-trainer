'use client';

import { useState, useEffect, useRef } from 'react';

export type VoiceControlState = 'inactive' | 'listening' | 'speaking' | 'processing' | 'paused' | 'error';

export interface VoiceControlProps {
  state: VoiceControlState;
  isConnected: boolean;
  voiceLevel?: number;
  onStartListening: () => void;
  onStopListening: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceControlPanel({
  state,
  isConnected,
  voiceLevel = 0,
  onStartListening,
  onStopListening,
  onPause,
  onResume,
  onStop,
  disabled = false,
  className = ''
}: VoiceControlProps) {
  const [pressStartTime, setPressStartTime] = useState<number | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Long press detection for mobile
  const handleTouchStart = () => {
    if (disabled || !isConnected) return;
    
    setPressStartTime(Date.now());
    setIsHolding(true);
    setLongPressTriggered(false);
    
    longPressTimer.current = setTimeout(() => {
      setLongPressTriggered(true);
      // Haptic feedback on supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 200); // Short delay for better UX
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    const pressDuration = pressStartTime ? Date.now() - pressStartTime : 0;
    
    if (longPressTriggered || pressDuration > 200) {
      // Long press or hold action
      if (state === 'listening') {
        onStopListening();
      } else if (state === 'inactive') {
        onStartListening();
      }
    } else {
      // Quick tap action
      if (state === 'paused') {
        onResume();
      } else if (state === 'listening') {
        onPause();
      } else if (state === 'inactive') {
        onStartListening();
      }
    }
    
    setIsHolding(false);
    setPressStartTime(null);
    setLongPressTriggered(false);
  };

  // Voice level visualization
  const VoiceLevelVisualizer = () => {
    const bars = 8;
    const activeBars = Math.floor(voiceLevel * bars);
    
    return (
      <div className="flex items-end justify-center space-x-1 h-8">
        {[...Array(bars)].map((_, i) => (
          <div
            key={i}
            className={`w-1 transition-all duration-100 ease-out rounded-full ${
              i < activeBars ? 'bg-green-500' : 'bg-light-gray'
            } ${i < 2 ? 'h-2' : i < 4 ? 'h-3' : i < 6 ? 'h-4' : 'h-5'}`}
            style={{
              animationDelay: `${i * 50}ms`,
              animationDuration: '0.3s'
            }}
          />
        ))}
      </div>
    );
  };

  // Animated ring for voice activity
  const AnimatedRing = ({ size = 'large' }: { size?: 'small' | 'large' }) => {
    const sizeClasses = size === 'large' ? 'w-20 h-20' : 'w-12 h-12';
    const ringClasses = size === 'large' ? 'w-24 h-24' : 'w-16 h-16';
    
    return (
      <div className="relative flex items-center justify-center">
        {(state === 'listening' || state === 'speaking') && (
          <div className={`absolute ${ringClasses} border-4 border-class-purple opacity-30 rounded-full animate-ping`} />
        )}
        <div className={`${sizeClasses} transition-all duration-300`}>
          {/* Main button content goes here */}
        </div>
      </div>
    );
  };

  // Get state-specific styling and content
  const getStateConfig = () => {
    switch (state) {
      case 'listening':
        return {
          buttonClass: 'bg-red-500 hover:bg-red-600 shadow-lg scale-110',
          icon: '🎤',
          label: 'Listening',
          description: 'Tap to pause, hold to stop',
          showPulse: true,
          showVoiceLevel: true
        };
      case 'speaking':
        return {
          buttonClass: 'bg-blue-500 hover:bg-blue-600 shadow-lg',
          icon: '🗣️',
          label: 'AI Speaking',
          description: 'Please wait...',
          showPulse: true,
          showVoiceLevel: false
        };
      case 'processing':
        return {
          buttonClass: 'bg-purple-500 shadow-lg animate-pulse',
          icon: '🤔',
          label: 'Processing',
          description: 'AI is thinking...',
          showPulse: false,
          showVoiceLevel: false
        };
      case 'paused':
        return {
          buttonClass: 'bg-yellow-500 hover:bg-yellow-600 shadow-lg',
          icon: '⏸️',
          label: 'Paused',
          description: 'Tap to resume',
          showPulse: false,
          showVoiceLevel: false
        };
      case 'error':
        return {
          buttonClass: 'bg-red-500 shadow-lg',
          icon: '❌',
          label: 'Error',
          description: 'Check connection',
          showPulse: false,
          showVoiceLevel: false
        };
      default:
        return {
          buttonClass: 'bg-class-purple hover:bg-dark-purple shadow-lg hover:shadow-xl',
          icon: '🎤',
          label: 'Start Speaking',
          description: 'Tap to start, hold to talk',
          showPulse: false,
          showVoiceLevel: false
        };
    }
  };

  const config = getStateConfig();

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      
      {/* Connection Status */}
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-xs text-middle-gray font-medium">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Main Voice Control Button */}
      <div className="relative">
        <AnimatedRing size="large" />
        <button
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={() => {
            if (isHolding) handleTouchEnd();
          }}
          disabled={disabled || (!isConnected && state !== 'error')}
          className={`
            relative w-20 h-20 rounded-full text-white font-bold text-2xl
            transition-all duration-200 ease-out transform
            ${config.buttonClass}
            ${isHolding ? 'scale-95' : 'scale-100'}
            ${disabled || (!isConnected && state !== 'error') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            focus:outline-none focus:ring-4 focus:ring-class-light-purple
            active:scale-95
          `}
          aria-label={config.label}
        >
          <span className="relative z-10">{config.icon}</span>
          
          {/* Ripple effect on touch */}
          {isHolding && (
            <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping" />
          )}
        </button>
        
        {/* Hold indicator */}
        {isHolding && !longPressTriggered && (
          <div className="absolute inset-0 border-4 border-white border-opacity-50 rounded-full animate-pulse" />
        )}
      </div>

      {/* Voice Level Indicator */}
      {config.showVoiceLevel && state === 'listening' && (
        <div className="w-full max-w-xs">
          <VoiceLevelVisualizer />
        </div>
      )}

      {/* State Label and Description */}
      <div className="text-center space-y-1">
        <div className={`text-lg font-bold ${
          state === 'error' ? 'text-red-600' :
          state === 'listening' ? 'text-red-600' :
          state === 'speaking' ? 'text-blue-600' :
          state === 'paused' ? 'text-yellow-600' :
          'text-class-purple'
        }`}>
          {config.label}
        </div>
        <div className="text-sm text-middle-gray">
          {config.description}
        </div>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center space-x-3">
        {state !== 'inactive' && state !== 'error' && (
          <button
            onClick={onStop}
            disabled={disabled}
            className="bg-middle-gray hover:bg-dark-gray text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
          >
            🛑 Stop Session
          </button>
        )}
        
        {/* Push-to-talk mode toggle could go here */}
      </div>

      {/* Mobile-specific instructions */}
      <div className="text-xs text-dark-gray text-center max-w-xs lg:hidden">
        <p className="mb-1">📱 <strong>Mobile controls:</strong></p>
        <p>• Tap: Quick actions</p>
        <p>• Hold: Start/stop listening</p>
        <p>• Long press for haptic feedback</p>
      </div>
    </div>
  );
}

// Specialized mobile voice button component
export function MobileVoiceButton({
  state,
  onTouchStart,
  onTouchEnd,
  disabled = false,
  size = 'large'
}: {
  state: VoiceControlState;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}) {
  const [isPressed, setIsPressed] = useState(false);

  const sizeClasses = {
    small: 'w-12 h-12 text-lg',
    medium: 'w-16 h-16 text-xl', 
    large: 'w-20 h-20 text-2xl'
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsPressed(true);
    onTouchStart();
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsPressed(false);
    onTouchEnd();
  };

  return (
    <button
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => {
        if (isPressed) {
          setIsPressed(false);
          onTouchEnd();
        }
      }}
      disabled={disabled}
      className={`
        ${sizeClasses[size]} rounded-full font-bold text-white
        transition-all duration-150 transform select-none
        ${state === 'listening' ? 'bg-red-500 shadow-lg animate-pulse' : 'bg-class-purple hover:bg-dark-purple'}
        ${isPressed ? 'scale-95' : 'scale-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-90'}
        focus:outline-none focus:ring-4 focus:ring-class-light-purple
      `}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation' // Prevents zoom on double-tap
      }}
    >
      {state === 'listening' ? '🔴' : '🎤'}
    </button>
  );
}

// Push-to-talk component for desktop
export function PushToTalkButton({
  onStart,
  onEnd,
  disabled = false,
  keyboardShortcut = 'Space'
}: {
  onStart: () => void;
  onEnd: () => void;
  disabled?: boolean;
  keyboardShortcut?: string;
}) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.code === keyboardShortcut && !e.repeat) {
        e.preventDefault();
        setIsActive(true);
        onStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.code === keyboardShortcut) {
        e.preventDefault();
        setIsActive(false);
        onEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [disabled, keyboardShortcut, onStart, onEnd]);

  return (
    <div className="flex items-center space-x-3 p-4 bg-light-gray rounded-lg">
      <div className={`w-4 h-4 rounded-full transition-colors ${
        isActive ? 'bg-red-500 animate-pulse' : 'bg-middle-gray'
      }`} />
      <div className="flex-1">
        <div className="text-sm font-semibold text-midnight-blue">
          Push to Talk {isActive && '(Active)'}
        </div>
        <div className="text-xs text-middle-gray">
          Hold <kbd className="px-2 py-1 bg-white rounded border text-xs">{keyboardShortcut}</kbd> to speak
        </div>
      </div>
    </div>
  );
}