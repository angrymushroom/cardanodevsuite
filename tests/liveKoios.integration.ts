import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { KoiosProvider } from '@meshsdk/core';
import { NextRequest } from 'next/server';
import { GET, POST } from '../app/api/koios/[network]/[endpoint]/route';
import { fetchAddressUTxOsStrict } from '../lib/provider';
import { parseTransactionInfo } from '../lib/transactionDiagnostics';

// Confirmed preprod transaction and an address with a live UTxO at test creation.
// These are chain identifiers, not simulated provider responses.
const txHash = 'f342a20a5a19de440c866c14310cbf49f728518f7d04e6af35d2586d09167308';
const address = 'addr_test1qzy3qqnze8xjwdvf9key9qa3vku6xrc3s4d5z4e255apkhzxdla0v7s48vcqtput82tmutff84nc93gce7qe6varqpssugamct';
const context = (endpoint: string) => ({ params: Promise.resolve({ network: 'preprod', endpoint }) });

test('same-origin proxy reaches the live preprod chain tip', { timeout: 30_000 }, async () => {
  const request = new NextRequest('http://localhost/api/koios/preprod/tip');
  const response = await GET(request, context('tip'));
  assert.equal(response.status, 200);
  const rows = await response.json();
  assert.ok(Array.isArray(rows) && rows.length > 0);
  assert.match(rows[0].hash, /^[0-9a-f]{64}$/i);
  assert.ok(Number.isSafeInteger(rows[0].block_height) && rows[0].block_height > 0);
});

test('transaction parser accepts a real preprod confirmation through the proxy', { timeout: 30_000 }, async () => {
  let confirmed;
  // Public Koios backends can briefly return an empty result; the app's watch
  // flow polls too, so allow a few real attempts before failing this check.
  for (let attempt = 0; attempt < 3 && !confirmed; attempt++) {
    const request = new NextRequest('http://localhost/api/koios/preprod/tx_info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _tx_hashes: [txHash] }),
    });
    const response = await POST(request, context('tx_info'));
    assert.equal(response.status, 200);
    confirmed = parseTransactionInfo(await response.json(), txHash);
    if (!confirmed && attempt < 2) await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.equal(confirmed?.hash, txHash);
  assert.ok(confirmed.blockHeight > 0);
  assert.ok(confirmed.fee !== '0');
});

test('Mesh converts real Koios address UTxOs through the app helper', { timeout: 30_000 }, async () => {
  // Mesh sends an Authorization header that public Koios rejects. The app's
  // same-origin route removes it, so exercise the SDK through that route.
  const server = createServer(async (incoming, outgoing) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      const request = new NextRequest(`http://localhost${incoming.url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Buffer.concat(chunks).toString(),
      });
      const response = await POST(request, context('address_info'));
      outgoing.writeHead(response.status, { 'Content-Type': response.headers.get('Content-Type') || 'application/json' });
      outgoing.end(await response.text());
    } catch (error) {
      outgoing.writeHead(500);
      outgoing.end(String(error));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const listening = server.address();
    if (!listening || typeof listening === 'string') throw new Error('Local test proxy did not start.');
    const provider = new KoiosProvider(`http://127.0.0.1:${listening.port}/api/koios/preprod`);
    const utxos = await fetchAddressUTxOsStrict(provider, address);
    assert.ok(utxos.length > 0, 'The reference address must still hold a UTxO; update it if spent.');
    for (const utxo of utxos) {
      assert.equal(utxo.output.address, address);
      assert.match(utxo.input.txHash, /^[0-9a-f]{64}$/i);
      assert.ok(utxo.output.amount.some(asset => asset.unit === 'lovelace' && BigInt(asset.quantity) > 0n));
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
