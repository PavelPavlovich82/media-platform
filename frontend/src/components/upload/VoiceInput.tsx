/**
 * Voice Input Component
 *
 * Records audio via microphone and transcribes it using OpenAI Whisper API.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  startRecording,
  stopRecording,
  transcribeAudio,
  checkMicrophoneAccess,
  formatDuration,
} from '../../services/voiceService';
import { uploadService } from '../../services/uploadService';
import { useAuth } from '../../contexts/AuthContext';

type Stage = 'idle' | 'recording' | 'transcribing' | 'preview' | 'submitting';

export const VoiceInput: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>('idle');
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null);

  const timerRef = useRef<number | null>(null);

  // Check mic on mount
  useEffect(() => {
    checkMicrophoneAccess().then(setMicAvailable);
  }, []);

  // Timer for recording duration
  useEffect(() => {
    if (stage === 'recording') {
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage]);

  const handleStartRecording = async () => {
    setError(null);
    try {
      await startRecording();
      setStage('recording');
    } catch {
      setError('Не удалось получить доступ к микрофону. Проверьте разрешения браузера.');
    }
  };

  const handleStopRecording = async () => {
    setStage('transcribing');
    try {
      const audioBlob = await stopRecording();
      const text = await transcribeAudio(audioBlob);

      if (!text.trim()) {
        setError('Не удалось распознать речь. Попробуйте ещё раз.');
        setStage('idle');
        return;
      }

      setTranscript(text);
      setStage('preview');
    } catch (err: any) {
      setError(err.message || 'Ошибка при распознавании речи');
      setStage('idle');
    }
  };

  const handleSubmit = async () => {
    if (!transcript.trim()) return;

    setStage('submitting');
    setError(null);

    try {
      await uploadService.createUpload({
        contentType: 'voice',
        textContent: transcript.trim(),
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Ошибка при отправке');
      setStage('preview');
    }
  };

  const handleRetry = () => {
    setTranscript('');
    setError(null);
    setStage('idle');
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
            <h1 className="text-2xl font-bold text-gray-900">Голосовой ввод</h1>
          </div>
          <div className="text-sm text-gray-600">{user?.email}</div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Запишите голосовое сообщение
          </h2>
          <p className="text-gray-600">
            Речь будет распознана с помощью OpenAI Whisper и отправлена на обработку
          </p>
        </div>

        {/* Mic not available warning */}
        {micAvailable === false && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Микрофон недоступен. Проверьте, что браузер имеет разрешение на использование микрофона.
          </div>
        )}

        {/* Recording control */}
        <div className="card text-center">
          {/* Idle state */}
          {stage === 'idle' && (
            <div>
              <button
                onClick={handleStartRecording}
                disabled={micAvailable === false}
                className="mx-auto w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
              <p className="mt-4 text-gray-600">Нажмите для начала записи</p>
            </div>
          )}

          {/* Recording state */}
          {stage === 'recording' && (
            <div>
              <button
                onClick={handleStopRecording}
                className="mx-auto w-24 h-24 rounded-full bg-red-500 text-white flex items-center justify-center animate-pulse"
              >
                <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
              <p className="mt-4 text-red-600 font-medium">
                Запись... {formatDuration(duration)}
              </p>
              <p className="mt-1 text-sm text-gray-500">Нажмите для остановки</p>
            </div>
          )}

          {/* Transcribing state */}
          {stage === 'transcribing' && (
            <div>
              <div className="mx-auto w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="animate-spin h-10 w-10 text-purple-600" viewBox="0 0 24 24">
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
              </div>
              <p className="mt-4 text-purple-600 font-medium">Распознавание речи...</p>
              <p className="mt-1 text-sm text-gray-500">
                Обработка записи ({formatDuration(duration)})
              </p>
            </div>
          )}

          {/* Preview state */}
          {stage === 'preview' && (
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Распознанный текст:</h3>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                <p className="text-gray-800 whitespace-pre-wrap">{transcript}</p>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Длительность записи: {formatDuration(duration)}
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={handleRetry} className="btn-secondary">
                  Записать заново
                </button>
                <button onClick={handleSubmit} className="btn-primary">
                  Отправить на обработку
                </button>
              </div>
            </div>
          )}

          {/* Submitting state */}
          {stage === 'submitting' && (
            <div>
              <div className="mx-auto w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="animate-spin h-10 w-10 text-green-600" viewBox="0 0 24 24">
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
              </div>
              <p className="mt-4 text-green-600 font-medium">Отправка...</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-red-800">Ошибка</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 card bg-gradient-to-r from-purple-50 to-pink-50">
          <h3 className="font-semibold text-lg mb-3">Как это работает?</h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Нажмите кнопку и говорите в микрофон</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Остановите запись, когда закончите</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>OpenAI Whisper распознает вашу речь</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span>Проверьте текст и отправьте на обработку</span>
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
};
