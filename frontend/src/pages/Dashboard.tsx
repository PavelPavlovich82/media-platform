/**
 * Dashboard Page
 *
 * Main page for authenticated users.
 * Shows uploads and their statuses with action buttons.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { uploadService } from '../services/uploadService';
import {
  getRenderResult,
  triggerVideoPublishedWebhook,
} from '../services/n8nService';
import { UploadCard } from '../components/dashboard/UploadCard';
import type { Upload } from '../types';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const loadUploads = useCallback(async () => {
    try {
      const result = await uploadService.getUserUploads(
        filter !== 'all' ? { status: filter } : undefined
      );
      // Never show pending items in Dashboard — they belong to "Готовое" once processed
      setUploads(result.data.filter((u) => u.status !== 'pending'));
    } catch (err) {
      console.error('Failed to load uploads:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Poll n8n for render results — with 6-min start delay and max 10 checks
  const pollN8nResults = useCallback(async (currentUploads: Upload[]) => {
    const STALE_TIMEOUT_MS = 30 * 60 * 1000; // 30 min → auto-fail
    const MIN_DELAY_MS = 6 * 60 * 1000; // wait 6 min after first POST trigger
    const MAX_POLL_ATTEMPTS = 10;
    const now = Date.now();

    const processing = currentUploads.filter(
      (u) => u.status === 'processing' && u.triggeredN8n && !u.renderUrl
    );

    for (const upload of processing) {
      const triggerTime = upload.n8nTriggeredAt ?? upload.createdAt;
      const age = now - new Date(triggerTime).getTime();
      const attempts = upload.n8nPollAttempts ?? 0;

      // Auto-fail after 30 min
      if (age > STALE_TIMEOUT_MS) {
        await uploadService.markFailed(upload.id, 'Нет ответа от обработчика (таймаут 30 мин)');
        continue;
      }

      // Wait at least 3 minutes before first poll — n8n + Creatomate need time
      if (age < MIN_DELAY_MS) continue;

      if (attempts >= MAX_POLL_ATTEMPTS) {
        await uploadService.markFailed(upload.id, '����� �� �������: ���������� 10 �������� webhook');
        continue;
      }

      try {
        await uploadService.incrementN8nPollAttempt(upload.id);
        const uploadDate = upload.createdAt.split('T')[0];
        const result = await getRenderResult(upload.id, upload.targetName, uploadDate);
        if (result.renderUrl) {
          await uploadService.setRenderResult(upload.id, result.renderUrl);
          const posterUrl = upload.uploadedPhotos?.[0]?.secureUrl || upload.uploadedPhotos?.[0]?.url;

          const publishOk = await triggerVideoPublishedWebhook({
            uploadId: upload.id,
            userName: upload.targetName,
            userEmail: user?.email || '',
            serviceSlug: upload.serviceSlug,
            teamSlug: upload.teamSlug,
            serviceName: upload.serviceName,
            teamName: upload.teamName,
            renderUrl: result.renderUrl,
            posterUrl,
            thumbnailUrl: posterUrl,
            createdAt: new Date().toISOString(),
          });
          if (publishOk) {
            await uploadService.markPublishWebhookTriggered(upload.id);
          }
          await loadUploads();
        }
      } catch {
        // silent
      }
    }

    // Retry send for already received links if webhook wasn't marked as sent before
    const withRenderNoWebhook = currentUploads.filter(
      (u) => !!u.renderUrl && !u.publishWebhookTriggeredAt
    );

    for (const upload of withRenderNoWebhook) {
      try {
        const posterUrl = upload.uploadedPhotos?.[0]?.secureUrl || upload.uploadedPhotos?.[0]?.url;
        const publishOk = await triggerVideoPublishedWebhook({
          uploadId: upload.id,
          userName: upload.targetName,
          userEmail: user?.email || '',
          serviceSlug: upload.serviceSlug,
          teamSlug: upload.teamSlug,
          serviceName: upload.serviceName,
          teamName: upload.teamName,
          renderUrl: upload.renderUrl!,
          posterUrl,
          thumbnailUrl: posterUrl,
          createdAt: upload.updatedAt,
        });
        if (publishOk) {
          await uploadService.markPublishWebhookTriggered(upload.id);
        }
      } catch {
        // silent
      }
    }
  }, [loadUploads, user?.email]);

  useEffect(() => {
    loadUploads();

    // UI refresh every 15 sec
    const uiInterval = setInterval(loadUploads, 15000);

    // n8n poll every 30 sec (6-min delay + max 10 checks enforced inside pollN8nResults)
    const pollInterval = setInterval(async () => {
      const result = await uploadService.getUserUploads();
      await pollN8nResults(result.data);
    }, 30000);

    return () => {
      clearInterval(uiInterval);
      clearInterval(pollInterval);
    };
  }, [loadUploads, pollN8nResults]);

  const handleDelete = async (uploadId: string) => {
    await uploadService.deleteUpload(uploadId);
    await loadUploads();
  };

  const handleDeleteAll = async () => {
    await uploadService.deleteAllUserUploads();
    await loadUploads();
  };

  const handleRenderReady = async (uploadId: string) => {
    await uploadService.setRenderReady(uploadId);
    await loadUploads();
  };

  const handleLogout = async () => {
    await logout();
  };

  // Stats
  const stats = {
    total: uploads.length,
    pending: uploads.filter((u) => u.status === 'pending' || u.status === 'processing').length,
    completed: uploads.filter((u) => u.status === 'approved' || u.status === 'completed').length,
    rejected: uploads.filter((u) => u.status === 'rejected').length,
  };

  const filters = [
    { key: 'all', label: 'Все', count: stats.total },
    { key: 'processing', label: 'В обработке' },
    { key: 'approved', label: 'Одобрено' },
    { key: 'rejected', label: 'Отклонено' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Личный кабинет</h1>
            <Link
              to="/ready"
              className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              Готовое
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.email}</span>
            {user?.email === 'admin@media.com' && (
              <Link
                to="/admin"
                className="px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                Админ панель
              </Link>
            )}
            <button onClick={handleLogout} className="btn-secondary text-sm">
              Выйти
            </button>
          </div>
        </div>
      </header>


      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">Всего загрузок</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-gray-500">В обработке</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-gray-500">Завершено</p>
          </div>
        </div>

        {/* New upload button */}
        <div className="hidden">
          <Link
            to="/upload?mode=video"
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Новая загрузка
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            to="/upload?mode=video"
            className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-lg font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Видео
          </Link>
          <Link
            to="/upload?mode=article"
            className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-lg font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            Статьи
          </Link>
          <Link
            to="/upload?mode=avatar"
            className="inline-flex items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-lg font-semibold text-cyan-700 hover:bg-cyan-100 transition-colors"
          >
            Аватар
          </Link>
        </div>

        {/* Filters + clear all */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setLoading(true);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  filter === f.key ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}

          {uploads.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="ml-auto px-3 py-1.5 rounded-full text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Очистить всё
            </button>
          )}
        </div>

        {/* Uploads list */}
        {loading ? (
          <div className="text-center py-12">
            <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-500">Загрузка...</p>
          </div>
        ) : uploads.length === 0 ? (
          <div className="card text-center py-12">
            <svg className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-600 mb-4">
              {filter === 'all' ? 'У вас пока нет загрузок' : 'Нет загрузок с таким статусом'}
            </p>
            <Link to="/upload?mode=video" className="btn-primary">
              Загрузить первый файл
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {uploads.map((upload) => (
              <UploadCard
                key={upload.id}
                upload={upload}
                onDelete={handleDelete}
                onRenderReady={handleRenderReady}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

