/**
 * Text Input Component
 *
 * Allows users to submit text content for processing.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadService } from '../../services/uploadService';
import { useAuth } from '../../contexts/AuthContext';

export const TextInput: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxLength = 10000;

  const handleSubmit = async () => {
    const trimmed = text.trim();

    if (!trimmed) {
      setError('Введите текст для отправки');
      return;
    }

    if (trimmed.length < 10) {
      setError('Текст слишком короткий (минимум 10 символов)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await uploadService.createUpload({
        contentType: 'text',
        textContent: trimmed,
      });

      // Redirect to dashboard on success
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Ошибка при отправке текста');
      setSubmitting(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Текстовый ввод</h1>
          </div>
          <div className="text-sm text-gray-600">{user?.email}</div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Введите текст для обработки
          </h2>
          <p className="text-gray-600">
            Текст будет отправлен в n8n для автоматической обработки
          </p>
        </div>

        {/* Text area */}
        <div className="card">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            placeholder="Введите ваш текст здесь..."
            className="input min-h-[200px] resize-y"
            maxLength={maxLength}
            disabled={submitting}
          />

          {/* Character count */}
          <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
            <span>
              {text.length > 0 && text.trim().length < 10 && (
                <span className="text-orange-500">Минимум 10 символов</span>
              )}
            </span>
            <span>
              {text.length} / {maxLength}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit button */}
          <div className="mt-6 flex justify-end gap-3">
            <Link to="/dashboard" className="btn-secondary">
              Отмена
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting || text.trim().length < 10}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Отправка...
                </span>
              ) : (
                'Отправить на обработку'
              )}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 card bg-gradient-to-r from-green-50 to-emerald-50">
          <h3 className="font-semibold text-lg mb-3">Что можно отправить?</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              <span>Описание контента для обработки</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              <span>Инструкции и пожелания</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              <span>Любой текст до {maxLength.toLocaleString()} символов</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
};
