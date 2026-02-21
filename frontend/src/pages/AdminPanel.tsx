/**
 * Admin Panel
 *
 * Allows admin to:
 * - View all registered users
 * - Select a user and trigger n8n generation on their behalf
 * - View all uploads across all users
 */

import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadService } from '../services/uploadService';
import { triggerN8nWorkflow } from '../services/n8nService';
import { UploadCard } from '../components/dashboard/UploadCard';
import type { Upload } from '../types';

const ADMIN_EMAIL = 'admin@media.com';

// ============================================================================
// Types
// ============================================================================

interface StoredUser {
  id: string;
  email: string;
  createdAt: string;
}

// ============================================================================
// Helpers
// ============================================================================

const getAllUsers = (): StoredUser[] => {
  const data = localStorage.getItem('registered_users');
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const getAllUploads = (): Upload[] => {
  const data = localStorage.getItem('uploads');
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

// ============================================================================
// Component
// ============================================================================

export const AdminPanel: React.FC = () => {
  const { user, logout } = useAuth();

  const [users, setUsers] = useState<StoredUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userUploads, setUserUploads] = useState<Upload[]>([]);
  const [allUploads, setAllUploads] = useState<Upload[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [triggerSuccess, setTriggerSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trigger' | 'all'>('trigger');

  // Redirect non-admin
  if (user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    const u = getAllUsers();
    setUsers(u);
    setAllUploads(getAllUploads());
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setUserUploads([]);
      return;
    }
    const uploads = getAllUploads().filter((u) => u.userId === selectedUserId);
    setUserUploads(uploads);
  }, [selectedUserId]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  // Group user's uploads by type for n8n payload
  const getN8nPayloadForUser = () => {
    const photos = userUploads
      .filter((u) => u.contentType === 'photo' && u.cloudinarySecureUrl)
      .map((u) => ({ url: u.cloudinarySecureUrl!, name: u.originalFilename }));

    const videos = userUploads
      .filter((u) => u.contentType === 'video' && u.cloudinarySecureUrl)
      .map((u) => ({ url: u.cloudinarySecureUrl!, name: u.originalFilename }));

    const textUpload = userUploads.find((u) => u.contentType === 'text' && u.textContent);

    return { photos, videos, text: textUpload?.textContent || '' };
  };

  const handleTriggerN8n = async () => {
    if (!selectedUser) return;

    const { photos, videos, text } = getN8nPayloadForUser();

    if (photos.length === 0 && videos.length === 0) {
      setTriggerError('У пользователя нет загруженных фото или видео');
      return;
    }

    setTriggering(true);
    setTriggerError(null);
    setTriggerSuccess(null);

    try {
      // Create a batch record attributed to the selected user
      const batchUpload = await uploadService.createUpload({
        contentType: 'photo',
        textContent: text || undefined,
      });

      // Override userId to selected user
      const uploads = getAllUploads();
      const idx = uploads.findIndex((u) => u.id === batchUpload.id);
      if (idx !== -1) {
        uploads[idx].userId = selectedUser.id;
        localStorage.setItem('uploads', JSON.stringify(uploads));
      }

      await triggerN8nWorkflow({
        uploadId: batchUpload.id,
        userName: selectedUser.email.split('@')[0],
        userEmail: selectedUser.email,
        photos,
        videos,
        text,
        count_image: photos.length,
        count_video: videos.length,
      });

      await uploadService.markN8nTriggered(batchUpload.id);

      setTriggerSuccess(
        `Запущена генерация для ${selectedUser.email}: ${photos.length} фото, ${videos.length} видео`
      );
      setAllUploads(getAllUploads());
    } catch (err: any) {
      setTriggerError(err.message || 'Ошибка запуска n8n');
    } finally {
      setTriggering(false);
    }
  };

  const handleDecision = async (uploadId: string, decision: 'approve' | 'reject' | 'retry') => {
    await uploadService.submitDecision(uploadId, decision);
    setAllUploads(getAllUploads());
    setUserUploads(getAllUploads().filter((u) => u.userId === selectedUserId));
  };

  const handleDelete = async (uploadId: string) => {
    await uploadService.deleteUpload(uploadId);
    setAllUploads(getAllUploads());
    setUserUploads(getAllUploads().filter((u) => u.userId === selectedUserId));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-orange-400">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Панель администратора</h1>
              <p className="text-xs text-orange-600 font-medium">Admin Access</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="btn-secondary text-sm">
              Мой кабинет
            </Link>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('trigger')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'trigger'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Запуск генерации
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Все загрузки ({allUploads.length})
          </button>
        </div>

        {/* Tab: Trigger */}
        {activeTab === 'trigger' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* User selection */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Выбор пользователя</h2>

              {users.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет зарегистрированных пользователей</p>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => {
                    const uploadCount = getAllUploads().filter((up) => up.userId === u.id).length;
                    return (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left ${
                          selectedUserId === u.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <p className="font-medium text-sm">{u.email}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(u.createdAt).toLocaleDateString('ru')}
                          </p>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {uploadCount} загр.
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Trigger panel */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Запуск n8n генерации</h2>

              {!selectedUser ? (
                <p className="text-gray-400 text-sm">Выберите пользователя слева</p>
              ) : (
                <div>
                  <div className="p-3 bg-gray-50 rounded-lg mb-4">
                    <p className="text-sm font-medium text-gray-700">Пользователь:</p>
                    <p className="text-primary-600 font-semibold">{selectedUser.email}</p>
                  </div>

                  {/* Payload preview */}
                  {(() => {
                    const { photos, videos, text } = getN8nPayloadForUser();
                    return (
                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                          <span className="text-blue-700">Фото</span>
                          <span className="font-bold text-blue-900">{photos.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                          <span className="text-purple-700">Видео</span>
                          <span className="font-bold text-purple-900">{videos.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <span className="text-green-700">Текст</span>
                          <span className="font-bold text-green-900">{text ? '✓' : '—'}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                          <span className="text-orange-700">Switch ветка</span>
                          <span className="font-bold text-orange-900">
                            {photos.length}_{videos.length}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {triggerSuccess && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                      {triggerSuccess}
                    </div>
                  )}

                  {triggerError && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {triggerError}
                    </div>
                  )}

                  <button
                    onClick={handleTriggerN8n}
                    disabled={triggering}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {triggering ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Запуск...
                      </span>
                    ) : (
                      `Запустить генерацию для ${selectedUser.email.split('@')[0]}`
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* User uploads preview */}
            {selectedUser && userUploads.length > 0 && (
              <div className="lg:col-span-2 card">
                <h3 className="font-semibold mb-3">
                  Загрузки пользователя {selectedUser.email}
                </h3>
                <div className="space-y-2">
                  {userUploads.map((upload) => (
                    <UploadCard
                      key={upload.id}
                      upload={upload}
                      onDecision={handleDecision}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: All uploads */}
        {activeTab === 'all' && (
          <div>
            <div className="space-y-3">
              {allUploads.length === 0 ? (
                <div className="card text-center py-12 text-gray-400">Нет загрузок</div>
              ) : (
                allUploads.map((upload) => {
                  const owner = users.find((u) => u.id === upload.userId);
                  return (
                    <div key={upload.id}>
                      {owner && (
                        <p className="text-xs text-gray-500 mb-1 ml-1">
                          Пользователь: <span className="font-medium">{owner.email}</span>
                        </p>
                      )}
                      <UploadCard
                        upload={upload}
                        onDecision={handleDecision}
                        onDelete={handleDelete}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
