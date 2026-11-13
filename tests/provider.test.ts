import assert from 'node:assert/strict';
import test from 'node:test';
import type { KoiosProvider, UTxO } from '@meshsdk/core';
import { fetchAddressUTxOsStrict } from '../lib/provider';

const utxo = { input: { txHash: 'a'.repeat(64), outputIndex: 0 } } as UTxO;

test('script address lookup distinguishes an empty address from a provider failure', async () => {
  const empty = {
    post: async () => [{ utxo_set: [] }],
    fetchAddressUTxOs: async () => [],
  } as unknown as Pick<KoiosProvider, 'post' | 'fetchAddressUTxOs'>;
  assert.deepEqual(await fetchAddressUTxOsStrict(empty, 'addr_test1...'), []);

  const populated = {
    post: async () => [{ utxo_set: [{}] }],
    fetchAddressUTxOs: async () => [utxo],
  } as unknown as Pick<KoiosProvider, 'post' | 'fetchAddressUTxOs'>;
  assert.deepEqual(await fetchAddressUTxOsStrict(populated, 'addr_test1...'), [utxo]);

  const failed = {
    post: async () => { throw new Error('Koios unavailable'); },
    fetchAddressUTxOs: async () => [],
  } as unknown as Pick<KoiosProvider, 'post' | 'fetchAddressUTxOs'>;
  await assert.rejects(fetchAddressUTxOsStrict(failed, 'addr_test1...'), /Koios unavailable/);
  await assert.rejects(fetchAddressUTxOsStrict({ ...populated, fetchAddressUTxOs: async () => [] }, 'addr_test1...'), /Could not load/);
});
