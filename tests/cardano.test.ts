import assert from 'node:assert/strict';
import test from 'node:test';
import { Address, Credential, Ed25519KeyHash, EnterpriseAddress } from '@emurgo/cardano-serialization-lib-asmjs';
import { adaToLovelace, assertAddressNetwork, explorerTxUrl, formatAda, koiosNetwork, walletNetwork } from '../lib/cardano';

function makeAddress(networkId: number): string {
  const credential = Credential.from_keyhash(Ed25519KeyHash.from_hex('00'.repeat(28)));
  return EnterpriseAddress.new(networkId, credential).to_address().to_bech32();
}

test('ADA amounts preserve exact lovelace and reject invalid precision', () => {
  assert.equal(adaToLovelace('0.000001'), '1');
  assert.equal(adaToLovelace('12.345678'), '12345678');
  assert.equal(adaToLovelace('9007199254740993.000001'), '9007199254740993000001');
  assert.equal(formatAda('12345678'), '12.345678');
  assert.equal(formatAda('1'), '0.000001');
  for (const value of ['0', '-1', '1e3', '1.0000001', '0.0000001', 'NaN']) {
    assert.throws(() => adaToLovelace(value));
  }
});

test('wallet network and address validation keep mainnet and testnets apart', () => {
  const mainnet = makeAddress(1);
  const testnet = makeAddress(0);
  assert.equal(Address.from_bech32(mainnet).network_id(), 1);
  assert.equal(walletNetwork(1, 'preview'), 'mainnet');
  assert.equal(walletNetwork(0, 'preview'), 'preview');
  assert.equal(koiosNetwork('mainnet'), 'api');
  assert.doesNotThrow(() => assertAddressNetwork(mainnet, 'mainnet'));
  assert.doesNotThrow(() => assertAddressNetwork(testnet, 'preprod'));
  assert.throws(() => assertAddressNetwork(mainnet, 'preview'));
  assert.throws(() => assertAddressNetwork(testnet, 'mainnet'));
  assert.throws(() => assertAddressNetwork('addr_test1invalid', 'preprod'));
});

test('explorer links follow the selected chain', () => {
  assert.equal(explorerTxUrl('mainnet', 'abc'), 'https://cardanoscan.io/transaction/abc');
  assert.equal(explorerTxUrl('preprod', 'abc'), 'https://preprod.cardanoscan.io/transaction/abc');
  assert.equal(explorerTxUrl('preview', 'abc'), 'https://preview.cardanoscan.io/transaction/abc');
});
