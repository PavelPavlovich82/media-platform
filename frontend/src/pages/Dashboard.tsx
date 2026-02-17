/**
 * Dashboard Page
 *
 * Main page for authenticated users.
 * Shows uploads and their statuses.
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Личный кабинет</h1>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button onClick={handleLogout} className="btn-secondary text-sm">
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome message */}
        <div className="card mb-8 bg-gradient-to-r from-primary-50 to-blue-50">
          <h2 className="text-2xl font-bold mb-2">Добро пожаловать!</h2>
          <p className="text-gray-700">
            Здесь вы сможете загружать медиа-контент и отслеживать его обработку.
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link to="/upload" className="card hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">📤</div>
            <h3 className="font-semibold text-lg mb-2">Загрузить файл</h3>
            <p className="text-sm text-gray-600">
              Загрузите фото или видео для обработки
            </p>
          </Link>

          <Link to="/upload/text" className="card hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-semibold text-lg mb-2">Текстовый ввод</h3>
            <p className="text-sm text-gray-600">
              Введите текст с клавиатуры
            </p>
          </Link>

          <Link to="/upload/voice" className="card hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">🎤</div>
            <h3 className="font-semibold text-lg mb-2">Голосовой ввод</h3>
            <p className="text-sm text-gray-600">
              Запишите голосовое сообщение
            </p>
          </Link>
        </div>

        {/* Uploads section (placeholder) */}
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Ваши загрузки</h3>

          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-600 mb-4">
              У вас пока нет загрузок
            </p>
            <Link to="/upload" className="btn-primary">
              Загрузить первый файл
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
