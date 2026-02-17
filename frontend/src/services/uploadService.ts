/**
 * Upload Service
 *
 * Handles communication with n8n backend for managing uploads.
 */

import { api } from './authService';
import type {
  Upload,
  CreateUploadParams,
  ProcessingResult,
  UserDecision,
  PaginatedResponse,
} from '../types';

/**
 * Upload Service API
 */
export const uploadService = {
  /**
   * Create new upload record and trigger n8n processing
   */
  async createUpload(params: CreateUploadParams): Promise<Upload> {
    try {
      const response = await api.post<{ success: boolean; upload: Upload }>('/uploads', params);
      return response.data.upload;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create upload');
    }
  },

  /**
   * Get all uploads for current user
   */
  async getUserUploads(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Upload>> {
    try {
      const params = new URLSearchParams();

      if (options?.status) params.append('status', options.status);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());

      const response = await api.get<PaginatedResponse<Upload>>(`/uploads?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch uploads');
    }
  },

  /**
   * Get single upload by ID
   */
  async getUpload(uploadId: string): Promise<Upload> {
    try {
      const response = await api.get<Upload>(`/uploads/${uploadId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch upload');
    }
  },

  /**
   * Get processing results for upload
   */
  async getProcessingResults(uploadId: string): Promise<ProcessingResult[]> {
    try {
      const response = await api.get<{ success: boolean; results: ProcessingResult[] }>(
        `/uploads/${uploadId}/results`
      );
      return response.data.results;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch results');
    }
  },

  /**
   * Submit user decision (approve/reject/retry)
   */
  async submitDecision(uploadId: string, decision: UserDecision['decision']): Promise<Upload> {
    try {
      const response = await api.post<{ success: boolean; upload: Upload }>(
        `/uploads/${uploadId}/decision`,
        { decision }
      );
      return response.data.upload;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to submit decision');
    }
  },

  /**
   * Delete upload (if allowed)
   */
  async deleteUpload(uploadId: string): Promise<void> {
    try {
      await api.delete(`/uploads/${uploadId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete upload');
    }
  },
};

/**
 * Helper: Get upload status label
 */
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

/**
 * Helper: Get upload status color
 */
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
