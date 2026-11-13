import { PlutusData, PlutusDatumSchema, hash_plutus_data } from '@emurgo/cardano-serialization-lib-asmjs';

export type PlutusDataFormat = 'json' | 'cbor';

export type PlutusDataInspection = {
  json: string;
  cbor: string;
  hash: string;
  bytes: number;
  matchesExpected: boolean | null;
};

export function inspectPlutusData(input: string, format: PlutusDataFormat, expectedHash = ''): PlutusDataInspection {
  const value = input.trim();
  if (!value) throw new Error('Enter Plutus data before analyzing.');
  const expected = expectedHash.trim().toLowerCase();
  if (expected && !/^[0-9a-f]{64}$/.test(expected)) throw new Error('Expected datum hash must be 64 hexadecimal characters.');

  let data: PlutusData;
  try {
    if (format === 'json') {
      data = PlutusData.from_json(value, PlutusDatumSchema.DetailedSchema);
    } else {
      if (!/^(?:[0-9a-fA-F]{2})+$/.test(value)) throw new Error('CBOR must be an even-length hexadecimal string.');
      data = PlutusData.from_hex(value);
    }
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith('CBOR must')) throw cause;
    throw new Error(format === 'json' ? 'Invalid detailed Plutus JSON. Use constructor/fields, int, bytes, list, or map objects.' : 'Invalid Plutus data CBOR.');
  }

  const cbor = data.to_hex();
  const hash = hash_plutus_data(data).to_hex();
  return {
    json: JSON.stringify(JSON.parse(data.to_json(PlutusDatumSchema.DetailedSchema)), null, 2),
    cbor,
    hash,
    bytes: cbor.length / 2,
    matchesExpected: expected ? hash === expected : null,
  };
}
