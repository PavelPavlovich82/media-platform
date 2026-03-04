/**
 * Ready Videos Page
 *
 * Shows all uploads that have a render URL (готовое видео).
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { uploadService } from '../services/uploadService';
import { UploadCard } from '../components/dashboard/UploadCard';
import type { Upload } from '../types';

export const ReadyVideos: React.FC = () => {
  const { user, logout } = useAuth();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUploads = useCallback(async () => {
    try {
      const result = await uploadService.getUserUploads();
      // Only show uploads that have a renderUrl
      setUploads(result.data.filter((u) => !!u.renderUrl));
    } catch (err) {
      console.error('Failed to load uploads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUploads();
    const interval = setInterval(loadUploads, 15000);
    return () => clearInterval(interval);
  }, [loadUploads]);

  const handleDelete = async (uploadId: string) => {
    await uploadService.deleteUpload(uploadId);
    await loadUploads();
  };

  const handleRenderReady = async (uploadId: string) => {
    await uploadService.setRenderReady(uploadId);
    await loadUploads();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Готовое</h1>
            <nav className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Все загрузки
              </Link>
              <Link
                to="/upload"
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Новая загрузка
              </Link>
            </nav>
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
        {loading ? (
          <div className="text-center py-12">
            <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-500">Загрузка...</p>
          </div>
        ) : uploads.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
              <svg className="h-10 w-10 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-2">Готовых видео пока нет</p>
            <p className="text-sm text-gray-400 mb-6">
              Загрузите фото или видео — после обработки результат появится здесь
            </p>
            <Link to="/upload" className="btn-primary">
              Загрузить материалы
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
