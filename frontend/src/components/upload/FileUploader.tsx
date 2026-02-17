/**
 * File Uploader Component
 *
 * Drag & drop file uploader with progress tracking.
 * Uploads files to Cloudinary and sends metadata to n8n.
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { uploadToCloudinary, validateFile, formatFileSize } from '../../services/cloudinaryService';
import { uploadService } from '../../services/uploadService';
import { config } from '../../config/env';

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  fileName: string | null;
}

export const FileUploader: React.FC = () => {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    fileName: null,
  });

  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadState({
        uploading: false,
        progress: 0,
        error: validation.error || 'Invalid file',
        fileName: null,
      });
      return;
    }

    setUploadState({
      uploading: true,
      progress: 0,
      error: null,
      fileName: file.name,
    });

    try {
      // Step 1: Upload to Cloudinary (70% of progress)
      const cloudinaryResult = await uploadToCloudinary({
        file,
        onProgress: (percent) => {
          setUploadState((prev) => ({
            ...prev,
            progress: percent * 0.7, // 0-70%
          }));
        },
      });

      setUploadState((prev) => ({ ...prev, progress: 70 }));

      // Determine content type
      const isVideo = config.app.allowedVideoTypes.includes(file.type);
      const contentType = isVideo ? 'video' : 'photo';

      // Step 2: Save metadata and send to n8n (30% of progress)
      await uploadService.createUpload({
        contentType,
        cloudinaryPublicId: cloudinaryResult.public_id,
        cloudinaryUrl: cloudinaryResult.url,
        cloudinarySecureUrl: cloudinaryResult.secure_url,
        originalFilename: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      setUploadState((prev) => ({ ...prev, progress: 100 }));

      // Success! Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      setUploadState({
        uploading: false,
        progress: 0,
        error: error.message || 'Upload failed. Please try again.',
        fileName: file.name,
      });
    }
  }, [navigate]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': config.app.allowedImageTypes,
      'video/*': config.app.allowedVideoTypes,
    },
    maxFiles: 1,
    multiple: false,
    disabled: uploadState.uploading,
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive && !isDragReject ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}
          ${isDragReject ? 'border-red-500 bg-red-50' : ''}
          ${uploadState.uploading ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />

        {/* Upload icon */}
        <div className="mb-4">
          {isDragActive ? (
            <svg
              className="mx-auto h-16 w-16 text-primary-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          ) : (
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="space-y-2">
          {isDragActive ? (
            <p className="text-lg font-medium text-primary-600">
              Отпустите файл для загрузки
            </p>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-700">
                Перетащите файл сюда или кликните для выбора
              </p>
              <p className="text-sm text-gray-500">
                Поддерживаемые форматы: JPG, PNG, GIF, WebP, MP4, WebM, MOV
              </p>
              <p className="text-xs text-gray-400">
                Максимальный размер: {formatFileSize(config.app.maxFileSize)}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {uploadState.uploading && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Загрузка {uploadState.fileName}...
            </span>
            <span className="text-sm font-medium text-primary-600">
              {Math.round(uploadState.progress)}%
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary-600 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadState.progress}%` }}
            ></div>
          </div>

          <div className="mt-2 text-xs text-gray-500 text-center">
            {uploadState.progress < 70
              ? 'Загрузка в Cloudinary...'
              : uploadState.progress < 100
              ? 'Сохранение данных...'
              : 'Готово! Перенаправление...'}
          </div>
        </div>
      )}

      {/* Error message */}
      {uploadState.error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">Ошибка загрузки</h4>
              <p className="text-sm text-red-700 mt-1">{uploadState.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info boxes */}
      {!uploadState.uploading && !uploadState.error && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card bg-blue-50 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">📸 Фото</h3>
            <p className="text-sm text-blue-700">
              JPG, PNG, GIF, WebP до {formatFileSize(config.app.maxFileSize)}
            </p>
          </div>

          <div className="card bg-purple-50 border border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-2">🎥 Видео</h3>
            <p className="text-sm text-purple-700">
              MP4, WebM, MOV до {formatFileSize(config.app.maxFileSize)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
