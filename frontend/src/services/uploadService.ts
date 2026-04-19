/**
 * Upload Service
 *
 * Local storage for uploads (will switch to n8n API later).
 * Stores uploads in localStorage for demo/development.
 */

import type {
  Upload,
  CreateUploadParams,
  ProcessingStatus,
  PaginatedResponse,
} from '../types';

const STORAGE_KEY = 'uploads';

// ============================================================================
// Local storage helpers
// ============================================================================

const getUploads = (): Upload[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const saveUploads = (uploads: Upload[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(uploads));
};

// ============================================================================
// Upload Service
// ============================================================================

export const uploadService = {
  /**
   * Create new upload record
   */
  async createUpload(params: CreateUploadParams): Promise<Upload> {
    const uploads = getUploads();
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    const upload: Upload = {
      id: crypto.randomUUID(),
      userId: user?.id || 'unknown',
      contentType: params.contentType,
      status: 'pending' as ProcessingStatus,
      cloudinaryPublicId: params.cloudinaryPublicId,
      cloudinaryUrl: params.cloudinaryUrl,
      cloudinarySecureUrl: params.cloudinarySecureUrl,
      textContent: params.textContent,
      originalFilename: params.originalFilename,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      targetName: params.targetName,
      serviceSlug: params.serviceSlug,
      teamSlug: params.teamSlug,
      serviceName: params.serviceName,
      teamName: params.teamName,
      uploadedPhotos: params.uploadedPhotos,
      uploadedVideos: params.uploadedVideos,
      processingAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    uploads.unshift(upload); // newest first
    saveUploads(uploads);
    return upload;
  },

  /**
   * Get all uploads for current user
   */
  async getUserUploads(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Upload>> {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    let uploads = getUploads().filter((u) => u.userId === user?.id);

    if (options?.status) {
      uploads = uploads.filter((u) => u.status === options.status);
    }

    const total = uploads.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    const sliced = uploads.slice(offset, offset + limit);

    return {
      success: true,
      data: sliced,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  },

  /**
   * Get single upload by ID
   */
  async getUpload(uploadId: string): Promise<Upload> {
    const uploads = getUploads();
    const upload = uploads.find((u) => u.id === uploadId);
    if (!upload) throw new Error('Upload not found');
    return upload;
  },

  /**
   * Submit user decision (approve/reject/retry)
   */
  async submitDecision(
    uploadId: string,
    decision: 'approve' | 'reject' | 'retry'
  ): Promise<Upload> {
    const uploads = getUploads();
    const index = uploads.findIndex((u) => u.id === uploadId);
    if (index === -1) throw new Error('Upload not found');

    const statusMap: Record<string, ProcessingStatus> = {
      approve: 'approved',
      reject: 'rejected',
      retry: 'processing',
    };

    uploads[index] = {
      ...uploads[index],
      status: statusMap[decision],
      updatedAt: new Date().toISOString(),
      processingAttempts:
        decision === 'retry'
          ? uploads[index].processingAttempts + 1
          : uploads[index].processingAttempts,
    };

    saveUploads(uploads);
    return uploads[index];
  },

  /**
   * Delete upload
   */
  async deleteUpload(uploadId: string): Promise<void> {
    const uploads = getUploads().filter((u) => u.id !== uploadId);
    saveUploads(uploads);
  },

  /**
   * Delete all uploads for current user
   */
  async deleteAllUserUploads(): Promise<void> {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const uploads = getUploads().filter((u) => u.userId !== user?.id);
    saveUploads(uploads);
  },

  /**
   * Mark upload as failed (e.g. stale processing timeout)
   */
  async markFailed(uploadId: string, reason?: string): Promise<void> {
    const uploads = getUploads();
    const index = uploads.findIndex((u) => u.id === uploadId);
    if (index === -1) return;
    uploads[index] = {
      ...uploads[index],
      status: 'failed',
      lastError: reason || 'Timeout: no response from processing',
      updatedAt: new Date().toISOString(),
    };
    saveUploads(uploads);
  },

  /**
   * Update upload with render URL from Creatomate (called after n8n callback).
   * renderStatus='rendering' means URL is saved but file is not ready yet.
   */
  async setRenderResult(
    uploadId: string,
    renderUrl: string,
    renderStatus: 'rendering' | 'ready' = 'rendering'
  ): Promise<void> {
    const uploads = getUploads();
    const index = uploads.findIndex((u) => u.id === uploadId);
    if (index === -1) return;
    uploads[index] = {
      ...uploads[index],
      renderUrl,
      renderStatus,
      status: 'awaiting_decision',
      updatedAt: new Date().toISOString(),
    };
    saveUploads(uploads);
  },

  /**
   * Mark render as ready (file confirmed accessible at renderUrl)
   */
  async setRenderReady(uploadId: string): Promise<void> {
    const uploads = getUploads();
    const index = uploads.findIndex((u) => u.id === uploadId);
    if (index === -1) return;
    uploads[index] = {
      ...uploads[index],
      renderStatus: 'ready',
      updatedAt: new Date().toISOString(),
    };
    saveUploads(uploads);
  },

  /**
   * Mark upload as n8n triggered
   */
  async markN8nTriggered(uploadId: string): Promise<void> {
    const uploads = getUploads();
    const index = uploads.findIndex((u) => u.id === uploadId);
    if (index === -1) return;
    uploads[index] = {
      ...uploads[index],
      triggeredN8n: true,
      n8nTriggeredAt: new Date().toISOString(),
      n8nPollAttempts: 0,
      status: 'processing',
      updatedAt: new Date().toISOString(),
    };
    saveUploads(uploads);
  },

  /**
   * Increase GET polling attempts counter for n8n render lookup.
   */
  async incrementN8nPollAttempt(uploadId: string): Promise<number> {
    const uploads = getUploads();
    const index = uploads.findIndex((u) => u.id === uploadId);
    if (index === -1) return 0;

    const nextAttempts = (uploads[index].n8nPollAttempts ?? 0) + 1;
    uploads[index] = {
      ...uploads[index],
      n8nPollAttempts: nextAttempts,
      updatedAt: new Date().toISOString(),
    };
    saveUploads(uploads);
    return nextAttempts;
  },

  /**
   * Mark that "video link arrived on site" webhook was sent.
   */
  async markPublishWebhookTriggered(uploadId: string): Promise<void> {
    const uploads = getUploads();
    const index = uploads.findIndex((u) => u.id === uploadId);
    if (index === -1) return;
    uploads[index] = {
      ...uploads[index],
      publishWebhookTriggeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveUploads(uploads);
  },
};

// ============================================================================
// Helpers
// ============================================================================

export const getUploadStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    uploading: 'Загружается',
    pending: 'В очереди',
    processing: 'Обрабатывается',
    awaiting_decision: 'Требует решения',
    approved: 'Одобрено',
    rejected: 'Отклонено',
    completed: 'Завершено',
    failed: 'Ошибка',
  };
  return labels[status] || status;
};

export const getUploadStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    uploading: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-purple-100 text-purple-800',
    awaiting_decision: 'bg-orange-100 text-orange-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getContentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    photo: 'Фото',
    video: 'Видео',
    text: 'Текст',
    voice: 'Голос',
  };
  return labels[type] || type;
};

export const getContentTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    photo: 'camera',
    video: 'video',
    text: 'text',
    voice: 'mic',
  };
  return icons[type] || 'file';
};

