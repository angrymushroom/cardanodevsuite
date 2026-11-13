import assert from 'node:assert/strict';
import test from 'node:test';
import { isTransactionHash, parseTransactionInfo, transactionErrorHint } from '../lib/transactionDiagnostics';

const hash = 'a'.repeat(64);

test('transaction lookup validates hashes and distinguishes not found from confirmed', () => {
  assert.equal(isTransactionHash(` ${hash} `), true);
  assert.equal(isTransactionHash('abc'), false);
  assert.equal(parseTransactionInfo([], hash), null);
  assert.throws(() => parseTransactionInfo({ error: 'bad' }, hash));
  const result = parseTransactionInfo([{
    tx_hash: hash,
    block_hash: 'b'.repeat(64),
    block_height: 100,
    absolute_slot: 200,
    fee: '180000',
    tx_size: 300,
    tx_timestamp: 1790000000,
  }], hash);
  assert.equal(result?.hash, hash);
  assert.equal(result?.slot, 200);
  assert.equal(result?.fee, '180000');
  assert.throws(() => parseTransactionInfo([{ tx_hash: 'c'.repeat(64) }], hash));
});

test('transaction errors give recovery guidance only for recognized cases', () => {
  assert.match(transactionErrorHint(new Error('BadInputsUTxO')) || '', /Refresh UTxOs/);
  assert.match(transactionErrorHint('OutsideValidityIntervalUTxO') || '', /Rebuild/);
  assert.match(transactionErrorHint('ValueNotConservedUTxO') || '', /Inputs/);
  assert.match(transactionErrorHint('FeeTooSmallUTxO') || '', /protocol parameters/);
  assert.match(transactionErrorHint('429 Too Many Requests') || '', /rate limiting/);
  assert.equal(transactionErrorHint('Unknown error'), null);
});
