import type { StorageKey } from '../types';

interface StorageEnvelope<T> {
  data: T[];
  updatedAt: string;
}

const ALL_KEYS: StorageKey[] = [
  'bakeryos_recipes',
  'bakeryos_inventory',
  'bakeryos_planner_items',
  'bakeryos_work_orders',
  'bakeryos_distributions',
  'bakeryos_square_item_map',
  'bakeryos_square_sales_cache',
];

const TOKEN = ((import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_BAKERY_API_TOKEN) ?? '';

function getEnvelope<T>(key: StorageKey): StorageEnvelope<T> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StorageEnvelope<T>) : null;
  } catch {
    return null;
  }
}

function setEnvelope<T>(key: StorageKey, data: T[]): void {
  const envelope: StorageEnvelope<T> = { data, updatedAt: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(envelope));
}

export function load<T>(key: StorageKey): T[] {
  return getEnvelope<T>(key)?.data ?? [];
}

async function pushToKV(key: StorageKey): Promise<void> {
  if (!TOKEN) return;
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    const res = await fetch(`/api/data/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Bakery-Token': TOKEN },
      body: raw,
    });
    if (res.ok) {
      removePending(key);
    } else {
      addPending(key);
    }
  } catch {
    addPending(key);
  }
}

function getPendingQueue(): StorageKey[] {
  try {
    const raw = localStorage.getItem('bakeryos_pending_sync');
    return raw ? (JSON.parse(raw) as StorageKey[]) : [];
  } catch {
    return [];
  }
}

function addPending(key: StorageKey): void {
  const queue = getPendingQueue();
  if (!queue.includes(key)) {
    localStorage.setItem('bakeryos_pending_sync', JSON.stringify([...queue, key]));
  }
}

function removePending(key: StorageKey): void {
  const queue = getPendingQueue().filter(k => k !== key);
  localStorage.setItem('bakeryos_pending_sync', JSON.stringify(queue));
}

async function flushPendingSync(): Promise<void> {
  const queue = getPendingQueue();
  await Promise.allSettled(queue.map(pushToKV));
}

export function save<T>(key: StorageKey, data: T[]): void {
  setEnvelope(key, data);
  void pushToKV(key);
}

export async function syncAll(): Promise<void> {
  if (!TOKEN) return;
  await flushPendingSync();
  await Promise.allSettled(
    ALL_KEYS.map(async (key) => {
      try {
        const res = await fetch(`/api/data/${key}`, {
          headers: { 'X-Bakery-Token': TOKEN },
        });
        if (!res.ok) return;
        const remote = (await res.json()) as StorageEnvelope<unknown>;
        const local = getEnvelope(key);
        if (!local || remote.updatedAt > local.updatedAt) {
          localStorage.setItem(key, JSON.stringify(remote));
        }
      } catch {
        // keep local data on network error
      }
    })
  );
}

function migrateOldKeys(): void {
  const migrations: [string, StorageKey][] = [
    ['sourdough_recipes', 'bakeryos_recipes'],
    ['sourdough_inventory', 'bakeryos_inventory'],
    ['sourdough_planner_items', 'bakeryos_planner_items'],
  ];
  for (const [oldKey, newKey] of migrations) {
    const oldRaw = localStorage.getItem(oldKey);
    if (oldRaw && !localStorage.getItem(newKey)) {
      try {
        const data = JSON.parse(oldRaw);
        setEnvelope(newKey, Array.isArray(data) ? data : []);
        localStorage.removeItem(oldKey);
      } catch {
        // skip malformed data — leave old key intact
      }
    }
  }
}

migrateOldKeys();
window.addEventListener('online', () => { void flushPendingSync(); });

export const storageService = { load, save, syncAll };
