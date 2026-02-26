/**
 * n8n Service
 *
 * Sends data to n8n webhook to trigger processing chain.
 *
 * Switch2 conditions:
 *   chatInput == "запустить цепочку" → triggers generation chain
 *   message.photo exists             → image upload branch
 *   chatInput == "video"             → video upload branch
 */

import { config } from '../config/env';

// ============================================================================
// Constants
// ============================================================================

const CHAT_INPUT_TRIGGER = 'запустить цепочку';
const REQUEST_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// Types
// ============================================================================

export interface N8nWebhookPayload {
  uploadId: string;
  userName: string;
  userEmail: string;
  photos: { url: string; name?: string }[];
  videos: { url: string; name?: string }[];
  text?: string;
  count_image: number;
  count_video: number;
  type: 'image' | 'video' | 'text';
}

export interface N8nTriggerResult {
  success: boolean;
  renderUrl?: string;
  renderId?: string;
  message?: string;
  statusCode?: number;
}

export interface N8nRenderResult {
  uploadId: string;
  renderUrl?: string;
  status: 'processing' | 'awaiting_decision' | 'failed';
}

interface N8nResponse {
  url?: string;
  renderUrl?: string;
  id?: string;
  [key: string]: unknown;
}

interface N8nError extends Error {
  statusCode?: number;
  responseText?: string;
}

// ============================================================================
// Helpers
// ============================================================================

const getWebhookUrl = (): string => {
  const url = config.api.n8nWebhookUrl;
  if (!url) {
    throw new Error(
      'VITE_N8N_WEBHOOK_URL is not configured. Please set it in .env file.'
    );
  }
  return url;
};

const validatePayload = (payload: N8nWebhookPayload): void => {
  if (!payload.uploadId) {
    throw new Error('uploadId is required');
  }
  if (!payload.userName) {
    throw new Error('userName is required');
  }
  if (!payload.userEmail) {
    throw new Error('userEmail is required');
  }
  if (payload.count_image < 0 || payload.count_video < 0) {
    throw new Error('count_image and count_video must be non-negative');
  }
  if (payload.type === 'text' && !payload.text?.trim()) {
    throw new Error('text is required when type is "text"');
  }
  if (
    payload.type === 'image' &&
    payload.count_image === 0 &&
    payload.photos.length === 0
  ) {
    throw new Error('photos array is required when type is "image"');
  }
  if (
    payload.type === 'video' &&
    payload.count_video === 0 &&
    payload.videos.length === 0
  ) {
    throw new Error('videos array is required when type is "video"');
  }
};

const parseN8nResponse = (data: unknown): N8nTriggerResult => {
  if (!data) {
    return { success: true };
  }

  const renders: N8nResponse[] = Array.isArray(data) ? data : [data as N8nResponse];
  const firstRender = renders[0];

  if (!firstRender) {
    return { success: true };
  }

  const renderUrl = firstRender.url || firstRender.renderUrl;
  const renderId = firstRender.id;

  return {
    success: true,
    renderUrl: renderUrl || undefined,
    renderId: renderId || undefined,
  };
};

const createTimeoutPromise = (timeout: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);
  });
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Trigger n8n generation chain.
 *
 * Sends chatInput: "запустить цепочку" — the exact text Switch2 is waiting for.
 * Also passes photo/video URLs and user name for the workflow to use.
 */
export const triggerN8nWorkflow = async (
  payload: N8nWebhookPayload
): Promise<N8nTriggerResult> => {
  try {
    validatePayload(payload);

    const webhookUrl = getWebhookUrl();

    const requestBody = {
      chatInput: CHAT_INPUT_TRIGGER,
      type: payload.type,
      uploadId: payload.uploadId,
      userName: payload.userName,
      userEmail: payload.userEmail,
      count_image: payload.count_image,
      count_video: payload.count_video,
      text: payload.text || '',
      photos: payload.photos,
      videos: payload.videos,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.api.n8nApiKey && {
            'X-N8N-API-KEY': config.api.n8nApiKey,
          }),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const error: N8nError = new Error(
          `n8n error ${response.status}: ${errorText || response.statusText}`
        );
        error.statusCode = response.status;
        error.responseText = errorText;
        throw error;
      }

      let responseData: unknown;
      try {
        responseData = await response.json();
      } catch {
        return { success: true };
      }

      return parseN8nResponse(responseData);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        const timeoutError: N8nError = new Error(
          `Request timeout after ${REQUEST_TIMEOUT}ms`
        );
        timeoutError.statusCode = 408;
        throw timeoutError;
      }
      throw fetchError;
    }
  } catch (err) {
    const error = err as N8nError;
    const errorMessage = error.message || 'Unknown error occurred';

    console.error('[n8nService] Trigger workflow error:', {
      uploadId: payload.uploadId,
      type: payload.type,
      error: errorMessage,
      statusCode: error.statusCode,
    });

    return {
      success: false,
      message: errorMessage,
      statusCode: error.statusCode,
    };
  }
};

/**
 * Poll for render result (kept for backwards compatibility).
 * TODO: Implement actual polling logic or remove if not needed.
 */
export const getRenderResult = async (
  uploadId: string
): Promise<N8nRenderResult> => {
  console.warn(
    '[n8nService] getRenderResult is not implemented yet. Returning default status.'
  );
  return { uploadId, status: 'processing' };
};

/**
 * Get all render results (kept for backwards compatibility).
 * TODO: Implement actual fetching logic or remove if not needed.
 */
export const getAllRenderResults = async (): Promise<
  Record<string, N8nRenderResult>
> => {
  console.warn(
    '[n8nService] getAllRenderResults is not implemented yet. Returning empty object.'
  );
  return {};
};
