import { test, expect } from '@playwright/test';
import worker from '../worker';

const TOKEN = 'test-bakery-token';

const EXPECTED_HSTS = 'max-age=15552000';

function makeEnv() {
  const kv = new Map<string, string>();
  return {
    ASSETS: { fetch: () => new Response('asset', { status: 200 }) },
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    BAKERY_API_TOKEN: TOKEN,
    BAKERY_DATA: {
      get: async (key: string) => kv.get(key) ?? null,
      put: async (key: string, value: string) => { kv.set(key, value); },
    },
    kv,
  };
}

function apiRequest(path: string, init: RequestInit = {}): Request {
  return new Request(`https://bakery.test${path}`, init);
}

test.describe('Worker API security boundaries', () => {
  test('adds HSTS and nosniff to static asset responses', async () => {
    const env = makeEnv();

    const res = await worker.fetch(apiRequest('/'), env as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('Strict-Transport-Security')).toBe(EXPECTED_HSTS);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  test('adds HSTS and nosniff to API responses and preserves CORS preflight', async () => {
    const env = makeEnv();

    const unauthorizedApi = await worker.fetch(apiRequest('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    }), env as never);

    const preflight = await worker.fetch(apiRequest('/api/messages', {
      method: 'OPTIONS',
    }), env as never);

    for (const res of [unauthorizedApi, preflight]) {
      expect(res.headers.get('Strict-Transport-Security')).toBe(EXPECTED_HSTS);
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    }

    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(preflight.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, OPTIONS');
    expect(preflight.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, X-Bakery-Token');
  });

  test('serves security.txt from well-known and root paths', async () => {
    const env = makeEnv();

    for (const path of ['/.well-known/security.txt', '/security.txt']) {
      const res = await worker.fetch(apiRequest(path), env as never);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/plain');
      expect(res.headers.get('Strict-Transport-Security')).toBe(EXPECTED_HSTS);
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      await expect(res.text()).resolves.toContain('Contact: mailto:security@rooboo.xyz');
    }
  });

  test('rejects unauthenticated AI proxy calls before Anthropic fetch', async () => {
    const env = makeEnv();
    let upstreamCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      upstreamCalled = true;
      return new Response('{}', { status: 200 });
    };

    try {
      const res = await worker.fetch(apiRequest('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] }),
      }), env as never);

      expect(res.status).toBe(401);
      expect(upstreamCalled).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('forwards authenticated AI proxy calls to Anthropic', async () => {
    const env = makeEnv();
    let upstreamApiKey = '';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      upstreamApiKey = new Headers(init?.headers).get('x-api-key') ?? '';
      return new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const res = await worker.fetch(apiRequest('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Bakery-Token': TOKEN },
        body: JSON.stringify({ messages: [] }),
      }), env as never);

      expect(res.status).toBe(200);
      expect(upstreamApiKey).toBe('test-anthropic-key');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('accepts sales data keys and rejects private Square credential data key', async () => {
    const env = makeEnv();
    const envelope = JSON.stringify({ data: [], updatedAt: new Date().toISOString() });
    const headers = { 'Content-Type': 'application/json', 'X-Bakery-Token': TOKEN };

    for (const key of ['bakeryos_distributions', 'bakeryos_square_item_map', 'bakeryos_square_sales_cache']) {
      const put = await worker.fetch(apiRequest(`/api/data/${key}`, {
        method: 'PUT',
        headers,
        body: envelope,
      }), env as never);
      expect(put.status).toBe(204);

      const get = await worker.fetch(apiRequest(`/api/data/${key}`, {
        headers: { 'X-Bakery-Token': TOKEN },
      }), env as never);
      expect(get.status).toBe(200);
      expect(await get.json()).toEqual(JSON.parse(envelope));
    }

    const privateKey = await worker.fetch(apiRequest('/api/data/bakeryos_square_credentials', {
      method: 'PUT',
      headers,
      body: envelope,
    }), env as never);
    expect(privateKey.status).toBe(400);
  });

  test('returns token-safe Square status and clears credentials explicitly', async () => {
    const env = makeEnv();
    const headers = { 'Content-Type': 'application/json', 'X-Bakery-Token': TOKEN };

    const save = await worker.fetch(apiRequest('/api/square/credentials', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        credentials: [
          { location_id: 'food1', access_token: 'secret-square-token', square_location_id: 'LOC123' },
        ],
      }),
    }), env as never);
    expect(save.status).toBe(204);

    const status = await worker.fetch(apiRequest('/api/square/credentials', {
      headers: { 'X-Bakery-Token': TOKEN },
    }), env as never);
    const statuses = await status.json() as unknown[];
    expect(JSON.stringify(statuses)).not.toContain('secret-square-token');
    expect(statuses).toContainEqual({ location_id: 'food1', square_location_id: 'LOC123', configured: true });

    const clear = await worker.fetch(apiRequest('/api/square/credentials', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        credentials: [
          { location_id: 'food1', access_token: '', square_location_id: '', clear: true },
        ],
      }),
    }), env as never);
    expect(clear.status).toBe(204);

    const clearedStatus = await worker.fetch(apiRequest('/api/square/credentials', {
      headers: { 'X-Bakery-Token': TOKEN },
    }), env as never);
    const cleared = await clearedStatus.json() as unknown[];
    expect(cleared).toContainEqual({ location_id: 'food1', square_location_id: '', configured: false });
  });
});

