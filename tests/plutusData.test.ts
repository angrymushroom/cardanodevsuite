import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectPlutusData } from '../lib/plutusData';

const json = '{"constructor":0,"fields":[{"bytes":"deadbeef"},{"int":42}]}';
const indefiniteCbor = 'd8799f44deadbeef182aff';
const definiteCbor = 'd8798244deadbeef182a';

test('detailed JSON converts to CBOR and a reproducible datum hash', () => {
  const inspected = inspectPlutusData(json, 'json');
  assert.equal(inspected.cbor, indefiniteCbor);
  assert.equal(inspected.hash, '57fdb06bf46f0cb912c51337257f10303a8435eebdabb5ac4628e9692c489294');
  assert.equal(inspected.bytes, indefiniteCbor.length / 2);
  assert.equal(inspectPlutusData(indefiniteCbor, 'cbor', inspected.hash).matchesExpected, true);
});

test('same decoded JSON can have a different hash when CBOR bytes differ', () => {
  const fromJson = inspectPlutusData(json, 'json');
  const fromCbor = inspectPlutusData(definiteCbor, 'cbor', fromJson.hash);
  assert.deepEqual(JSON.parse(fromCbor.json), JSON.parse(fromJson.json));
  assert.notEqual(fromCbor.hash, fromJson.hash);
  assert.equal(fromCbor.matchesExpected, false);
  assert.equal(fromCbor.cbor, definiteCbor);
});

test('invalid data and malformed expected hashes are rejected', () => {
  assert.throws(() => inspectPlutusData('', 'json'), /Enter Plutus data/);
  assert.throws(() => inspectPlutusData('{"bytes":"zz"}', 'json'), /Invalid detailed/);
  assert.throws(() => inspectPlutusData('abc', 'cbor'), /even-length/);
  assert.throws(() => inspectPlutusData('00', 'cbor', 'bad'), /64 hexadecimal/);
});
