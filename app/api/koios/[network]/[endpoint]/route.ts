import type { NextRequest } from 'next/server';

const networks = new Set(['api', 'preprod', 'preview']);
const endpoints = new Set(['tip', 'epoch_params', 'address_info', 'ogmios', 'tx_info', 'tx_utxos']);

async function forward(request: NextRequest, context: { params: Promise<{ network: string; endpoint: string }> }) {
  const { network, endpoint } = await context.params;
  if (!networks.has(network) || !endpoints.has(endpoint)) {
    return Response.json({ error: 'Unsupported Koios network or endpoint.' }, { status: 404 });
  }
  const target = `https://${network}.koios.rest/api/v1/${endpoint}${request.nextUrl.search}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: string | undefined;
  if (request.method === 'POST') {
    body = await request.text();
    if (body.length > 250_000) return Response.json({ error: 'Request is too large.' }, { status: 413 });
    headers['Content-Type'] = 'application/json';
  }
  try {
    const upstream = await fetch(target, { method: request.method, headers, body, cache: 'no-store' });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'Koios is temporarily unavailable.' }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
