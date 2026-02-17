/**
 * Home Page
 *
 * Landing page for unauthenticated users.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Медиа-платформа
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Загружайте и обрабатывайте медиа-контент с помощью AI
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary text-lg px-8 py-3">
                Перейти в кабинет
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary text-lg px-8 py-3">
                  Начать работу
                </Link>
                <Link to="/login" className="btn-secondary text-lg px-8 py-3">
                  Войти
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="card text-center">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="font-semibold text-lg mb-2">Фото и видео</h3>
            <p className="text-gray-600 text-sm">
              Загружайте медиа-файлы в облачное хранилище
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="font-semibold text-lg mb-2">Голосовой ввод</h3>
            <p className="text-gray-600 text-sm">
              Записывайте голосовые сообщения с AI транскрипцией
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="font-semibold text-lg mb-2">AI обработка</h3>
            <p className="text-gray-600 text-sm">
              Автоматическая обработка через n8n workflows
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="font-semibold text-lg mb-2">Контроль</h3>
            <p className="text-gray-600 text-sm">
              Одобряйте или отклоняйте результаты обработки
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="card bg-white">
          <h2 className="text-2xl font-bold mb-6 text-center">Как это работает</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">Загрузите контент</h4>
                <p className="text-gray-600 text-sm">
                  Выберите фото, видео или запишите голосовое сообщение
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Автоматическая обработка</h4>
                <p className="text-gray-600 text-sm">
                  Система обработает ваш контент через n8n workflow
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Просмотрите результат</h4>
                <p className="text-gray-600 text-sm">
                  Получите промежуточный результат в личном кабинете
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h4 className="font-semibold mb-1">Примите решение</h4>
                <p className="text-gray-600 text-sm">
                  Одобрите, отклоните или повторите обработку
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
