/**
 * BakeryOS Cloudflare Worker
 *
 * - Serves the Vite-built SPA (./dist) for all non-API routes
 * - Proxies POST /api/messages → https://api.anthropic.com/v1/messages
 * - Handles GET/PUT /api/data/:key for KV-backed persistent storage
 */

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

const VALID_DATA_KEYS = [
  'bakeryos_recipes',
  'bakeryos_inventory',
  'bakeryos_planner_items',
  'bakeryos_work_orders',
] as const;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/api/messages' && request.method === 'POST') {
      return proxyToAnthropic(request, env);
    }

    if (url.pathname.startsWith('/api/data/')) {
      return handleDataRoute(request, env, url);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function handleDataRoute(request: Request, env: Env, url: URL): Promise<Response> {
  const token = request.headers.get('X-Bakery-Token');
  if (!token || token !== env.BAKERY_API_TOKEN) {
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
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
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
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  return errorResponse(405, 'Method not allowed');
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
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
