/**
 * Voice Service
 *
 * Handles audio recording via RecordRTC and transcription via OpenAI Whisper API.
 */

import RecordRTC from 'recordrtc';
import { config } from '../config/env';
import type { WhisperTranscriptionResponse } from '../types';

let recorder: RecordRTC | null = null;
let mediaStream: MediaStream | null = null;

/**
 * Request microphone access and start recording
 */
export const startRecording = async (): Promise<void> => {
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  recorder = new RecordRTC(mediaStream, {
    type: 'audio',
    mimeType: 'audio/webm',
    recorderType: RecordRTC.StereoAudioRecorder,
    numberOfAudioChannels: 1,
    desiredSampRate: 16000,
  });

  recorder.startRecording();
};

/**
 * Stop recording and return audio blob
 */
export const stopRecording = (): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (!recorder) {
      reject(new Error('Recorder not initialized'));
      return;
    }

    recorder.stopRecording(() => {
      const blob = recorder?.getBlob();

      // Stop all media tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
      }

      recorder = null;

      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to get audio blob'));
      }
    });
  });
};

/**
 * Send audio to OpenAI Whisper API for transcription
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const apiKey = config.openai.apiKey;

  if (!apiKey) {
    throw new Error(
      'OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env file.'
    );
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'ru');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Whisper API error: ${response.status}`
    );
  }

  const data: WhisperTranscriptionResponse = await response.json();
  return data.text;
};

/**
 * Check if microphone is available
 */
export const checkMicrophoneAccess = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
};

/**
 * Format recording duration as mm:ss
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
