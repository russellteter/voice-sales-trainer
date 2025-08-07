/**
 * Frontend configuration management
 * Environment-specific settings and feature flags
 */

export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  features: {
    voiceEnabled: boolean;
    claudeEnabled: boolean;
    realTimeCoaching: boolean;
    voiceAnalytics: boolean;
    peerComparison: boolean;
    achievementSystem: boolean;
    offlineMode: boolean;
  };
  voice: {
    sampleRate: number;
    chunkSize: number;
    silenceThreshold: number;
    maxRecordingTime: number;
    enableNoiseReduction: boolean;
    enableEchoCancellation: boolean;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    animations: boolean;
    compactMode: boolean;
    debugMode: boolean;
  };
  analytics: {
    enabled: boolean;
    sessionTracking: boolean;
    errorReporting: boolean;
  };
}

// Environment detection
const getEnvironment = (): 'development' | 'production' | 'staging' => {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development';
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
};

// Environment-specific configurations
const configs: Record<string, Partial<AppConfig>> = {
  development: {
    api: {
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      timeout: 30000,
      retryAttempts: 3,
    },
    features: {
      voiceEnabled: process.env.NEXT_PUBLIC_ELEVENLABS_ENABLED === 'true',
      claudeEnabled: process.env.NEXT_PUBLIC_CLAUDE_ENABLED === 'true',
      realTimeCoaching: true,
      voiceAnalytics: true,
      peerComparison: false,
      achievementSystem: true,
      offlineMode: false,
    },
    voice: {
      sampleRate: 16000,
      chunkSize: 1024,
      silenceThreshold: 0.01,
      maxRecordingTime: 300000, // 5 minutes
      enableNoiseReduction: true,
      enableEchoCancellation: true,
    },
    ui: {
      theme: 'light',
      animations: true,
      compactMode: false,
      debugMode: true,
    },
    analytics: {
      enabled: false,
      sessionTracking: true,
      errorReporting: true,
    },
  },
  
  staging: {
    api: {
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://staging-api.voice-sales-trainer.com',
      timeout: 15000,
      retryAttempts: 2,
    },
    features: {
      voiceEnabled: true,
      claudeEnabled: true,
      realTimeCoaching: true,
      voiceAnalytics: true,
      peerComparison: true,
      achievementSystem: true,
      offlineMode: false,
    },
    voice: {
      sampleRate: 16000,
      chunkSize: 1024,
      silenceThreshold: 0.01,
      maxRecordingTime: 600000, // 10 minutes
      enableNoiseReduction: true,
      enableEchoCancellation: true,
    },
    ui: {
      theme: 'light',
      animations: true,
      compactMode: false,
      debugMode: false,
    },
    analytics: {
      enabled: true,
      sessionTracking: true,
      errorReporting: true,
    },
  },
  
  production: {
    api: {
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.voice-sales-trainer.com',
      timeout: 10000,
      retryAttempts: 1,
    },
    features: {
      voiceEnabled: true,
      claudeEnabled: true,
      realTimeCoaching: true,
      voiceAnalytics: true,
      peerComparison: true,
      achievementSystem: true,
      offlineMode: false,
    },
    voice: {
      sampleRate: 16000,
      chunkSize: 1024,
      silenceThreshold: 0.01,
      maxRecordingTime: 900000, // 15 minutes
      enableNoiseReduction: true,
      enableEchoCancellation: true,
    },
    ui: {
      theme: 'auto',
      animations: true,
      compactMode: false,
      debugMode: false,
    },
    analytics: {
      enabled: true,
      sessionTracking: true,
      errorReporting: true,
    },
  },
};

// Default configuration
const defaultConfig: AppConfig = {
  api: {
    baseUrl: 'http://localhost:8000',
    timeout: 30000,
    retryAttempts: 3,
  },
  features: {
    voiceEnabled: false,
    claudeEnabled: false,
    realTimeCoaching: true,
    voiceAnalytics: true,
    peerComparison: false,
    achievementSystem: true,
    offlineMode: false,
  },
  voice: {
    sampleRate: 16000,
    chunkSize: 1024,
    silenceThreshold: 0.01,
    maxRecordingTime: 300000,
    enableNoiseReduction: true,
    enableEchoCancellation: true,
  },
  ui: {
    theme: 'light',
    animations: true,
    compactMode: false,
    debugMode: false,
  },
  analytics: {
    enabled: false,
    sessionTracking: true,
    errorReporting: true,
  },
};

// Merge configurations
const createConfig = (): AppConfig => {
  const env = getEnvironment();
  const envConfig = configs[env] || {};
  
  return {
    ...defaultConfig,
    api: { ...defaultConfig.api, ...envConfig.api },
    features: { ...defaultConfig.features, ...envConfig.features },
    voice: { ...defaultConfig.voice, ...envConfig.voice },
    ui: { ...defaultConfig.ui, ...envConfig.ui },
    analytics: { ...defaultConfig.analytics, ...envConfig.analytics },
  };
};

// Export the configuration
export const config = createConfig();

// Configuration utilities
export const isFeatureEnabled = (feature: keyof AppConfig['features']): boolean => {
  return config.features[feature];
};

export const getApiUrl = (endpoint: string = ''): string => {
  return `${config.api.baseUrl}${endpoint}`;
};

export const isDevelopment = (): boolean => {
  return getEnvironment() === 'development';
};

export const isProduction = (): boolean => {
  return getEnvironment() === 'production';
};

export const isDebugMode = (): boolean => {
  return config.ui.debugMode;
};

// Voice configuration helpers
export const getVoiceConfig = () => ({
  sampleRate: config.voice.sampleRate,
  chunkSize: config.voice.chunkSize,
  silenceThreshold: config.voice.silenceThreshold,
  maxRecordingTime: config.voice.maxRecordingTime,
  enableNoiseReduction: config.voice.enableNoiseReduction,
  enableEchoCancellation: config.voice.enableEchoCancellation,
});

// API configuration helpers
export const getApiConfig = () => ({
  baseUrl: config.api.baseUrl,
  timeout: config.api.timeout,
  retryAttempts: config.api.retryAttempts,
});

// Feature flags
export const FeatureFlags = {
  VOICE_ENABLED: isFeatureEnabled('voiceEnabled'),
  CLAUDE_ENABLED: isFeatureEnabled('claudeEnabled'),
  REAL_TIME_COACHING: isFeatureEnabled('realTimeCoaching'),
  VOICE_ANALYTICS: isFeatureEnabled('voiceAnalytics'),
  PEER_COMPARISON: isFeatureEnabled('peerComparison'),
  ACHIEVEMENT_SYSTEM: isFeatureEnabled('achievementSystem'),
  OFFLINE_MODE: isFeatureEnabled('offlineMode'),
} as const;

// Environment variables validation
const validateEnvironmentVariables = () => {
  const required = ['NEXT_PUBLIC_API_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0 && isProduction()) {
    console.warn(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Warn about development-only features in production
  if (isProduction()) {
    if (config.ui.debugMode) {
      console.warn('Debug mode is enabled in production');
    }
  }
};

// Initialize validation on module load
if (typeof window !== 'undefined') {
  validateEnvironmentVariables();
}

// Configuration logging for development
if (isDevelopment() && typeof window !== 'undefined') {
  console.group('🔧 App Configuration');
  console.log('Environment:', getEnvironment());
  console.log('API URL:', config.api.baseUrl);
  console.log('Features:', config.features);
  console.log('Voice Config:', config.voice);
  console.groupEnd();
}

export default config;