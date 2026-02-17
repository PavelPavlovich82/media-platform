/**
 * Environment Configuration
 *
 * Centralizes all environment variables and configuration settings.
 * Use this file to access API keys, endpoints, and other config values.
 */

export const config = {
  // API Configuration
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    n8nWebhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL || '',
    n8nApiKey: import.meta.env.VITE_N8N_API_KEY || '',
  },

  // Cloudinary Configuration
  cloudinary: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
    apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY || '',
  },

  // OpenAI Configuration
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  },

  // Application Settings
  app: {
    name: 'Media Upload Platform',
    version: '1.0.0',
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  },

  // Feature Flags
  features: {
    voiceInput: true,
    textInput: true,
    photoUpload: true,
    videoUpload: true,
  },
};

// Validation: Check if required environment variables are set
export const validateConfig = (): { valid: boolean; missing: string[] } => {
  const missing: string[] = [];

  if (!config.api.n8nWebhookUrl) missing.push('VITE_N8N_WEBHOOK_URL');
  if (!config.api.n8nApiKey) missing.push('VITE_N8N_API_KEY');
  if (!config.cloudinary.cloudName) missing.push('VITE_CLOUDINARY_CLOUD_NAME');
  if (!config.cloudinary.uploadPreset) missing.push('VITE_CLOUDINARY_UPLOAD_PRESET');

  return {
    valid: missing.length === 0,
    missing,
  };
};

// Helper functions
export const isProduction = (): boolean => {
  return import.meta.env.PROD;
};

export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};
