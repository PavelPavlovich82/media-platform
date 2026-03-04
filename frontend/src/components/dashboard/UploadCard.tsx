/**
 * Upload Card Component
 *
 * Displays a single upload session: thumbnails of photos/videos, text snippet,
 * processing status, and the rendered video when it arrives.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Upload } from '../../types';
import {
  getUploadStatusLabel,
  getUploadStatusColor,
} from '../../services/uploadService';

interface UploadCardProps {
  upload: Upload;
  onDelete: (uploadId: string) => Promise<void>;
  onRenderReady: (uploadId: string) => Promise<void>;
}

/** Try to load video metadata to confirm the file exists and is playable */
const probeVideoUrl = (url: string): Promise<boolean> =>
  new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const timer = setTimeout(() => { video.src = ''; resolve(false); }, 10000);
    video.onloadedmetadata = () => { clearTimeout(timer); video.src = ''; resolve(true); };
    video.onerror = () => { clearTimeout(timer); video.src = ''; resolve(false); };
    video.src = url;
  });

export const UploadCard: React.FC<UploadCardProps> = ({ upload, onDelete, onRenderReady }) => {
  const [acting, setActing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(upload.renderStatus === 'ready');

  // Poll every 60 sec until the file is accessible at renderUrl
  const probe = useCallback(async () => {
    if (!upload.renderUrl || videoReady) return;
    const ready = await probeVideoUrl(upload.renderUrl);
    if (ready) {
      setVideoReady(true);
      await onRenderReady(upload.id);
    }
  }, [upload.renderUrl, upload.id, videoReady, onRenderReady]);

  useEffect(() => {
    if (!upload.renderUrl || videoReady) return;
    probe();
    const interval = setInterval(probe, 30000);
    return () => clearInterval(interval);
  }, [upload.renderUrl, videoReady, probe]);

  const handleDelete = async () => {
    setActing(true);
    try { await onDelete(upload.id); } finally { setActing(false); }
  };

  const handleCopyLink = async () => {
    if (!upload.renderUrl) return;
    try {
      await navigator.clipboard.writeText(upload.renderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = upload.renderUrl!;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'только что';
    if (mins < 60) return `${mins} мин. назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч. назад`;
    return `${Math.floor(hours / 24)} дн. назад`;
  };

  // Summary line: "3 фото · 2 видео · текст"
  const summaryParts: string[] = [];
  const photoCount = upload.uploadedPhotos?.length ?? 0;
  const videoCount = upload.uploadedVideos?.length ?? 0;
  if (photoCount > 0) summaryParts.push(`${photoCount} фото`);
  if (videoCount > 0) summaryParts.push(`${videoCount} видео`);
  if (upload.textContent) summaryParts.push('текст');
  // fallback for legacy single-file uploads
  if (summaryParts.length === 0) {
    const labels: Record<string, string> = { photo: 'Фото', video: 'Видео', text: 'Текст', voice: 'Голос', mixed: 'Материалы' };
    summaryParts.push(labels[upload.contentType] || upload.contentType);
    if (upload.originalFilename) summaryParts.push(upload.originalFilename);
  }

  const hasRender = !!upload.renderUrl;
  const shareUrl = upload.renderUrl ? encodeURIComponent(upload.renderUrl) : '';

  return (
    <div className="card border border-gray-100 hover:shadow-md transition-shadow">

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Summary + date */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2">
            <span className="font-semibold text-gray-900">
              {summaryParts.join(' · ')}
            </span>
            <span className="text-xs text-gray-400">{timeAgo(upload.createdAt)}</span>
          </div>

          {/* Text snippet */}
          {upload.textContent && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {upload.textContent}
            </p>
          )}

          {/* Status badge */}
          {upload.status !== 'processing' && (
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getUploadStatusColor(upload.status)}`}>
              {getUploadStatusLabel(upload.status)}
            </span>
          )}
        </div>

        {/* Delete + processing spinner */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
          {upload.status === 'processing' && (
            <div className="flex items-center gap-1.5 text-xs text-purple-600">
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Обработка...
            </div>
          )}
          <button
            onClick={handleDelete}
            disabled={acting}
            className="p-1.5 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Удалить"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Photo thumbnails ────────────────────────────────────────────────── */}
      {photoCount > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {upload.uploadedPhotos!.map((photo, i) => (
            <img
              key={i}
              src={photo.secureUrl || photo.url}
              alt={photo.name || `Фото ${i + 1}`}
              className="w-16 h-16 rounded-lg object-cover border border-gray-100"
            />
          ))}
        </div>
      )}

      {/* ── Video thumbnails (placeholder icons for uploaded source videos) ── */}
      {videoCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {upload.uploadedVideos!.map((_, i) => (
            <div
              key={i}
              className="w-16 h-16 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center"
              title={upload.uploadedVideos![i].name}
            >
              <svg className="h-7 w-7 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* ── Legacy single-file thumbnail (old records) ──────────────────────── */}
      {photoCount === 0 && videoCount === 0 && upload.cloudinarySecureUrl && upload.contentType === 'photo' && (
        <div className="mt-2">
          <img src={upload.cloudinarySecureUrl} alt="Photo" className="w-16 h-16 rounded-lg object-cover border border-gray-100" />
        </div>
      )}

      {/* ── Processing placeholder (waiting for n8n URL) ─────────────────── */}
      {upload.status === 'processing' && upload.triggeredN8n && !upload.renderUrl && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-800">Отправлено на обработку</p>
              <p className="text-xs text-blue-500 mt-0.5">n8n обрабатывает данные, ожидаем видео...</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Render video block ───────────────────────────────────────────────── */}
      {hasRender && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          {videoReady ? (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Готовое видео
              </p>
              <video src={upload.renderUrl} controls className="w-full rounded-lg bg-black max-h-64" />

              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setPublishOpen((v) => !v)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {publishOpen ? 'Скрыть' : 'Опубликовать'}
                </button>
                <button
                  disabled
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-400 text-sm font-semibold rounded-lg cursor-not-allowed"
                  title="Будет доступно в следующей версии"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Новая итерация
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 p-5 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 text-purple-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-800">Видео готовится...</p>
                <p className="text-xs text-purple-500 mt-1">Creatomate рендерит файл. Проверяем каждую минуту.</p>
              </div>
              <a href={upload.renderUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-purple-400 hover:text-purple-600 underline truncate max-w-full">
                {upload.renderUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Publish panel ────────────────────────────────────────────────────── */}
      {publishOpen && hasRender && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Поделиться:</p>
          <div className="flex flex-wrap gap-2">

            <a href={upload.renderUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-white text-xs font-medium rounded-lg hover:bg-gray-900 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Скачать MP4
            </a>

            <button onClick={handleCopyLink}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                copied ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}>
              {copied ? (
                <><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Скопировано!</>
              ) : (
                <><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Копировать ссылку</>
              )}
            </button>

            <a href={`https://t.me/share/url?url=${shareUrl}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#2AABEE] text-white text-xs font-medium rounded-lg hover:bg-[#1a9bd8] transition-colors">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.065 13.55l-2.967-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.836.95l.254.059z"/>
              </svg>
              Telegram
            </a>

            <a href={`https://vk.com/share.php?url=${shareUrl}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0077FF] text-white text-xs font-medium rounded-lg hover:bg-[#0066dd] transition-colors">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-.847-1.49.285v1.442h-1.046c-2.9 0-5.133-1.795-5.133-5.04 0-3.248 2.233-5.04 5.133-5.04h1.046v1.44c0 1.133.46 1.297 1.49.285 1.19-1.2 1.39-1.727 2.05-1.727h1.744c.93 0 1.05.475.393 1.576-.927 1.543-1.205 1.96-.285 3.248.92 1.287 1.205 1.596 1.617 2.08.786.936.27 1.178-.725 1.178z"/>
              </svg>
              VK
            </a>

            <a href={`https://wa.me/?text=${shareUrl}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#25D366] text-white text-xs font-medium rounded-lg hover:bg-[#1dba56] transition-colors">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>

            <a href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FF0000] text-white text-xs font-medium rounded-lg hover:bg-[#cc0000] transition-colors">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              YouTube Studio ↗
            </a>

          </div>
        </div>
      )}
    </div>
  );
};
