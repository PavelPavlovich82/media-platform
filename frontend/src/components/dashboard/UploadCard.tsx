/**
 * Upload Card Component
 *
 * Displays a single upload with preview, status, and action buttons.
 */

import React, { useState } from 'react';
import type { Upload } from '../../types';
import {
  getUploadStatusLabel,
  getUploadStatusColor,
  getContentTypeLabel,
} from '../../services/uploadService';
import { formatFileSize } from '../../services/cloudinaryService';

interface UploadCardProps {
  upload: Upload;
  onDecision: (uploadId: string, decision: 'approve' | 'reject' | 'retry') => Promise<void>;
  onDelete: (uploadId: string) => Promise<void>;
}

export const UploadCard: React.FC<UploadCardProps> = ({ upload, onDecision, onDelete }) => {
  const [acting, setActing] = useState(false);

  const handleAction = async (action: 'approve' | 'reject' | 'retry' | 'delete') => {
    setActing(true);
    try {
      if (action === 'delete') {
        await onDelete(upload.id);
      } else {
        await onDecision(upload.id, action);
      }
    } finally {
      setActing(false);
    }
  };

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'только что';
    if (mins < 60) return `${mins} мин. назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч. назад`;
    const days = Math.floor(hours / 24);
    return `${days} дн. назад`;
  };

  // Content type icon
  const renderIcon = () => {
    switch (upload.contentType) {
      case 'photo':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'video':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'text':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'voice':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        );
    }
  };

  return (
    <div className="card border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Preview / Icon */}
        <div className="flex-shrink-0">
          {upload.cloudinarySecureUrl && upload.contentType === 'photo' ? (
            <img
              src={upload.cloudinarySecureUrl}
              alt={upload.originalFilename || 'Photo'}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : upload.contentType === 'video' && upload.cloudinarySecureUrl ? (
            <div className="w-16 h-16 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          ) : (
            <div
              className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                upload.contentType === 'text'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-purple-100 text-purple-600'
              }`}
            >
              {renderIcon()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 truncate">
              {upload.originalFilename ||
                (upload.textContent
                  ? upload.textContent.substring(0, 50) + (upload.textContent.length > 50 ? '...' : '')
                  : getContentTypeLabel(upload.contentType))}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
            <span className="flex items-center gap-1">
              {renderIcon()}
              {getContentTypeLabel(upload.contentType)}
            </span>
            {upload.fileSize && <span>{formatFileSize(upload.fileSize)}</span>}
            <span>{timeAgo(upload.createdAt)}</span>
          </div>

          {/* Text preview */}
          {upload.textContent && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {upload.textContent}
            </p>
          )}

          {/* Status badge */}
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getUploadStatusColor(
              upload.status
            )}`}
          >
            {getUploadStatusLabel(upload.status)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex flex-col gap-1.5">
          {upload.status === 'awaiting_decision' && (
            <>
              {/* Creatomate render URL */}
              {upload.renderUrl && (
                <a
                  href={upload.renderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Скачать
                </a>
              )}
              <button
                onClick={() => handleAction('approve')}
                disabled={acting}
                className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                Одобрить
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={acting}
                className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                Отклонить
              </button>
              <button
                onClick={() => handleAction('retry')}
                disabled={acting}
                className="px-3 py-1.5 bg-yellow-500 text-white text-xs font-medium rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
              >
                Повторить
              </button>
            </>
          )}
          {upload.status === 'processing' && (
            <div className="flex items-center gap-1.5 text-xs text-purple-600">
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              n8n...
            </div>
          )}
          <button
            onClick={() => handleAction('delete')}
            disabled={acting}
            className="px-3 py-1.5 text-gray-400 hover:text-red-500 text-xs transition-colors disabled:opacity-50"
            title="Удалить"
          >
            <svg className="h-4 w-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
