import assert from 'node:assert/strict';
import test from 'node:test';
import type { UTxO } from '@meshsdk/core';
import { transferDraftKey } from '../lib/transactionPreview';

const input = { input: { txHash: 'a'.repeat(64), outputIndex: 0 } } as UTxO;
const draft = {
  recipient: 'addr_test1recipient',
  amount: '1',
  metadata: '{}',
  network: 'preprod' as const,
  address: 'addr_test1sender',
  selectedUtxos: [input],
};

test('transfer preview key changes with every signable transaction input', () => {
  const key = transferDraftKey(draft);
  const changed = [
    { ...draft, recipient: 'addr_test1other' },
    { ...draft, amount: '2' },
    { ...draft, metadata: '{"1":"memo"}' },
    { ...draft, network: 'preview' as const },
    { ...draft, address: 'addr_test1other' },
    { ...draft, selectedUtxos: [{ input: { txHash: 'b'.repeat(64), outputIndex: 0 } } as UTxO] },
    { ...draft, selectedUtxos: [{ input: { txHash: 'a'.repeat(64), outputIndex: 1 } } as UTxO] },
  ];
  for (const candidate of changed) assert.notEqual(transferDraftKey(candidate), key);
  assert.equal(transferDraftKey({ ...draft, selectedUtxos: [{ input: { ...input.input } } as UTxO] }), key);
});
