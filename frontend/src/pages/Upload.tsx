/**
 * Upload Page
 *
 * Unified upload form: 5 photo slots, 5 video slots, text with voice input.
 * All fields are optional.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { uploadToCloudinary, validateFile, formatFileSize } from '../services/cloudinaryService';
import {
  startRecording,
  stopRecording,
  transcribeAudio,
  formatDuration,
} from '../services/voiceService';
import { uploadService } from '../services/uploadService';
import { triggerN8nWorkflow } from '../services/n8nService';
import { config } from '../config/env';
import { useAuth } from '../contexts/AuthContext';
import { WP_SERVICE_CATEGORIES } from '../constants/wpCategories';

// ============================================================================
// Types
// ============================================================================

interface FileSlot {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  progress: number;
  error: string | null;
  uploaded: boolean;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  cloudinarySecureUrl?: string;
}

type FormMode = 'video' | 'article' | 'avatar';

const emptySlot = (): FileSlot => ({
  file: null,
  preview: null,
  uploading: false,
  progress: 0,
  error: null,
  uploaded: false,
});

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;

// ============================================================================
// Component
// ============================================================================

export const Upload: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') || 'video') as FormMode;
  const [formMode, setFormMode] = useState<FormMode>(
    initialMode === 'article' || initialMode === 'avatar' ? initialMode : 'video'
  );

  const defaultService = WP_SERVICE_CATEGORIES[0];
  const defaultTeam = defaultService?.teams[0];

  const [selectedServiceSlug, setSelectedServiceSlug] = useState<string>(
    defaultService?.slug || ''
  );
  const [selectedTeamSlug, setSelectedTeamSlug] = useState<string>(
    defaultTeam?.slug || ''
  );

  const selectedService = useMemo(
    () =>
      WP_SERVICE_CATEGORIES.find(
        (service) => service.slug === selectedServiceSlug
      ) || WP_SERVICE_CATEGORIES[0],
    [selectedServiceSlug]
  );

  const availableTeams = selectedService?.teams || [];

  const selectedTeam = useMemo(
    () =>
      availableTeams.find((team) => team.slug === selectedTeamSlug) ||
      availableTeams[0],
    [availableTeams, selectedTeamSlug]
  );

  // 5 photo slots
  const [photos, setPhotos] = useState<FileSlot[]>(
    Array.from({ length: 5 }, () => emptySlot())
  );

  // 5 video slots
  const [videos, setVideos] = useState<FileSlot[]>(
    Array.from({ length: 5 }, () => emptySlot())
  );

  // Text + voice
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // File input refs
  const photoRefs = useRef<(HTMLInputElement | null)[]>([]);
  const videoRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      timerRef.current = window.setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Keep selected team valid when parent category changes.
  useEffect(() => {
    if (!availableTeams.some((team) => team.slug === selectedTeamSlug)) {
      setSelectedTeamSlug(availableTeams[0]?.slug || '');
    }
  }, [availableTeams, selectedTeamSlug]);

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'video' || mode === 'article' || mode === 'avatar') {
      setFormMode(mode);
      return;
    }
    setSearchParams({ mode: 'video' }, { replace: true });
    setFormMode('video');
  }, [searchParams, setSearchParams]);

  const modeTitle =
    formMode === 'video' ? 'Видео' : formMode === 'article' ? 'Статьи' : 'Аватар';
  const showVoiceInput = formMode === 'video';

  // ============================================================================
  // File handlers
  // ============================================================================

  const handleFileSelect = useCallback(
    (type: 'photo' | 'video', index: number, file: File | null) => {
      if (!file) return;

      const allowedTypes =
        type === 'photo'
          ? config.app.allowedImageTypes
          : config.app.allowedVideoTypes;

      if (!allowedTypes.includes(file.type)) {
        const setter = type === 'photo' ? setPhotos : setVideos;
        setter((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...emptySlot(),
            error: `Неподдерживаемый формат. Допустимые: ${
              type === 'photo' ? 'JPG, PNG, GIF, WebP' : 'MP4, WebM, MOV'
            }`,
          };
          return updated;
        });
        return;
      }

      const validation = validateFile(file);
      if (!validation.valid) {
        const setter = type === 'photo' ? setPhotos : setVideos;
        setter((prev) => {
          const updated = [...prev];
          updated[index] = { ...emptySlot(), error: validation.error || 'Невалидный файл' };
          return updated;
        });
        return;
      }

      // Create preview
      const preview = URL.createObjectURL(file);

      const setter = type === 'photo' ? setPhotos : setVideos;
      setter((prev) => {
        const updated = [...prev];
        updated[index] = { ...emptySlot(), file, preview };
        return updated;
      });
    },
    []
  );

  const removeFile = useCallback((type: 'photo' | 'video', index: number) => {
    const setter = type === 'photo' ? setPhotos : setVideos;
    setter((prev) => {
      const updated = [...prev];
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview!);
      }
      updated[index] = emptySlot();
      return updated;
    });
  }, []);

  // ============================================================================
  // Voice recording
  // ============================================================================

  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setIsTranscribing(true);
      try {
        const audioBlob = await stopRecording();
        const transcribed = await transcribeAudio(audioBlob);
        if (transcribed.trim()) {
          setText((prev) => (prev ? prev + ' ' + transcribed : transcribed));
        }
      } catch (err: unknown) {
        setSubmitError(getErrorMessage(err, 'Ошибка распознавания речи'));
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Start recording
      setSubmitError(null);
      try {
        await startRecording();
        setIsRecording(true);
      } catch {
        setSubmitError('Не удалось получить доступ к микрофону');
      }
    }
  };

  // ============================================================================
  // Submit
  // ============================================================================

  const handleSubmit = async () => {
    const hasPhotos = photos.some((s) => s.file);
    const hasVideos = videos.some((s) => s.file);
    const hasText = text.trim().length > 0;

    if (!hasPhotos && !hasVideos && !hasText) {
      setSubmitError('Добавьте хотя бы одно фото, видео или текст');
      return;
    }

      const safeServiceSlug = selectedService?.slug || '';
      const safeTeamSlug = selectedTeam?.slug || '';
      const safeTargetName = selectedTeam?.label || '';
      const safeServiceName = selectedService?.label || '';
      const safeTeamName = selectedTeam?.label || '';

    if (!safeServiceSlug) {
      setSubmitError('Выберите дисциплину');
      return;
    }

    if (!safeTeamSlug || !safeTargetName) {
      setSubmitError('Выберите, от чьего имени загружаются материалы');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // ── 1. Upload all files to Cloudinary ──────────────────────────────────
      const uploadedPhotos: { url: string; secureUrl?: string; name?: string }[] = [];
      const uploadedVideos: { url: string; secureUrl?: string; name?: string }[] = [];
      const uploadErrors: string[] = [];

      // Photos
      for (let i = 0; i < photos.length; i++) {
        const slot = photos[i];
        if (!slot.file) continue;

        if (slot.uploaded && slot.cloudinaryUrl) {
          uploadedPhotos.push({
            url: slot.cloudinaryUrl,
            secureUrl: slot.cloudinarySecureUrl,
            name: slot.file.name,
          });
          continue;
        }

        setPhotos((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], uploading: true, progress: 0, error: null };
          return updated;
        });

        try {
          const result = await uploadToCloudinary({
            file: slot.file,
            onProgress: (percent) => {
              setPhotos((prev) => {
                const updated = [...prev];
                updated[i] = { ...updated[i], progress: percent };
                return updated;
              });
            },
          });
          uploadedPhotos.push({ url: result.url, secureUrl: result.secure_url, name: slot.file.name });
          setPhotos((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], uploading: false, uploaded: true, progress: 100,
              cloudinaryUrl: result.url, cloudinaryPublicId: result.public_id, cloudinarySecureUrl: result.secure_url };
            return updated;
          });
        } catch (err: unknown) {
          const message = getErrorMessage(err, 'Photo upload failed');
          uploadErrors.push(`Photo ${i + 1}: ${message}`);
          setPhotos((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], uploading: false, error: message };
            return updated;
          });
        }
      }

      // Videos
      for (let i = 0; i < videos.length; i++) {
        const slot = videos[i];
        if (!slot.file) continue;

        if (slot.uploaded && slot.cloudinaryUrl) {
          uploadedVideos.push({
            url: slot.cloudinaryUrl,
            secureUrl: slot.cloudinarySecureUrl,
            name: slot.file.name,
          });
          continue;
        }

        setVideos((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], uploading: true, progress: 0, error: null };
          return updated;
        });

        try {
          const result = await uploadToCloudinary({
            file: slot.file,
            onProgress: (percent) => {
              setVideos((prev) => {
                const updated = [...prev];
                updated[i] = { ...updated[i], progress: percent };
                return updated;
              });
            },
          });
          uploadedVideos.push({ url: result.url, secureUrl: result.secure_url, name: slot.file.name });
          setVideos((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], uploading: false, uploaded: true, progress: 100,
              cloudinaryUrl: result.url, cloudinaryPublicId: result.public_id, cloudinarySecureUrl: result.secure_url };
            return updated;
          });
        } catch (err: unknown) {
          const message = getErrorMessage(err, 'Video upload failed');
          uploadErrors.push(`Video ${i + 1}: ${message}`);
          setVideos((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], uploading: false, error: message };
            return updated;
          });
        }
      }

      // ── 2. Create ONE session record ────────────────────────────────────────
      if (uploadErrors.length > 0) {
        throw new Error(uploadErrors.join('\n'));
      }

      if ((hasPhotos || hasVideos) && uploadedPhotos.length + uploadedVideos.length === 0) {
        throw new Error('Selected files were not uploaded. Please try again.');
      }

      const gotPhotos = uploadedPhotos.length > 0;
      const gotVideos = uploadedVideos.length > 0;
      const contentType =
        formMode === 'article'
          ? 'article'
          : formMode === 'avatar'
          ? 'avatar'
          : gotPhotos && gotVideos ? 'mixed' : gotPhotos ? 'photo' : gotVideos ? 'video' : 'text';

      const session = await uploadService.createUpload({
        contentType,
        targetName: safeTargetName,
        serviceSlug: safeServiceSlug,
        teamSlug: safeTeamSlug,
        serviceName: safeServiceName,
        teamName: safeTeamName,
        textContent: hasText ? text.trim() : undefined,
        uploadedPhotos: gotPhotos ? uploadedPhotos : undefined,
        uploadedVideos: gotVideos ? uploadedVideos : undefined,
      });

      // ── 3. Trigger n8n — send photos/videos/text together in one request ──
      await uploadService.markN8nTriggered(session.id);

      const n8nCalls: Promise<import('../services/n8nService').N8nTriggerResult>[] = [];
      const totalImageCount = uploadedPhotos.length;
      const totalVideoCount = uploadedVideos.length;
      const sharedText = hasText ? text.trim() : '';
      const normalizedPhotos = uploadedPhotos.map((p) => ({ url: p.secureUrl || p.url, name: p.name }));
      const normalizedVideos = uploadedVideos.map((v) => ({ url: v.secureUrl || v.url, name: v.name }));

      if (gotPhotos) {
        n8nCalls.push(triggerN8nWorkflow({
          uploadId: session.id,
          userName: safeTargetName,
          userEmail: user?.email || '',
          serviceSlug: safeServiceSlug,
          teamSlug: safeTeamSlug,
          formType: formMode,
          type: 'image',
          photos: normalizedPhotos,
          videos: [],
          text: '',
          count_image: totalImageCount,
          count_video: 0,
        }));
      }

      if (gotVideos) {
        n8nCalls.push(triggerN8nWorkflow({
          uploadId: session.id,
          userName: safeTargetName,
          userEmail: user?.email || '',
          serviceSlug: safeServiceSlug,
          teamSlug: safeTeamSlug,
          formType: formMode,
          type: 'video',
          photos: [],
          videos: normalizedVideos,
          text: '',
          count_image: 0,
          count_video: totalVideoCount,
        }));
      }

      if (hasText) {
        n8nCalls.push(triggerN8nWorkflow({
          uploadId: session.id,
          userName: safeTargetName,
          userEmail: user?.email || '',
          serviceSlug: safeServiceSlug,
          teamSlug: safeTeamSlug,
          formType: formMode,
          type: 'text',
          photos: [],
          videos: [],
          text: sharedText,
          count_image: 0,
          count_video: 0,
        }));
      }

      // Fire n8n calls in background — navigate immediately, save URL when response arrives
      const sessionId = session.id;
      Promise.all(n8nCalls)
        .then(async (results) => {
          const withUrl = results.find((r) => r.renderUrl);
          if (withUrl?.renderUrl) {
            await uploadService.setRenderResult(
              sessionId,
              withUrl.renderUrl,
              withUrl.renderStatus ?? 'rendering'
            );
          }
        })
        .catch((err) => console.error('[Upload] n8n background error:', err));

      setSubmitSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Ошибка при отправке'));
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================================
  // Render helpers
  // ============================================================================

  const renderFileSlot = (
    type: 'photo' | 'video',
    index: number,
    slot: FileSlot,
    refs: React.RefObject<(HTMLInputElement | null)[]>
  ) => {
    const accept = type === 'photo' ? 'image/jpeg,image/png,image/gif,image/webp' : 'video/mp4,video/webm,video/quicktime';
    const label = type === 'photo' ? 'Фото' : 'Видео';
    const icon =
      type === 'photo' ? (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ) : (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      );

    return (
      <div key={`${type}-${index}`} className="relative">
        <input
          ref={(el) => { refs.current[index] = el; }}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFileSelect(type, index, e.target.files?.[0] || null)}
          disabled={submitting}
        />

        {/* Empty slot */}
        {!slot.file && !slot.error && (
          <button
            onClick={() => refs.current[index]?.click()}
            disabled={submitting}
            className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {icon}
            <span className="text-xs font-medium">
              {label} {index + 1}
            </span>
          </button>
        )}

        {/* Error slot */}
        {!slot.file && slot.error && (
          <div className="w-full aspect-square rounded-xl border-2 border-red-300 bg-red-50 flex flex-col items-center justify-center gap-2 p-2">
            <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-red-600 text-center leading-tight">{slot.error}</p>
            <button
              onClick={() => removeFile(type, index)}
              className="text-xs text-red-500 underline"
            >
              Закрыть
            </button>
          </div>
        )}

        {/* File selected / uploading / uploaded */}
        {slot.file && (
          <div className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-gray-200 group">
            {/* Preview */}
            {type === 'photo' && slot.preview && (
              <img
                src={slot.preview}
                alt={slot.file.name}
                className="w-full h-full object-cover"
              />
            )}
            {type === 'video' && slot.preview && (
              <video
                src={slot.preview}
                className="w-full h-full object-cover"
                muted
              />
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
              {/* Remove button */}
              {!slot.uploading && !slot.uploaded && (
                <button
                  onClick={() => removeFile(type, index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2 shadow-lg"
                >
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Uploading progress */}
              {slot.uploading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                  <div className="w-3/4 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${slot.progress}%` }}
                    />
                  </div>
                  <span className="text-white text-xs mt-2">{Math.round(slot.progress)}%</span>
                </div>
              )}

              {/* Uploaded check */}
              {slot.uploaded && (
                <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            {/* File name */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="text-white text-xs truncate">{slot.file.name}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{modeTitle}</h1>
          </div>
          <div className="text-sm text-gray-600">{user?.email}</div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Success message */}
        {submitSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <svg className="h-8 w-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-800 font-medium">Отправлено на обработку!</p>
            <p className="text-green-600 text-sm mt-1">Перенаправление в личный кабинет...</p>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
          <button
            onClick={() => {
              setFormMode('video');
              setSearchParams({ mode: 'video' }, { replace: true });
            }}
            className={`h-16 rounded-xl border px-4 py-3 text-lg font-semibold leading-none flex items-center justify-center transition-colors ${
              formMode === 'video'
                ? 'border-blue-300 bg-blue-100 text-blue-700'
                : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            Видео
          </button>
          <button
            onClick={() => {
              setFormMode('article');
              setSearchParams({ mode: 'article' }, { replace: true });
            }}
            className={`h-16 rounded-xl border px-4 py-3 text-lg font-semibold leading-none flex items-center justify-center transition-colors ${
              formMode === 'article'
                ? 'border-indigo-300 bg-indigo-100 text-indigo-700'
                : 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            Статьи
          </button>
          <button
            onClick={() => {
              setFormMode('avatar');
              setSearchParams({ mode: 'avatar' }, { replace: true });
            }}
            className={`h-16 rounded-xl border px-4 py-3 text-lg font-semibold leading-none flex items-center justify-center transition-colors ${
              formMode === 'avatar'
                ? 'border-cyan-300 bg-cyan-100 text-cyan-700'
                : 'border-cyan-200 bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
            }`}
          >
            Аватар
          </button>
        </div>

        {/* Service/team selectors for WordPress categories */}
        <div className="mb-8 card border-l-4 border-primary-500">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
              <svg className="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Дисциплина
                </label>
                <p className="text-xs text-gray-500 mb-2">slug: `service_slug`</p>
                <select
                  value={selectedServiceSlug}
                  onChange={(e) => setSelectedServiceSlug(e.target.value)}
                  disabled={submitting}
                  className="input py-2 pr-8 w-full"
                >
                  {WP_SERVICE_CATEGORIES.map((service) => (
                    <option key={service.slug} value={service.slug}>
                      {service.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  От чьего имени
                </label>
                <p className="text-xs text-gray-500 mb-2">slug: `team_slug`</p>
                <select
                  value={selectedTeamSlug}
                  onChange={(e) => setSelectedTeamSlug(e.target.value)}
                  disabled={submitting || availableTeams.length === 0}
                  className="input py-2 pr-8 w-full"
                >
                  {availableTeams.map((team) => (
                    <option key={team.slug} value={team.slug}>
                      {team.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-sm font-bold rounded-full">
                {selectedTeam?.label || 'Не выбрано'}
              </span>
            </div>
          </div>
        </div>

        {/* Photos section */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Фотографии</h2>
              <p className="text-sm text-gray-500">
                До 5 фото (JPG, PNG, GIF, WebP) — макс. {formatFileSize(config.app.maxFileSize)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {photos.map((slot, i) => renderFileSlot('photo', i, slot, photoRefs))}
          </div>
        </section>

        {/* Videos section */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Видео</h2>
              <p className="text-sm text-gray-500">
                До 5 видео (MP4, WebM, MOV) — макс. {formatFileSize(config.app.maxFileSize)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {videos.map((slot, i) => renderFileSlot('video', i, slot, videoRefs))}
          </div>
        </section>

        {/* Text + Voice section */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Текст</h2>
              <p className="text-sm text-gray-500">
                Описание, инструкции или любой текст. Можно надиктовать голосом.
              </p>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setSubmitError(null);
              }}
              placeholder={
                showVoiceInput
                  ? 'Введите текст или нажмите на микрофон для записи голоса...'
                  : 'Введите текст для формы...'
              }
              className={`input min-h-[120px] resize-y ${showVoiceInput ? 'pr-14' : 'pr-4'}`}
              maxLength={10000}
              disabled={submitting || (showVoiceInput && isTranscribing)}
            />

            {/* Voice button inside textarea */}
            {showVoiceInput && (
              <button
                onClick={handleToggleRecording}
                disabled={submitting || isTranscribing}
                className={`absolute right-3 top-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : isTranscribing
                    ? 'bg-purple-100 text-purple-500'
                    : 'bg-gray-100 text-gray-500 hover:bg-primary-100 hover:text-primary-600'
                } disabled:opacity-50`}
                title={isRecording ? 'Остановить запись' : 'Записать голос'}
              >
                {isTranscribing ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : isRecording ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                )}
              </button>
            )}

            {/* Recording indicator */}
            {showVoiceInput && isRecording && (
              <div className="absolute right-16 top-3 flex items-center gap-2 bg-red-50 rounded-full px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-600 font-medium">
                  {formatDuration(recordingDuration)}
                </span>
              </div>
            )}

            {showVoiceInput && isTranscribing && (
              <div className="absolute right-16 top-3 flex items-center gap-2 bg-purple-50 rounded-full px-3 py-1.5">
                <span className="text-xs text-purple-600 font-medium">Распознаю...</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-400">Все поля необязательные</span>
            <span className="text-xs text-gray-400">{text.length} / 10 000</span>
          </div>
        </section>

        {/* Error */}
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="flex justify-end gap-3">
          <Link to="/dashboard" className="btn-secondary">
            Отмена
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting || submitSuccess || (showVoiceInput && isRecording)}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Отправка...
              </span>
            ) : (
              `Отправить форму "${modeTitle}"`
            )}
          </button>
        </div>

        {/* Info section */}
        <div className="mt-12 card bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="font-semibold text-lg mb-3">Что происходит после отправки?</h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">1</span>
              <span>Файлы загружаются в облачное хранилище Cloudinary</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">2</span>
              <span>Данные отправляются в n8n для автоматической обработки</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">3</span>
              <span>Вы получите уведомление когда результат будет готов</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">4</span>
              <span>В личном кабинете сможете одобрить или отклонить результат</span>
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
};

