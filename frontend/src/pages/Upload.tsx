/**
 * Upload Page
 *
 * Page for uploading photos and videos.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { FileUploader } from '../components/upload/FileUploader';
import { useAuth } from '../contexts/AuthContext';

export const Upload: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Загрузка файла</h1>
          </div>

          <div className="text-sm text-gray-600">{user?.email}</div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Instructions */}
        <div className="mb-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Загрузите фото или видео
          </h2>
          <p className="text-gray-600">
            Файл будет автоматически отправлен на обработку в n8n
          </p>
        </div>

        {/* File uploader */}
        <FileUploader />

        {/* Additional info */}
        <div className="mt-12 card bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="font-semibold text-lg mb-3">Что происходит после загрузки?</h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Файл загружается в облачное хранилище Cloudinary</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Данные отправляются в n8n для автоматической обработки</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>Вы получите уведомление когда результат будет готов</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span>В личном кабинете сможете одобрить или отклонить результат</span>
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
};
