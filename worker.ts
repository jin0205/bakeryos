/**
 * BakeryOS Cloudflare Worker
 *
 * - Serves the Vite-built SPA (./dist) for all non-API routes
 * - Proxies POST /api/messages → https://api.anthropic.com/v1/messages
 *   so the ANTHROPIC_API_KEY secret never ships to the browser
 */

export interface Env {
  /** Cloudflare static-asset binding (populated from wrangler.jsonc assets.directory) */
  ASSETS: Fetcher;
  /** Cloudflare secret — set via: wrangler secret put ANTHROPIC_API_KEY */
  ANTHROPIC_API_KEY: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Route API calls to Anthropic proxy
    if (url.pathname === '/api/messages' && request.method === 'POST') {
      return proxyToAnthropic(request, env);
    }

    // All other requests → serve SPA static assets
    // not_found_handling: "single-page-application" (in wrangler.jsonc) means
    // missing paths fall back to index.html automatically.
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

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

  // Extended thinking requires a beta header — detect from request body
  try {
    const parsed = JSON.parse(body) as { thinking?: { type?: string } };
    if (parsed.thinking?.type === 'enabled') {
      headers['anthropic-beta'] = 'interleaved-thinking-2025-05-14';
    }
  } catch {
    // Body is not valid JSON or unexpected shape — proceed without beta header
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
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
