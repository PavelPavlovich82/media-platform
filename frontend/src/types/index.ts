/**
 * Type Definitions
 *
 * Centralized TypeScript types for the entire application.
 */

// ============================================================================
// User & Authentication Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  expiresAt: string;
  user: User;
}

// ============================================================================
// Upload Types
// ============================================================================

export type ContentType =
  | 'photo'
  | 'video'
  | 'text'
  | 'voice'
  | 'mixed'
  | 'article'
  | 'avatar';

export type ProcessingStatus =
  | 'uploading'
  | 'pending'
  | 'processing'
  | 'awaiting_decision'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'failed';

export interface Upload {
  id: string;
  userId: string;
  contentType: ContentType;
  status: ProcessingStatus;

  // Cloudinary data (for photo/video)
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
  cloudinarySecureUrl?: string;

  // Text content (for text/voice)
  textContent?: string;

  // File metadata
  originalFilename?: string;
  fileSize?: number;
  mimeType?: string;

  // Processing info
  n8nWorkflowId?: string;
  processingAttempts: number;
  lastError?: string;

  // Batch session: arrays of uploaded files (new combined-session format)
  uploadedPhotos?: { url: string; secureUrl?: string; name?: string }[];
  uploadedVideos?: { url: string; secureUrl?: string; name?: string }[];

  // n8n / Creatomate result
  renderUrl?: string;                        // Creatomate download URL
  renderStatus?: 'rendering' | 'ready';      // whether file is ready to play
  triggeredN8n?: boolean;                    // whether n8n was triggered for this batch
  n8nTriggeredAt?: string;                   // timestamp of first n8n POST trigger
  n8nPollAttempts?: number;                  // how many GET polls were already done
  publishWebhookTriggeredAt?: string;        // timestamp of POST to "video arrived on site" webhook
  targetName?: string;                       // target person name sent to n8n (for polling)
  serviceSlug?: string;                      // parent WordPress category slug (service_slug)
  teamSlug?: string;                         // child WordPress category slug (team_slug)
  serviceName?: string;                      // parent WordPress category name
  teamName?: string;                         // child WordPress category name

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Processing result (joined from processing_results table)
  processingResult?: ProcessingResult;
}

export interface ProcessingResult {
  id: string;
  uploadId: string;
  resultData: Record<string, any>; // Flexible JSONB structure
  resultPreview: string;
  resultMediaUrl?: string;
  userDecision?: 'approve' | 'reject' | 'retry';
  decisionTimestamp?: string;
  createdAt: string;
}

export interface CreateUploadParams {
  contentType: ContentType;
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
  cloudinarySecureUrl?: string;
  textContent?: string;
  originalFilename?: string;
  fileSize?: number;
  mimeType?: string;
  targetName?: string;
  serviceSlug?: string;
  teamSlug?: string;
  serviceName?: string;
  teamName?: string;
  uploadedPhotos?: { url: string; secureUrl?: string; name?: string }[];
  uploadedVideos?: { url: string; secureUrl?: string; name?: string }[];
}

export interface UserDecision {
  decision: 'approve' | 'reject' | 'retry';
}

// ============================================================================
// Cloudinary Types
// ============================================================================

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: 'image' | 'video' | 'raw';
  bytes: number;
  width?: number;
  height?: number;
  created_at: string;
}

export interface CloudinaryUploadOptions {
  file: File;
  onProgress?: (percent: number) => void;
}

// ============================================================================
// Voice Recording Types
// ============================================================================

export interface VoiceRecordingState {
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  error: string | null;
  duration: number; // in seconds
}

export interface WhisperTranscriptionResponse {
  text: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  error: true;
  message: string;
  details?: Record<string, any>;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Form Types
// ============================================================================

export interface FormErrors {
  [key: string]: string | undefined;
}

export interface UploadFormData {
  files: File[];
  textContent: string;
  contentType: ContentType;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardStats {
  totalUploads: number;
  awaitingDecision: number;
  completed: number;
  rejected: number;
  processing: number;
}

export interface GroupedUploads {
  awaitingDecision: Upload[];
  processing: Upload[];
  completed: Upload[];
  rejected: Upload[];
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type AsyncFunction<T = void> = (...args: any[]) => Promise<T>;

