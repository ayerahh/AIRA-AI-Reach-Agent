import type { CampaignAnalytics, CampaignChannel } from "./types";

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Simulate post-launch metrics for the demo UI. */
export function computeCampaignAnalytics(
  campaignId: string,
  segmentSize: number,
  channel: CampaignChannel,
  avgOrderValue = 2800
): CampaignAnalytics {
  const totalTargeted = segmentSize;
  const totalSent = segmentSize;
  const delivered = Math.floor(totalSent * (randomBetween(95, 98) / 100));
  const opened = Math.floor(delivered * (randomBetween(30, 45) / 100));
  const clicked = Math.floor(opened * (randomBetween(8, 15) / 100));
  const bounced = totalSent - delivered;
  const failed = Math.floor(totalSent * 0.01);
  const deliveryRate = totalSent > 0 ? delivered / totalSent : 0;
  const openRate = delivered > 0 ? opened / delivered : 0;
  const clickRate = opened > 0 ? clicked / opened : 0;
  const estimatedRevenue = clicked * randomBetween(2, 5) * (avgOrderValue / 10);
  const ordersCalculated = Math.floor(clicked * 0.1);

  return {
    campaignId,
    totalTargeted,
    totalSent,
    delivered,
    opened,
    clicked,
    bounced,
    failed,
    deliveryRate,
    openRate,
    clickRate,
    estimatedRevenue: Math.round(estimatedRevenue),
    ordersCalculated,
    channelBreakdown: [
      {
        channel,
        sent: totalSent,
        delivered,
        opened,
        clicked,
        failed,
      },
    ],
    computedAt: new Date().toISOString(),
  };
}

export function computeFunnelMetrics(analytics: CampaignAnalytics): {
  deliveryRate: number;
  openRate: number;
  ctr: number;
  conversionRate: number;
  revenuePerSend: number;
} {
  const { totalSent, delivered, opened, clicked, estimatedRevenue } = analytics;

  const deliveryRate =
    totalSent > 0
      ? parseFloat(((delivered / totalSent) * 100).toFixed(1))
      : 0;
  const openRate =
    delivered > 0
      ? parseFloat(((opened / delivered) * 100).toFixed(1))
      : 0;
  const ctr =
    opened > 0 ? parseFloat(((clicked / opened) * 100).toFixed(1)) : 0;
  const conversionRate = ctr;
  const revenuePerSend =
    totalSent > 0
      ? parseFloat((estimatedRevenue / totalSent).toFixed(2))
      : 0;

  return { deliveryRate, openRate, ctr, conversionRate, revenuePerSend };
}

export function formatMetric(
  value: number,
  type: 'percent' | 'currency' | 'number'
): string {
  switch (type) {
    case 'percent':
      return `${value}%`;
    case 'currency':
      return `₹${value.toLocaleString('en-IN')}`;
    case 'number':
      return value.toLocaleString('en-IN');
    default:
      return String(value);
  }
}

export function computeRevenueEstimate(
  segmentSize: number,
  predictedCtr: number,
  avgOrderValue = 1500
): number {
  const clicks = Math.floor(segmentSize * predictedCtr);
  const conversions = Math.floor(clicks * 0.25);
  return conversions * avgOrderValue;
}

export function getPerformanceBadge(rate: number, type: 'open' | 'ctr' | 'conversion'): {
  label: string;
  color: string;
} {
  const benchmarks = {
    open: { good: 35, great: 45 },
    ctr: { good: 8, great: 12 },
    conversion: { good: 20, great: 30 },
  };

  const b = benchmarks[type];
  if (rate >= b.great) return { label: 'Excellent', color: '#0F6E56' };
  if (rate >= b.good) return { label: 'Good', color: '#3B6D11' };
  return { label: 'Average', color: '#884F0B' };
}
