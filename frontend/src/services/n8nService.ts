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
const REQUEST_TIMEOUT = 300000; // 5 minutes - video generation takes time
const DEFAULT_POLL_WEBHOOK_URL =
  'https://pavelbb1982.app.n8n.cloud/webhook/49662ca4-5d73-419d-9d50-c36f363eb467';
const DEFAULT_PUBLISH_WEBHOOK_URL =
  'https://pavelbb1982.app.n8n.cloud/webhook/be71a706-bb67-41ac-b3e2-0804c2e3957b';
const DEFAULT_SITE_PUBLISH_WEBHOOK_URL =
  'https://pavelbb1982.app.n8n.cloud/webhook/9606edf8-bf82-4475-9624-5c67bc80c284';
const PUBLISH_AUDIT_STORAGE_KEY = 'publish_dispatch_audit';
const PUBLISH_AUDIT_MAX_ITEMS = 100;

// ============================================================================
// Types
// ============================================================================

export interface N8nWebhookPayload {
  uploadId: string;
  userName: string;
  userEmail: string;
  serviceSlug?: string;
  teamSlug?: string;
  photos: { url: string; name?: string }[];
  videos: { url: string; name?: string }[];
  text?: string;
  count_image: number;
  count_video: number;
  type: 'image' | 'video' | 'text';
  formType?: 'video' | 'article' | 'avatar';
}

export interface N8nTriggerResult {
  success: boolean;
  renderUrl?: string;
  renderId?: string;
  renderStatus?: 'rendering' | 'ready';
  message?: string;
  statusCode?: number;
}

export interface N8nRenderResult {
  uploadId: string;
  renderUrl?: string;
  status: 'processing' | 'awaiting_decision' | 'failed';
}

export interface N8nPublishPayload {
  uploadId: string;
  userName?: string;
  userEmail?: string;
  serviceSlug?: string;
  teamSlug?: string;
  serviceName?: string;
  teamName?: string;
  renderUrl: string;
  createdAt?: string;
}

export interface SitePublishWebhookPayload {
  uploadId: string;
  renderUrl: string;
  serviceSlug: string;
  teamSlug: string;
  serviceName?: string;
  teamName?: string;
  userEmail?: string;
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

interface PublishAuditRecord {
  ts: string;
  uploadId: string;
  endpoint: string;
  status: 'sent' | 'skipped' | 'failed';
  reason?: string;
  httpCode?: number;
  request: Record<string, unknown>;
  responsePreview?: string;
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
  if (payload.type === 'video' && !payload.serviceSlug) {
    throw new Error('serviceSlug is required when type is "video"');
  }
  if (payload.type === 'video' && !payload.teamSlug) {
    throw new Error('teamSlug is required when type is "video"');
  }
};

const writePublishAudit = (record: PublishAuditRecord): void => {
  try {
    const raw = localStorage.getItem(PUBLISH_AUDIT_STORAGE_KEY);
    const list: PublishAuditRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    localStorage.setItem(
      PUBLISH_AUDIT_STORAGE_KEY,
      JSON.stringify(list.slice(0, PUBLISH_AUDIT_MAX_ITEMS))
    );
  } catch {
    // Must not break publish flow
  }
};

/**
 * Recursively search for a video URL anywhere in the response object.
 * Checks common URL field names first, then digs deeper.
 */
const findVideoUrl = (obj: unknown, depth = 0): string | undefined => {
  if (depth > 6 || !obj) return undefined;

  // Direct string that looks like a video URL
  if (typeof obj === 'string' && /^https?:\/\/.+\.(mp4|webm|mov|avi)/i.test(obj)) {
    return obj;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findVideoUrl(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  if (typeof obj === 'object') {
    const rec = obj as Record<string, unknown>;
    // Priority fields
    const priorityFields = ['url', 'renderUrl', 'render_url', 'outputUrl', 'output_url', 'videoUrl', 'video_url', 'downloadUrl', 'download_url'];
    for (const field of priorityFields) {
      const val = rec[field];
      if (typeof val === 'string' && val.startsWith('http')) return val;
    }
    // Recurse into all other fields
    for (const val of Object.values(rec)) {
      const found = findVideoUrl(val, depth + 1);
      if (found) return found;
    }
  }

  return undefined;
};

/** Find Creatomate status anywhere in the response */
const findCreatomateStatus = (obj: unknown, depth = 0): string | undefined => {
  if (depth > 6 || !obj) return undefined;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findCreatomateStatus(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof obj === 'object') {
    const rec = obj as Record<string, unknown>;
    if (typeof rec['status'] === 'string') return rec['status'] as string;
    for (const val of Object.values(rec)) {
      const found = findCreatomateStatus(val, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
};

const parseN8nResponse = (data: unknown): N8nTriggerResult => {
  if (!data) {
    return { success: true };
  }

  // Log raw response to help debug format issues
  console.log('[n8nService] Webhook response:', JSON.stringify(data));

  const renders: N8nResponse[] = Array.isArray(data) ? data : [data as N8nResponse];
  const firstRender = renders[0];

  if (!firstRender) {
    return { success: true };
  }

  // Try standard fields first, then recursive search
  const renderUrl =
    (firstRender.url as string | undefined) ||
    (firstRender.renderUrl as string | undefined) ||
    findVideoUrl(data);

  const renderId = firstRender.id;

  // Creatomate statuses: 'planned' | 'rendering' | 'succeeded' | 'failed'
  const creatomateStatus =
    (firstRender.status as string | undefined) || findCreatomateStatus(data);
  const renderStatus: 'rendering' | 'ready' =
    creatomateStatus === 'succeeded' ? 'ready' : 'rendering';

  return {
    success: true,
    renderUrl: renderUrl || undefined,
    renderId: renderId ? String(renderId) : undefined,
    renderStatus,
  };
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
      formType: payload.formType || 'video',
      type: payload.type,
      uploadId: payload.uploadId,
      userName: payload.userName,
      userEmail: payload.userEmail,
      service_slug: payload.serviceSlug || '',
      team_slug: payload.teamSlug || '',
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
 * Poll Google Sheets (sheet 6) via n8n GET webhook for a Creatomate render URL.
 *
 * n8n webhook should:
 *   1. Read sheet 6 of "toothmaster" spreadsheet
 *   2. Find row where name == userName AND date == date AND status == "ready"
 *   3. Return { found: true, url: "...", rowIndex: N } or { found: false }
 *   4. Update that row's status to "done"
 *
 * App calls this every 15s for uploads that are in "processing" state.
 */
export const getRenderResult = async (
  uploadId: string,
  targetName?: string,
  uploadDate?: string
): Promise<N8nRenderResult> => {
  const pollUrl =
    (import.meta.env.VITE_N8N_POLL_URL as string | undefined) ||
    DEFAULT_POLL_WEBHOOK_URL;

  if (!targetName) {
    return { uploadId, status: 'processing' };
  }

  // Use provided date or today in YYYY-MM-DD
  const date = uploadDate ?? new Date().toISOString().split('T')[0];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${pollUrl}?userName=${encodeURIComponent(targetName)}&date=${encodeURIComponent(date)}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[n8nService] Poll webhook returned ${response.status}`);
      return { uploadId, status: 'processing' };
    }

    const text = await response.text();
    if (!text.trim()) return { uploadId, status: 'processing' };

    let data: { found?: boolean; url?: string; status?: string };
    try {
      data = JSON.parse(text);
    } catch {
      return { uploadId, status: 'processing' };
    }

    // Accept both {found: true, url} and {url} (n8n returns row data directly)
    const url = data.url;
    if (url && url.startsWith('http')) {
      return { uploadId, renderUrl: url, status: 'awaiting_decision' };
    }

    return { uploadId, status: 'processing' };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('[n8nService] Poll request timed out');
    } else {
      console.warn('[n8nService] Poll error:', err);
    }
    return { uploadId, status: 'processing' };
  }
};

/**
 * Trigger webhook when rendered video URL appears on the site.
 * This webhook is fire-and-forget: response body is ignored.
 */
export const triggerVideoPublishedWebhook = async (
  payload: N8nPublishPayload
): Promise<boolean> => {
  if (!payload.uploadId || !payload.renderUrl) return false;

  const localSitePublishUrl =
    (import.meta.env.VITE_LOCAL_SITE_PUBLISH_URL as string | undefined)?.trim() || '';
  const localSitePublishToken =
    (import.meta.env.VITE_LOCAL_SITE_PUBLISH_TOKEN as string | undefined)?.trim() || '';
  const publishUrl =
    localSitePublishUrl ||
    (import.meta.env.VITE_N8N_PUBLISH_WEBHOOK_URL as string | undefined) ||
    DEFAULT_PUBLISH_WEBHOOK_URL;

  const isLocalBridge = Boolean(localSitePublishUrl) && publishUrl === localSitePublishUrl;
  const requestBody = isLocalBridge
    ? {
        // Required fields for WP plugin allall-media-bridge ingest endpoint
        service_slug: payload.serviceSlug ?? '',
        team_slug: payload.teamSlug ?? '',
        type: 'video',
        video_url: payload.renderUrl,
        // Optional metadata fields accepted by plugin
        title:
          [payload.serviceName, payload.teamName].filter(Boolean).join(' / ') ||
          [payload.serviceSlug, payload.teamSlug].filter(Boolean).join(' / ') ||
          undefined,
        description: payload.uploadId,
        published_at: payload.createdAt ?? new Date().toISOString(),
      }
    : {
        event: 'video_link_arrived_on_site',
        source: 'creatomate',
        uploadId: payload.uploadId,
        userName: payload.userName ?? '',
        userEmail: payload.userEmail ?? '',
        service_slug: payload.serviceSlug ?? '',
        team_slug: payload.teamSlug ?? '',
        parent_category_slug: payload.serviceSlug ?? '',
        child_category_slug: payload.teamSlug ?? '',
        parent_category_name: payload.serviceName ?? '',
        child_category_name: payload.teamName ?? '',
        renderUrl: payload.renderUrl,
        createdAt: payload.createdAt ?? new Date().toISOString(),
      };

  try {
    if (isLocalBridge && !localSitePublishToken) {
      console.warn(
        '[n8nService] Local publish endpoint is configured, but VITE_LOCAL_SITE_PUBLISH_TOKEN is empty.'
      );
      writePublishAudit({
        ts: new Date().toISOString(),
        uploadId: payload.uploadId,
        endpoint: publishUrl,
        status: 'skipped',
        reason: 'empty_local_site_publish_token',
        request: requestBody as Record<string, unknown>,
      });
      return false;
    }

    if (isLocalBridge) {
      const localPayload = requestBody as Record<string, unknown>;
      const requiredFields = ['service_slug', 'team_slug', 'type', 'video_url'] as const;

      for (const field of requiredFields) {
        const value = localPayload[field];
        if (typeof value !== 'string' || !value.trim()) {
          const reason = `missing_required_field:${field}`;
          console.warn(`[n8nService] Local publish skipped: ${reason}`);
          writePublishAudit({
            ts: new Date().toISOString(),
            uploadId: payload.uploadId,
            endpoint: publishUrl,
            status: 'skipped',
            reason,
            request: requestBody as Record<string, unknown>,
          });
          return false;
        }
      }

      if (localPayload.type !== 'video') {
        const reason = 'invalid_type_for_local_bridge';
        console.warn(`[n8nService] Local publish skipped: ${reason}`);
        writePublishAudit({
          ts: new Date().toISOString(),
          uploadId: payload.uploadId,
          endpoint: publishUrl,
          status: 'skipped',
          reason,
          request: requestBody as Record<string, unknown>,
        });
        return false;
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (isLocalBridge) {
      headers.Authorization = `Bearer ${localSitePublishToken}`;
    } else if (config.api.n8nApiKey) {
      headers['X-N8N-API-KEY'] = config.api.n8nApiKey;
    }

    const response = await fetch(publishUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text().catch(() => '');
    let responsePreview = responseText;
    try {
      responsePreview = responseText ? JSON.stringify(JSON.parse(responseText)) : '';
    } catch {
      // keep raw text
    }

    if (!response.ok) {
      console.warn(
        `[n8nService] Publish webhook returned ${response.status} ${response.statusText}`
      );
      writePublishAudit({
        ts: new Date().toISOString(),
        uploadId: payload.uploadId,
        endpoint: publishUrl,
        status: 'failed',
        httpCode: response.status,
        reason: `http_${response.status}`,
        request: requestBody as Record<string, unknown>,
        responsePreview: responsePreview.slice(0, 1000),
      });
      return false;
    }

    writePublishAudit({
      ts: new Date().toISOString(),
      uploadId: payload.uploadId,
      endpoint: publishUrl,
      status: 'sent',
      httpCode: response.status,
      request: requestBody as Record<string, unknown>,
      responsePreview: responsePreview.slice(0, 1000),
    });

    const curlHint = [
      `curl.exe -X POST "${publishUrl}"`,
      `-H "Accept: application/json"`,
      `-H "Content-Type: application/json"`,
      isLocalBridge && localSitePublishToken
        ? `-H "Authorization: Bearer <TOKEN>"`
        : config.api.n8nApiKey
        ? `-H "X-N8N-API-KEY: <KEY>"`
        : '',
      `--data-raw '${JSON.stringify(requestBody)}'`,
    ]
      .filter(Boolean)
      .join(' ');
    console.info('[n8nService] Publish request sent. cURL:', curlHint);

    return true;
  } catch (err) {
    console.warn('[n8nService] Publish webhook error:', err);
    writePublishAudit({
      ts: new Date().toISOString(),
      uploadId: payload.uploadId,
      endpoint: publishUrl,
      status: 'failed',
      reason: err instanceof Error ? err.message : 'unknown_error',
      request: requestBody as Record<string, unknown>,
    });
    return false;
  }
};

/**
 * Manual publish action from UI button:
 * sends render URL + selected categories to dedicated n8n webhook.
 */
export const triggerSitePublishWebhook = async (
  payload: SitePublishWebhookPayload
): Promise<{ success: boolean; statusCode?: number; message?: string }> => {
  const webhookUrl =
    (import.meta.env.VITE_SITE_PUBLISH_WEBHOOK_URL as string | undefined)?.trim() ||
    DEFAULT_SITE_PUBLISH_WEBHOOK_URL;

  if (!payload.renderUrl || !payload.serviceSlug || !payload.teamSlug) {
    return {
      success: false,
      message: 'Missing required fields: renderUrl/serviceSlug/teamSlug',
    };
  }

  const requestBody = {
    type: 'video',
    uploadId: payload.uploadId,
    video_url: payload.renderUrl,
    renderUrl: payload.renderUrl,
    service_slug: payload.serviceSlug,
    team_slug: payload.teamSlug,
    parent_category_slug: payload.serviceSlug,
    child_category_slug: payload.teamSlug,
    parent_category_name: payload.serviceName ?? '',
    child_category_name: payload.teamName ?? '',
    userEmail: payload.userEmail ?? '',
    createdAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(config.api.n8nApiKey && {
          'X-N8N-API-KEY': config.api.n8nApiKey,
        }),
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text().catch(() => '');
    writePublishAudit({
      ts: new Date().toISOString(),
      uploadId: payload.uploadId,
      endpoint: webhookUrl,
      status: response.ok ? 'sent' : 'failed',
      httpCode: response.status,
      reason: response.ok ? undefined : `http_${response.status}`,
      request: requestBody as Record<string, unknown>,
      responsePreview: responseText.slice(0, 1000),
    });

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        message: responseText || response.statusText,
      };
    }

    return { success: true, statusCode: response.status };
  } catch (err) {
    writePublishAudit({
      ts: new Date().toISOString(),
      uploadId: payload.uploadId,
      endpoint: webhookUrl,
      status: 'failed',
      reason: err instanceof Error ? err.message : 'unknown_error',
      request: requestBody as Record<string, unknown>,
    });
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

