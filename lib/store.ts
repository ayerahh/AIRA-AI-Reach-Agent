/**
 * AIRA In-Memory Store
 * Single source of truth for all runtime data.
 * This module is a server-side singleton — Node.js module caching keeps
 * one instance alive for the process lifetime (fine for dev + demo).
 * In production you would swap this for a real DB adapter.
 */

import type { AppStore, Campaign, Communication } from "./types";
import { loadSeedData } from "./seed";
import { validateEnv } from "./env";

const GLOBAL_KEY = "__aira_store__";

function getOrCreateStore(): AppStore {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: AppStore };
  if (!g[GLOBAL_KEY]) {
    validateEnv();
    const seed = loadSeedData();
    g[GLOBAL_KEY] = {
      customers: seed.customers,
      orders: seed.orders,
      campaigns: [],
      communications: [],
    };
  }
  return g[GLOBAL_KEY]!;
}

// ─── Accessors ───────────────────────────────────────────────────────────────

export function getStore(): Readonly<AppStore> {
  return getOrCreateStore();
}

export function getCustomers() {
  return getOrCreateStore().customers;
}

export function getOrders() {
  return getOrCreateStore().orders;
}

export function getCampaigns() {
  return getOrCreateStore().campaigns;
}

export function getCommunications() {
  return getOrCreateStore().communications;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function addCampaign(campaign: Campaign): void {
  const store = getOrCreateStore();
  const idx = store.campaigns.findIndex((c) => c.id === campaign.id);
  if (idx >= 0) {
    store.campaigns[idx] = campaign;
  } else {
    store.campaigns.push(campaign);
  }
}

export function updateCampaign(
  id: string,
  patch: Partial<Campaign>
): Campaign | null {
  const store = getOrCreateStore();
  const idx = store.campaigns.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  store.campaigns[idx] = { ...store.campaigns[idx], ...patch };
  return store.campaigns[idx];
}

export function getCampaignById(id: string): Campaign | undefined {
  return getOrCreateStore().campaigns.find((c) => c.id === id);
}

const MAX_COMMUNICATIONS = 5000;

export function addCommunications(comms: Communication[]): void {
  const store = getOrCreateStore();
  store.communications.push(...comms);
  // Evict oldest records beyond cap to prevent unbounded memory growth
  if (store.communications.length > MAX_COMMUNICATIONS) {
    store.communications.splice(0, store.communications.length - MAX_COMMUNICATIONS);
  }
}

export function getCommunicationsByCampaign(
  campaignId: string
): Communication[] {
  return getOrCreateStore().communications.filter(
    (c) => c.campaignId === campaignId
  );
}

export function getCommunicationById(id: string): Communication | undefined {
  return getOrCreateStore().communications.find((c) => c.id === id);
}

export function updateCommunicationStatus(
  id: string,
  status: Communication["status"],
  meta: { timestamp?: string; failureReason?: string } = {}
): void {
  const store = getOrCreateStore();
  const idx = store.communications.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const comm = store.communications[idx];
  store.communications[idx] = {
    ...comm,
    status,
    ...(status === "delivered" ? { deliveredAt: meta.timestamp } : {}),
    ...(status === "opened" ? { openedAt: meta.timestamp } : {}),
    ...(status === "clicked" ? { clickedAt: meta.timestamp } : {}),
    ...(meta.failureReason ? { failureReason: meta.failureReason } : {}),
  };
}
