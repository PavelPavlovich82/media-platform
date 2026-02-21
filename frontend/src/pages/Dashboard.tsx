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
import { getRenderResult } from '../services/n8nService';
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
      setUploads(result.data);
    } catch (err) {
      console.error('Failed to load uploads:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Poll n8n for render results of "processing" uploads
  const pollN8nResults = useCallback(async (currentUploads: Upload[]) => {
    const processing = currentUploads.filter(
      (u) => u.status === 'processing' && u.triggeredN8n
    );
    for (const upload of processing) {
      try {
        const result = await getRenderResult(upload.id);
        if (result.renderUrl) {
          await uploadService.setRenderResult(upload.id, result.renderUrl);
        }
      } catch {
        // silent
      }
    }
  }, []);

  useEffect(() => {
    loadUploads();
    const interval = setInterval(async () => {
      await loadUploads();
      // also poll n8n
      const result = await uploadService.getUserUploads();
      await pollN8nResults(result.data);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadUploads, pollN8nResults]);

  const handleDecision = async (uploadId: string, decision: 'approve' | 'reject' | 'retry') => {
    await uploadService.submitDecision(uploadId, decision);
    await loadUploads();
  };

  const handleDelete = async (uploadId: string) => {
    await uploadService.deleteUpload(uploadId);
    await loadUploads();
  };

  const handleLogout = async () => {
    await logout();
  };

  // Stats
  const stats = {
    total: uploads.length,
    pending: uploads.filter((u) => u.status === 'pending' || u.status === 'processing').length,
    awaiting: uploads.filter((u) => u.status === 'awaiting_decision').length,
    completed: uploads.filter((u) => u.status === 'approved' || u.status === 'completed').length,
    rejected: uploads.filter((u) => u.status === 'rejected').length,
  };

  const filters = [
    { key: 'all', label: 'Все', count: stats.total },
    { key: 'pending', label: 'В очереди' },
    { key: 'processing', label: 'В обработке' },
    { key: 'awaiting_decision', label: 'Требуют решения', count: stats.awaiting },
    { key: 'approved', label: 'Одобрено' },
    { key: 'rejected', label: 'Отклонено' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Личный кабинет</h1>

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
            <p className="text-3xl font-bold text-orange-600">{stats.awaiting}</p>
            <p className="text-sm text-gray-500">Ждут решения</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-gray-500">Завершено</p>
          </div>
        </div>

        {/* New upload button */}
        <div className="mb-6">
          <Link
            to="/upload"
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Новая загрузка
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
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
            <Link to="/upload" className="btn-primary">
              Загрузить первый файл
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {uploads.map((upload) => (
              <UploadCard
                key={upload.id}
                upload={upload}
                onDecision={handleDecision}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
