/**
 * Cloudinary Service
 *
 * Handles file uploads to Cloudinary cloud storage.
 */

import { config } from '../config/env';
import type { CloudinaryUploadResponse, CloudinaryUploadOptions } from '../types';

/**
 * Upload file to Cloudinary
 */
export const uploadToCloudinary = async ({
  file,
  onProgress,
}: CloudinaryUploadOptions): Promise<CloudinaryUploadResponse> => {
  return new Promise((resolve, reject) => {
    // Validate file
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    // Validate Cloudinary config
    if (!config.cloudinary.cloudName || !config.cloudinary.uploadPreset) {
      reject(new Error('Cloudinary not configured. Please check your .env file.'));
      return;
    }

    // Validate file size
    if (file.size > config.app.maxFileSize) {
      reject(new Error(`File too large. Maximum size is ${config.app.maxFileSize / 1024 / 1024}MB`));
      return;
    }

    // Validate file type
    const isImage = config.app.allowedImageTypes.includes(file.type);
    const isVideo = config.app.allowedVideoTypes.includes(file.type);

    if (!isImage && !isVideo) {
      reject(new Error('Invalid file type. Please upload an image or video.'));
      return;
    }

    // Determine resource type
    const resourceType = isVideo ? 'video' : 'image';

    // Build Cloudinary upload URL
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/${resourceType}/upload`;

    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', config.cloudinary.uploadPreset);
    formData.append('folder', 'media-platform'); // Organize files in folder

    // Optional: Add tags
    formData.append('tags', 'user-upload');

    // Create XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(percentComplete);
      }
    });

    // Handle successful upload
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response: CloudinaryUploadResponse = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error('Failed to parse Cloudinary response'));
        }
      } else {
        let message = xhr.statusText || 'Unknown Cloudinary error';
        try {
          const parsed = JSON.parse(xhr.responseText) as { error?: { message?: string } };
          message = parsed.error?.message || message;
        } catch {
          if (xhr.responseText) message = xhr.responseText.slice(0, 300);
        }
        reject(new Error(`Cloudinary upload failed (${xhr.status}): ${message}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Send request
    xhr.open('POST', cloudinaryUrl);
    xhr.send(formData);
  });
};

/**
 * Delete file from Cloudinary
 * Note: This requires backend implementation as it needs API secret
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  void publicId;
  // This should be implemented on backend for security
  // Frontend cannot delete files directly as it requires API secret
  throw new Error('Delete functionality must be implemented on backend');
};

/**
 * Get optimized image URL
 */
export const getOptimizedImageUrl = (
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'jpg' | 'png' | 'webp';
  }
): string => {
  const { cloudName } = config.cloudinary;
  const { width, height, quality = 80, format = 'auto' } = options || {};

  let transformations = `f_${format},q_${quality}`;

  if (width) transformations += `,w_${width}`;
  if (height) transformations += `,h_${height}`;

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
};

/**
 * Get video thumbnail URL
 */
export const getVideoThumbnail = (publicId: string): string => {
  const { cloudName } = config.cloudinary;
  return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,w_400,h_300,c_fill/${publicId}.jpg`;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validate file before upload
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > config.app.maxFileSize) {
    return {
      valid: false,
      error: `Файл слишком большой. Максимальный размер: ${formatFileSize(config.app.maxFileSize)}`,
    };
  }

  // Check file type
  const isImage = config.app.allowedImageTypes.includes(file.type);
  const isVideo = config.app.allowedVideoTypes.includes(file.type);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: 'Неподдерживаемый формат файла. Загрузите изображение или видео.',
    };
  }

  return { valid: true };
};
