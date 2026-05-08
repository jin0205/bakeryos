import type { SquareCredentialStatus, SquareCredentialUpdate, SquareItemMapping, SquareSalesCache } from '../types';

const TOKEN = ((import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_BAKERY_API_TOKEN) ?? '';

async function squareApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (TOKEN) headers.set('X-Bakery-Token', TOKEN);
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    throw new Error(`Square API proxy failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function loadSquareCredentialStatuses(): Promise<SquareCredentialStatus[]> {
  try {
    return await squareApi<SquareCredentialStatus[]>('/api/square/credentials');
  } catch {
    return [
      { location_id: 'food1', square_location_id: '', configured: false },
      { location_id: 'food2', square_location_id: '', configured: false },
      { location_id: 'bread', square_location_id: '', configured: false },
    ];
  }
}

export async function saveSquareCredentials(credentials: SquareCredentialUpdate[]): Promise<void> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (TOKEN) headers.set('X-Bakery-Token', TOKEN);
  const res = await fetch('/api/square/credentials', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ credentials }),
  });
  if (!res.ok) {
    throw new Error(`Square credentials save failed: ${res.status}`);
  }
}

export async function fetchCatalogItemNames(): Promise<string[]> {
  const result = await squareApi<{ items: string[] }>('/api/square/catalog');
  return result.items;
}

export async function syncAllLocations(
  mappings: SquareItemMapping[],
  startDate: string,
): Promise<SquareSalesCache> {
  return squareApi<SquareSalesCache>('/api/square/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mappings, startDate }),
  });
}
