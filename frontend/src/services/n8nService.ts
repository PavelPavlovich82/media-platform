/**
 * n8n Service
 *
 * Sends upload data to n8n webhook and polls for render results.
 */

import { config } from '../config/env';

const N8N_BASE = 'https://pavelbb1982.app.n8n.cloud';

export interface N8nWebhookPayload {
  uploadId: string;
  userName: string;
  userEmail: string;
  photos: { url: string; name?: string }[];
  videos: { url: string; name?: string }[];
  watermarkUrl?: string;
  text?: string;
  count_image: number;
  count_video: number;
}

export interface N8nRenderResult {
  uploadId: string;
  renderUrl?: string;
  status: 'processing' | 'awaiting_decision' | 'failed';
  userName?: string;
  savedAt?: string;
}

/**
 * Trigger n8n media processing workflow
 */
export const triggerN8nWorkflow = async (
  payload: N8nWebhookPayload
): Promise<{ success: boolean; message?: string }> => {
  const webhookUrl = `${N8N_BASE}/webhook/media-upload`;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`n8n webhook error ${response.status}: ${text}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error('n8n trigger error:', err);
    throw new Error(err.message || 'Не удалось запустить обработку в n8n');
  }
};

/**
 * Poll n8n for render result by uploadId
 */
export const getRenderResult = async (
  uploadId: string
): Promise<N8nRenderResult> => {
  const url = `${N8N_BASE}/webhook/get-result?uploadId=${encodeURIComponent(uploadId)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return { uploadId, status: 'processing' };
    const data = await response.json();
    return data;
  } catch {
    return { uploadId, status: 'processing' };
  }
};

/**
 * Get all pending results (for admin polling)
 */
export const getAllRenderResults = async (): Promise<
  Record<string, N8nRenderResult>
> => {
  const url = `${N8N_BASE}/webhook/get-result`;
  try {
    const response = await fetch(url);
    if (!response.ok) return {};
    const data = await response.json();
    return data.results || {};
  } catch {
    return {};
  }
};
