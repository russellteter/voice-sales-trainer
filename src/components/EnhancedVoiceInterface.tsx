'use client';

import { useState, useEffect } from 'react';
import VoiceStatusIndicator, { useVoiceStatus } from './VoiceStatusIndicator';
import VoiceErrorHandler, { VoiceErrors, type VoiceError } from './VoiceErrorHandler';
import RealTimeFeedbackPanel, { useFeedbackManager, FeedbackGenerators } from './RealTimeFeedbackPanel';
import VoiceControlPanel, { MobileVoiceButton, type VoiceControlState } from './VoiceControlPanel';
import { useElevenLabsVoice } from './ElevenLabsVoiceInterface';

interface EnhancedVoiceInterfaceProps {
  apiKey: string;
  voiceId: string;
  className?: string;
}

/**
 * Enhanced Voice Interface Component
 * 
 * This component demonstrates the integration of all new voice UI components:
 * - Comprehensive status indicators
 * - User-friendly error handling
 * - Real-time feedback with micro-animations
 * - Mobile-responsive voice controls
 * - Accessible design patterns
 */
export default function EnhancedVoiceInterface({
  apiKey,
  voiceId,
  className = ''
}: EnhancedVoiceInterfaceProps) {
  const [currentError, setCurrentError] = useState<VoiceError | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  // Enhanced status management
  const voiceStatus = useVoiceStatus();
  const feedbackManager = useFeedbackManager();
  
  // ElevenLabs integration
  const elevenLabsVoice = useElevenLabsVoice(apiKey, voiceId);
  
  // Voice control state mapping
  const getVoiceControlState = (): VoiceControlState => {
    if (currentError) return 'error';
    if (!elevenLabsVoice.isActive) return 'inactive';
    if (elevenLabsVoice.transcript && !elevenLabsVoice.audioResponses.length) return 'listening';
    if (elevenLabsVoice.audioResponses.length > 0) return 'speaking';
    return 'inactive';
  };

  // Handle voice session lifecycle
  const handleStartSession = async () => {
    try {
      setCurrentError(null);
      voiceStatus.updateWebSocketStatus('connecting');
      voiceStatus.updateMicrophoneStatus('requesting');
      
      elevenLabsVoice.startSession();
      setIsSessionActive(true);
      
      // Simulate successful connection
      setTimeout(() => {
        voiceStatus.updateWebSocketStatus('connected', `session-${Date.now()}`);
        voiceStatus.updateMicrophoneStatus('active');
        voiceStatus.updateAIStatus('idle');
        voiceStatus.updateAudioQuality('excellent', 65);
        
        feedbackManager.addFeedback('coaching', 'technique', 'Session started! Speak clearly and at a natural pace.', {
          priority: 3,
          suggestion: 'Take your time and remember to breathe naturally'
        });
      }, 1500);
      
    } catch (error) {
      const voiceError = error instanceof DOMException && error.name === 'NotAllowedError' 
        ? VoiceErrors.microphonePermission(error.message)
        : VoiceErrors.microphoneHardware(error.message);
      setCurrentError(voiceError);
      voiceStatus.updateMicrophoneStatus('denied');
    }
  };

  const handleStopSession = () => {
    elevenLabsVoice.stopSession();
    setIsSessionActive(false);
    voiceStatus.resetStatus();
    feedbackManager.clearFeedback();
  };

  const handleStartListening = () => {
    voiceStatus.updateAIStatus('listening');
    feedbackManager.addFeedback('positive', 'technique', 'Great! I\'m listening. Speak confidently.', {
      priority: 3
    });
  };

  const handleStopListening = () => {
    voiceStatus.updateAIStatus('thinking');
    
    // Simulate processing and feedback
    setTimeout(() => {
      voiceStatus.updateAIStatus('speaking');
      
      // Generate contextual feedback
      const feedbackOptions = [
        FeedbackGenerators.positiveResponse('Good question technique'),
        FeedbackGenerators.improveQuestioning('Try asking more about their pain points'),
        FeedbackGenerators.objectionHandling('Nice way to address their concern')
      ];
      
      const randomFeedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
      feedbackManager.addFeedback(
        randomFeedback.type,
        randomFeedback.category,
        randomFeedback.message,
        randomFeedback.options
      );
      
      setTimeout(() => {
        voiceStatus.updateAIStatus('idle');
      }, 3000);
    }, 2000);
  };

  // Handle errors from ElevenLabs integration
  useEffect(() => {
    if (elevenLabsVoice.error) {
      const voiceError = VoiceErrors.elevenLabsAPI(elevenLabsVoice.error);
      setCurrentError(voiceError);
      voiceStatus.updateWebSocketStatus('error');
    }
  }, [elevenLabsVoice.error, voiceStatus]);

  // Error handling functions
  const handleRetryConnection = () => {
    setCurrentError(null);
    handleStartSession();
  };

  const handleDismissError = () => {
    setCurrentError(null);
  };

  const handleContactSupport = () => {
    window.open('mailto:support@voicesalestrainer.com?subject=Voice Interface Issue', '_blank');
  };

  return (
    <div className={`min-h-screen bg-lightest-purple ${className}`}>
      
      {/* Error Overlay */}
      {currentError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-lg w-full">
            <VoiceErrorHandler
              error={currentError}
              onRetry={handleRetryConnection}
              onDismiss={handleDismissError}
              onContactSupport={handleContactSupport}
            />
          </div>
        </div>
      )}

      {/* Main Interface */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        
        {/* Header with Status */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-class-light-purple overflow-hidden">
          <div className="gradient-purple text-white p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
              <div className="flex-1">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">Enhanced Voice Training Interface</h1>
                <p className="text-white opacity-90 text-sm lg:text-base">
                  Demonstration of improved voice conversation UI/UX components
                </p>
              </div>
            </div>
          </div>
          
          {/* Voice Status Display */}
          <div className="bg-class-pale-purple p-4">
            <VoiceStatusIndicator 
              status={voiceStatus.status} 
              className="w-full"
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Voice Controls */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg border-2 border-class-light-purple p-6">
              <div className="flex items-center space-x-2 mb-6">
                <span className="text-2xl">🎙️</span>
                <h2 className="text-xl font-bold text-class-purple">Voice Controls</h2>
              </div>
              
              {!isSessionActive ? (
                <div className="text-center space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-midnight-blue mb-2">Ready to test the enhanced interface?</h3>
                    <p className="text-middle-gray">Click start to experience the improved voice training UI</p>
                  </div>
                  
                  {/* Desktop Button */}
                  <div className="hidden md:block">
                    <button
                      onClick={handleStartSession}
                      disabled={!!currentError}
                      className="btn-primary text-lg px-8 py-4 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-2xl mr-2">🎤</span>
                      Start Enhanced Session
                    </button>
                  </div>
                  
                  {/* Mobile Button */}
                  <div className="md:hidden flex justify-center">
                    <MobileVoiceButton
                      state="inactive"
                      onTouchStart={handleStartSession}
                      onTouchEnd={() => {}}
                      disabled={!!currentError}
                      size="large"
                    />
                  </div>
                </div>
              ) : (
                <VoiceControlPanel
                  state={getVoiceControlState()}
                  isConnected={voiceStatus.status.websocket === 'connected'}
                  voiceLevel={voiceStatus.status.voiceLevel || 0}
                  onStartListening={handleStartListening}
                  onStopListening={handleStopListening}
                  onPause={() => voiceStatus.updateAIStatus('idle')}
                  onResume={() => voiceStatus.updateAIStatus('idle')}
                  onStop={handleStopSession}
                  disabled={!!currentError}
                  className="w-full"
                />
              )}
              
              {/* ElevenLabs Integration Status */}
              {elevenLabsVoice.VoiceInterface && (
                <div className="mt-6 p-4 bg-lightest-gray rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-semibold text-midnight-blue">ElevenLabs Integration</span>
                  </div>
                  <elevenLabsVoice.VoiceInterface />
                </div>
              )}
            </div>
          </div>
          
          {/* Enhanced Feedback Panel */}
          <div className="space-y-6">
            <RealTimeFeedbackPanel
              feedbackItems={feedbackManager.feedbackItems}
              isActive={isSessionActive && voiceStatus.status.websocket === 'connected'}
              onFeedbackDismiss={feedbackManager.removeFeedback}
              maxVisibleItems={5}
              showCategories={true}
            />
            
            {/* Feature Highlights */}
            <div className="bg-white rounded-lg shadow-lg border-2 border-class-light-purple p-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-xl">✨</span>
                <h3 className="font-bold text-class-purple">New Features</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <span className="text-green-500">●</span>
                  <span className="text-dark-gray">Real-time connection status</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500">●</span>
                  <span className="text-dark-gray">Enhanced error handling</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500">●</span>
                  <span className="text-dark-gray">Intelligent feedback system</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-yellow-500">●</span>
                  <span className="text-dark-gray">Mobile-optimized controls</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-pink-500">●</span>
                  <span className="text-dark-gray">Accessible design patterns</span>
                </li>
              </ul>
            </div>
          </div>
          
        </div>
        
        {/* Development Notes */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-class-light-purple p-6">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xl">🔧</span>
            <h3 className="font-bold text-class-purple">Implementation Notes</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-midnight-blue mb-2">Voice Status Indicators</h4>
              <ul className="text-dark-gray space-y-1">
                <li>• WebSocket connection state</li>
                <li>• Microphone permission status</li>
                <li>• AI response indicators</li>
                <li>• Audio quality metrics</li>
                <li>• Real-time voice level</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-midnight-blue mb-2">Error Handling</h4>
              <ul className="text-dark-gray space-y-1">
                <li>• Progressive disclosure</li>
                <li>• Browser-specific guidance</li>
                <li>• Recovery action buttons</li>
                <li>• Technical details toggle</li>
                <li>• Support contact integration</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-midnight-blue mb-2">Mobile Optimization</h4>
              <ul className="text-dark-gray space-y-1">
                <li>• Touch-optimized controls</li>
                <li>• Haptic feedback support</li>
                <li>• Responsive layouts</li>
                <li>• Accessibility compliance</li>
                <li>• Performance optimized</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}