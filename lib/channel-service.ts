import type { MessageVariant } from './types';

export interface ChannelMessage {
  id: string;
  campaignId: string;
  customerId: string;
  channel: string;
  body: string;
}

export interface DispatchResult {
  accepted: number;
  jobId: string;
  message: string;
}

/**
 * Calls the external channel service with a batch of messages.
 * Returns 202 Accepted immediately — status callbacks arrive later at /api/receipts.
 */
export async function callChannelService(
  messages: ChannelMessage[],
  campaignId: string,
): Promise<DispatchResult> {
  const serviceUrl = process.env.CHANNEL_SERVICE_URL || 'http://localhost:3001';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
  const crmReceiptUrl = `${appUrl}/api/receipts`;

  const res = await fetch(`${serviceUrl}/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId, crmReceiptUrl, messages }),
  });

  if (!res.ok) {
    throw new Error(`Channel service returned ${res.status}`);
  }

  return res.json() as Promise<DispatchResult>;
}

/** @deprecated Use callChannelService for real dispatch */
export async function dispatchCampaign(
  channel: string,
  variant: MessageVariant,
  segmentSize: number
): Promise<{ dispatched: number; channel: string; estimatedDelivery: string }> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const deliveryMap: Record<string, string> = {
    whatsapp: '~2 minutes',
    email: '~5 minutes',
    sms: '~1 minute',
    push: '~30 seconds',
  };

  return {
    dispatched: segmentSize,
    channel,
    estimatedDelivery: deliveryMap[channel.toLowerCase()] || '~3 minutes',
  };
}

export function getChannelIcon(channel: string): string {
  const icons: Record<string, string> = {
    email: '📧',
    whatsapp: '💬',
    sms: '📱',
    push: '🔔',
  };
  return icons[channel.toLowerCase()] || '📣';
}

export function getChannelLabel(channel: string): string {
  const labels: Record<string, string> = {
    email: 'Email',
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    push: 'Push notification',
  };
  return labels[channel.toLowerCase()] || channel;
}

export function getChannelColor(channel: string): string {
  const colors: Record<string, string> = {
    email: '#185FA5',
    whatsapp: '#0F6E56',
    sms: '#534AB7',
    push: '#993C1D',
  };
  return colors[channel.toLowerCase()] || '#5F5E5A';
}
