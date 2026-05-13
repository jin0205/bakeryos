/**
 * BakeryOS Cloudflare Worker
 *
 * - Serves the Vite-built SPA (./dist) for all non-API routes
 * - Proxies POST /api/messages → https://api.anthropic.com/v1/messages
 * - Handles GET/PUT /api/data/:key for KV-backed persistent storage
 */

import type { SquareCredential, SquareCredentialStatus, SquareCredentialUpdate, SquareItemMapping, SquareLocationId, SquareSaleEntry, SquareSalesCache } from './types';

export interface Env {
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY: string;
  BAKERY_DATA: KVNamespace;
  BAKERY_API_TOKEN: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Bakery-Token',
};

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=15552000',
  'X-Content-Type-Options': 'nosniff',
};

const SECURITY_TXT = [
  'Contact: mailto:security@rooboo.xyz',
  'Expires: 2026-11-09T00:00:00Z',
  'Preferred-Languages: en',
  'Canonical: https://rooboo.xyz/.well-known/security.txt',
].join('\n') + '\n';

const VALID_DATA_KEYS = [
  'bakeryos_recipes',
  'bakeryos_inventory',
  'bakeryos_planner_items',
  'bakeryos_work_orders',
  'bakeryos_distributions',
  'bakeryos_square_item_map',
  'bakeryos_square_sales_cache',
] as const;

const SQUARE_CREDENTIALS_KEY = 'private_square_credentials';
const SQUARE_BASE = 'https://connect.squareup.com/v2';
const SQUARE_LOCATIONS: SquareLocationId[] = ['food1', 'food2', 'bread'];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: secureHeaders(CORS_HEADERS) });
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && (url.pathname === '/.well-known/security.txt' || url.pathname === '/security.txt')) {
      return securityTxtResponse();
    }

    if (url.pathname === '/api/messages' && request.method === 'POST') {
      if (!isAuthorized(request, env)) {
        return errorResponse(401, 'Unauthorized');
      }
      return proxyToAnthropic(request, env);
    }

    if (url.pathname.startsWith('/api/data/')) {
      return handleDataRoute(request, env, url);
    }

    if (url.pathname.startsWith('/api/square/')) {
      return handleSquareRoute(request, env, url);
    }

    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env>;

async function handleDataRoute(request: Request, env: Env, url: URL): Promise<Response> {
  if (!isAuthorized(request, env)) {
    return errorResponse(401, 'Unauthorized');
  }

  const key = url.pathname.replace('/api/data/', '');
  if (!(VALID_DATA_KEYS as readonly string[]).includes(key)) {
    return errorResponse(400, `Invalid key: ${key}`);
  }

  if (request.method === 'GET') {
    const value = await env.BAKERY_DATA.get(key);
    const body = value ?? JSON.stringify({ data: [], updatedAt: new Date(0).toISOString() });
    return new Response(body, {
      status: 200,
      headers: secureHeaders({ 'Content-Type': 'application/json', ...CORS_HEADERS }),
    });
  }

  if (request.method === 'PUT') {
    let body: string;
    try {
      body = await request.text();
      JSON.parse(body);
    } catch {
      return errorResponse(400, 'Invalid JSON body');
    }
    await env.BAKERY_DATA.put(key, body);
    return new Response(null, { status: 204, headers: secureHeaders(CORS_HEADERS) });
  }

  return errorResponse(405, 'Method not allowed');
}

async function handleSquareRoute(request: Request, env: Env, url: URL): Promise<Response> {
  if (!isAuthorized(request, env)) {
    return errorResponse(401, 'Unauthorized');
  }

  if (url.pathname === '/api/square/credentials') {
    if (request.method === 'GET') {
      const credentials = await loadSquareCredentials(env);
      const statuses: SquareCredentialStatus[] = SQUARE_LOCATIONS.map(location_id => {
        const credential = credentials.find(c => c.location_id === location_id);
        return {
          location_id,
          square_location_id: credential?.square_location_id ?? '',
          configured: Boolean(credential?.access_token && credential.square_location_id),
        };
      });
      return jsonResponse(statuses);
    }

    if (request.method === 'PUT') {
      let payload: { credentials?: SquareCredentialUpdate[] };
      try {
        payload = await request.json();
      } catch {
        return errorResponse(400, 'Invalid JSON body');
      }
      if (!Array.isArray(payload.credentials)) {
        return errorResponse(400, 'Missing credentials array');
      }

      const existing = await loadSquareCredentials(env);
      const merged = mergeSquareCredentials(existing, payload.credentials);
      await env.BAKERY_DATA.put(SQUARE_CREDENTIALS_KEY, JSON.stringify(merged));
      return new Response(null, { status: 204, headers: secureHeaders(CORS_HEADERS) });
    }

    return errorResponse(405, 'Method not allowed');
  }

  if (url.pathname === '/api/square/catalog' && request.method === 'GET') {
    const credentials = await loadSquareCredentials(env);
    const configured = credentials.filter(c => c.access_token && c.square_location_id);
    const itemNames = new Set<string>();

    const results = await Promise.allSettled(configured.map(fetchCatalogItemNames));
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        result.value.forEach(name => itemNames.add(name));
      }
    });

    return jsonResponse({ items: Array.from(itemNames).sort() });
  }

  if (url.pathname === '/api/square/sync' && request.method === 'POST') {
    let payload: { mappings?: SquareItemMapping[]; startDate?: string };
    try {
      payload = await request.json();
    } catch {
      return errorResponse(400, 'Invalid JSON body');
    }

    if (!Array.isArray(payload.mappings) || !payload.startDate) {
      return errorResponse(400, 'Missing mappings or startDate');
    }

    const credentials = (await loadSquareCredentials(env)).filter(c => c.access_token && c.square_location_id);
    const cache = await syncSquareOrders(credentials, payload.mappings, payload.startDate);
    return jsonResponse(cache);
  }

  return errorResponse(404, 'Not found');
}

function isAuthorized(request: Request, env: Env): boolean {
  const token = request.headers.get('X-Bakery-Token');
  return Boolean(token && timingSafeEqual(token, env.BAKERY_API_TOKEN));
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const length = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < length; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

async function loadSquareCredentials(env: Env): Promise<SquareCredential[]> {
  const raw = await env.BAKERY_DATA.get(SQUARE_CREDENTIALS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SquareCredential[];
    return Array.isArray(parsed) ? parsed.filter(isSquareCredential) : [];
  } catch {
    return [];
  }
}

function mergeSquareCredentials(existing: SquareCredential[], incoming: SquareCredentialUpdate[]): SquareCredential[] {
  return SQUARE_LOCATIONS.flatMap(location_id => {
    const next = incoming.find(c => c.location_id === location_id);
    const current = existing.find(c => c.location_id === location_id);
    if (next?.clear) return [];
    const squareLocationId = next?.square_location_id.trim() || current?.square_location_id || '';
    const accessToken = next?.access_token.trim() || current?.access_token || '';
    if (!squareLocationId || !accessToken) return [];
    return [{ location_id, square_location_id: squareLocationId, access_token: accessToken }];
  });
}

function isSquareCredential(value: unknown): value is SquareCredential {
  const credential = value as Partial<SquareCredential>;
  return (
    SQUARE_LOCATIONS.includes(credential.location_id as SquareLocationId) &&
    typeof credential.access_token === 'string' &&
    typeof credential.square_location_id === 'string'
  );
}

async function fetchCatalogItemNames(credential: SquareCredential): Promise<string[]> {
  const res = await fetch(`${SQUARE_BASE}/catalog/list?types=ITEM`, {
    headers: { Authorization: `Bearer ${credential.access_token}` },
  });
  if (!res.ok) throw new Error(`Square catalog fetch failed: ${res.status}`);
  const body = await res.json() as { objects?: { type: string; item_data?: { name?: string } }[] };
  return (body.objects ?? [])
    .filter(o => o.type === 'ITEM' && o.item_data?.name)
    .map(o => o.item_data!.name!);
}

async function searchOrders(
  credential: SquareCredential,
  startDate: string,
  endDate: string,
  mappings: SquareItemMapping[],
): Promise<{ entries: SquareSaleEntry[]; error?: string }> {
  const mappedNames = new Set(
    mappings.filter(m => m.location_id === credential.location_id).map(m => m.square_item_name),
  );

  const query = {
    location_ids: [credential.square_location_id],
    query: {
      filter: {
        date_time_filter: {
          closed_at: {
            start_at: `${startDate}T00:00:00Z`,
            end_at: `${endDate}T23:59:59Z`,
          },
        },
        state_filter: { states: ['COMPLETED'] },
      },
    },
  };

  type OrdersResponse = {
    orders?: {
      closed_at?: string;
      created_at?: string;
      line_items?: { name?: string; quantity?: string }[];
    }[];
    cursor?: string;
  };

  const aggregated = new Map<string, SquareSaleEntry>();

  try {
    let cursor: string | undefined;
    do {
      const res = await fetch(`${SQUARE_BASE}/orders/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credential.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cursor ? { ...query, cursor } : query),
      });

      if (res.status === 401) {
        return { entries: [], error: `Credentials invalid for ${credential.location_id} - check Settings` };
      }
      if (!res.ok) {
        return { entries: [], error: `Square API error ${res.status} for ${credential.location_id}` };
      }

      const body = await res.json() as OrdersResponse;

      for (const order of body.orders ?? []) {
        const date = (order.closed_at ?? order.created_at ?? '').substring(0, 10);
        if (!date) continue;

        for (const item of order.line_items ?? []) {
          if (!item.name || !mappedNames.has(item.name)) continue;
          const key = `${credential.location_id}|${date}|${item.name}`;
          const existing = aggregated.get(key);
          const qty = parseInt(item.quantity ?? '1', 10);
          if (existing) {
            existing.quantity_sold += qty;
          } else {
            aggregated.set(key, {
              location_id: credential.location_id,
              date,
              square_item_name: item.name,
              quantity_sold: qty,
            });
          }
        }
      }

      cursor = body.cursor;
    } while (cursor);

    return { entries: Array.from(aggregated.values()) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { entries: [], error: `${credential.location_id}: ${msg}` };
  }
}

async function syncSquareOrders(
  credentials: SquareCredential[],
  mappings: SquareItemMapping[],
  startDate: string,
): Promise<SquareSalesCache> {
  const endDate = new Date().toISOString().substring(0, 10);
  const results = await Promise.all(credentials.map(c => searchOrders(c, startDate, endDate, mappings)));
  const allSales: SquareSaleEntry[] = [];
  const errors: { location_id: SquareLocationId; error: string }[] = [];

  for (let i = 0; i < credentials.length; i++) {
    const { entries, error } = results[i];
    allSales.push(...entries);
    if (error) errors.push({ location_id: credentials[i].location_id, error });
  }

  return {
    last_synced_at: new Date().toISOString(),
    sales: allSales,
    sync_errors: errors,
  };
}

async function proxyToAnthropic(request: Request, env: Env): Promise<Response> {
  let body: string;
  try {
    body = await request.text();
  } catch {
    return errorResponse(400, 'Failed to read request body');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  };

  try {
    const parsed = JSON.parse(body) as { thinking?: { type?: string } };
    if (parsed.thinking?.type === 'enabled') {
      headers['anthropic-beta'] = 'interleaved-thinking-2025-05-14';
    }
  } catch {
    // proceed without beta header
  }

  let anthropicResponse: Response;
  try {
    anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body,
    });
  } catch (err) {
    return errorResponse(502, `Upstream request failed: ${String(err)}`);
  }

  const responseBody = await anthropicResponse.text();
  return new Response(responseBody, {
    status: anthropicResponse.status,
    headers: secureHeaders({ 'Content-Type': 'application/json', ...CORS_HEADERS }),
  });
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: secureHeaders({ 'Content-Type': 'application/json', ...CORS_HEADERS }),
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: secureHeaders({ 'Content-Type': 'application/json', ...CORS_HEADERS }),
  });
}

function securityTxtResponse(): Response {
  return new Response(SECURITY_TXT, {
    status: 200,
    headers: secureHeaders({
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    }),
  });
}

function secureHeaders(headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    result.set(key, value);
  }
  return result;
}

function withSecurityHeaders(response: Response): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: secureHeaders(response.headers),
  });
}
