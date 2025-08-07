'use client';

import { useState, useRef, useEffect } from 'react';

interface SessionRecording {
  id: string;
  scenarioTitle: string;
  duration: number;
  timestamp: Date;
  audioUrl: string;
  transcript: TranscriptSegment[];
  feedbackMarkers: FeedbackMarker[];
  score: number;
}

interface TranscriptSegment {
  id: string;
  speaker: 'user' | 'ai';
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

interface FeedbackMarker {
  id: string;
  timestamp: number;
  type: 'positive' | 'improvement' | 'critical';
  category: string;
  message: string;
  details?: string;
}

interface SessionPlaybackProps {
  recording: SessionRecording;
  onClose: () => void;
}

export default function SessionPlayback({ recording, onClose }: SessionPlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(true);
  const [showFeedback, setShowFeedback] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<FeedbackMarker | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create audio element
    const audio = new Audio(recording.audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    // Update current time
    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', () => setIsPlaying(false));
      audio.pause();
    };
  }, [recording.audioUrl]);

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentSegment = () => {
    return recording.transcript.find(
      segment => currentTime >= segment.startTime && currentTime <= segment.endTime
    );
  };

  const getFeedbackAtTime = (time: number) => {
    return recording.feedbackMarkers.filter(
      marker => Math.abs(marker.timestamp - time) <= 5
    );
  };

  const scrollToCurrentSegment = () => {
    const currentSegment = getCurrentSegment();
    if (currentSegment && transcriptRef.current) {
      const element = transcriptRef.current.querySelector(`[data-segment-id="${currentSegment.id}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    if (showTranscript) {
      scrollToCurrentSegment();
    }
  }, [currentTime, showTranscript]);

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'positive': return 'bg-green-500';
      case 'improvement': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'positive': return '✓';
      case 'improvement': return '!';
      case 'critical': return '⚠';
      default: return 'i';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Session Playback</h2>
            <p className="text-purple-100">{recording.scenarioTitle}</p>
            <p className="text-purple-200 text-sm">
              {recording.timestamp.toLocaleDateString()} • {formatTime(recording.duration)} • Score: {recording.score}%
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        
        {/* Audio Controls and Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Playback Controls */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={togglePlayback}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full transition-colors"
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>
                
                <div className="text-sm text-gray-600">
                  {formatTime(currentTime)} / {formatTime(recording.duration)}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Speed:</label>
                {[0.75, 1, 1.25, 1.5, 2].map(rate => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={`px-2 py-1 text-xs rounded ${
                      playbackRate === rate 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
            
            {/* Timeline with Feedback Markers */}
            <div className="relative">
              <div 
                className="w-full h-2 bg-gray-200 rounded-full cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const percentage = clickX / rect.width;
                  seekTo(percentage * recording.duration);
                }}
              >
                <div 
                  className="h-2 bg-purple-600 rounded-full"
                  style={{ width: `${(currentTime / recording.duration) * 100}%` }}
                ></div>
              </div>
              
              {/* Feedback Markers on Timeline */}
              {recording.feedbackMarkers.map(marker => (
                <div
                  key={marker.id}
                  className={`absolute top-0 w-3 h-3 rounded-full cursor-pointer transform -translate-y-0.5 ${getMarkerColor(marker.type)}`}
                  style={{ left: `${(marker.timestamp / recording.duration) * 100}%` }}
                  onClick={() => {
                    seekTo(marker.timestamp);
                    setSelectedMarker(marker);
                  }}
                  title={marker.message}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-white text-xs">
                    {getMarkerIcon(marker.type)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View Controls */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showTranscript 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📝 Transcript
            </button>
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showFeedback 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              💬 Feedback
            </button>
          </div>

          {/* Transcript */}
          {showTranscript && (
            <div 
              ref={transcriptRef}
              className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto"
            >
              <h3 className="font-semibold mb-4">Conversation Transcript</h3>
              <div className="space-y-4">
                {recording.transcript.map(segment => {
                  const isActive = currentTime >= segment.startTime && currentTime <= segment.endTime;
                  return (
                    <div
                      key={segment.id}
                      data-segment-id={segment.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-purple-100 border-2 border-purple-300 shadow-md' 
                          : segment.speaker === 'user'
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'bg-white hover:bg-gray-100'
                      }`}
                      onClick={() => seekTo(segment.startTime)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            segment.speaker === 'user' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-500 text-white'
                          }`}>
                            {segment.speaker === 'user' ? 'You' : 'AI Prospect'}
                          </span>
                          {segment.confidence && (
                            <span className="text-xs text-gray-500">
                              {Math.round(segment.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTime(segment.startTime)}
                        </span>
                      </div>
                      <p className="text-gray-800">{segment.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Feedback Panel */}
        <div className="space-y-6">
          
          {/* Current Feedback */}
          {selectedMarker && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Selected Feedback</h3>
              <div className={`p-3 rounded-lg ${
                selectedMarker.type === 'positive' 
                  ? 'bg-green-50 border border-green-200' 
                  : selectedMarker.type === 'improvement'
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start space-x-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${getMarkerColor(selectedMarker.type)}`}>
                    {getMarkerIcon(selectedMarker.type)}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{selectedMarker.category}</p>
                    <p className="text-sm text-gray-700 mt-1">{selectedMarker.message}</p>
                    {selectedMarker.details && (
                      <p className="text-xs text-gray-600 mt-2">{selectedMarker.details}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All Feedback Markers */}
          {showFeedback && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-4">All Feedback ({recording.feedbackMarkers.length})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recording.feedbackMarkers.map(marker => (
                  <div
                    key={marker.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedMarker?.id === marker.id 
                        ? 'ring-2 ring-purple-500' 
                        : 'hover:shadow-md'
                    } ${
                      marker.type === 'positive' 
                        ? 'bg-green-50 border border-green-200' 
                        : marker.type === 'improvement'
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                    onClick={() => {
                      seekTo(marker.timestamp);
                      setSelectedMarker(marker);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${getMarkerColor(marker.type)}`}>
                          {getMarkerIcon(marker.type)}
                        </span>
                        <div>
                          <p className="font-medium text-xs text-gray-900">{marker.category}</p>
                          <p className="text-xs text-gray-700 mt-1">{marker.message}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatTime(marker.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Navigation */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Quick Jump</h3>
            <div className="space-y-2">
              <button
                onClick={() => seekTo(0)}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded transition-colors"
              >
                🔄 Start of Session
              </button>
              <button
                onClick={() => seekTo(recording.duration * 0.25)}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded transition-colors"
              >
                ⚡ First Quarter
              </button>
              <button
                onClick={() => seekTo(recording.duration * 0.5)}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded transition-colors"
              >
                🎯 Midpoint
              </button>
              <button
                onClick={() => seekTo(recording.duration * 0.75)}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded transition-colors"
              >
                🏁 Final Quarter
              </button>
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Export</h3>
            <div className="space-y-2">
              <button className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                📄 Export Transcript
              </button>
              <button className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                📊 Export Feedback Report
              </button>
              <button className="w-full px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
                🎵 Download Audio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}