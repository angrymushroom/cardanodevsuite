'use client';

import { useState } from 'react';
import { Transaction, TransactionBody } from '@emurgo/cardano-serialization-lib-asmjs';

interface DecodedInput {
  txHash: string;
  outputIndex: number;
}

interface DecodedOutput {
  address: string;
  lovelace: string;
  ada: string;
  multiassetCount: number;
}

interface DecodedTx {
  isSigned: boolean;
  fee: string;
  feeAda: string;
  ttl: string | null;
  validityStart: string | null;
  inputs: DecodedInput[];
  outputs: DecodedOutput[];
  hasScripts: boolean;
  witnessCount: number;
  metadataPresent: boolean;
}

export default function TxDecoderView() {
  const [cbor, setCbor] = useState('');
  const [result, setResult] = useState<DecodedTx | null>(null);
  const [error, setError] = useState<string | null>(null);

  function decode() {
    setError(null);
    setResult(null);
    const hex = cbor.trim();
    if (!hex) return;

    try {
      let body: ReturnType<Transaction['body']>;
      let isSigned = false;
      let witnessCount = 0;
      let hasScripts = false;
      let metadataPresent = false;

      // Try signed transaction first, then unsigned body
      try {
        const tx = Transaction.from_hex(hex);
        body = tx.body();
        isSigned = true;

        const witnesses = tx.witness_set();
        witnessCount = witnesses.vkeys()?.len() ?? 0;
        hasScripts =
          (witnesses.plutus_scripts()?.len() ?? 0) > 0 ||
          (witnesses.native_scripts()?.len() ?? 0) > 0;
        metadataPresent = tx.auxiliary_data() !== undefined;
      } catch {
        body = TransactionBody.from_hex(hex);
      }

      const inputs: DecodedInput[] = [];
      const txInputs = body.inputs();
      for (let i = 0; i < txInputs.len(); i++) {
        const inp = txInputs.get(i);
        inputs.push({ txHash: inp.transaction_id().to_hex(), outputIndex: inp.index() });
      }

      const outputs: DecodedOutput[] = [];
      const txOutputs = body.outputs();
      for (let i = 0; i < txOutputs.len(); i++) {
        const out = txOutputs.get(i);
        const lovelace = out.amount().coin().to_str();
        const multiasset = out.amount().multiasset();
        const multiassetCount = multiasset ? (() => {
          let count = 0;
          const keys = multiasset.keys();
          for (let j = 0; j < keys.len(); j++) {
            const assets = multiasset.get(keys.get(j));
            if (assets) count += assets.keys().len();
          }
          return count;
        })() : 0;

        let address = '(could not decode)';
        try {
          address = out.address().to_bech32();
        } catch {
          address = out.address().to_hex();
        }

        outputs.push({
          address,
          lovelace,
          ada: (parseInt(lovelace) / 1_000_000).toFixed(6),
          multiassetCount,
        });
      }

      const feeStr = body.fee().to_str();
      const ttlVal = body.ttl();
      const validityStartVal = body.validity_start_interval();

      setResult({
        isSigned,
        fee: feeStr,
        feeAda: (parseInt(feeStr) / 1_000_000).toFixed(6),
        ttl: ttlVal !== undefined && ttlVal !== null ? String(ttlVal) : null,
        validityStart: validityStartVal !== undefined && validityStartVal !== null ? String(validityStartVal) : null,
        inputs,
        outputs,
        hasScripts,
        witnessCount,
        metadataPresent,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to decode. Paste a valid transaction CBOR hex (signed or unsigned).'
      );
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-2">Transaction Decoder</h2>
      <p className="text-slate-400 text-sm mb-6">
        Paste any Cardano transaction CBOR hex (signed or unsigned) to inspect its inputs, outputs, fees, and metadata.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Transaction CBOR Hex</label>
          <textarea
            value={cbor}
            onChange={e => setCbor(e.target.value)}
            rows={5}
            placeholder="84a400818258... (full transaction CBOR hex)"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
          />
        </div>
        <button
          onClick={decode}
          className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          Decode
        </button>

        {error && <div className="text-red-400 text-sm p-3 bg-red-900/30 rounded-lg">{error}</div>}

        {result && (
          <div className="space-y-4 mt-2">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              <Badge label={result.isSigned ? 'Signed Transaction' : 'Unsigned Transaction'} color={result.isSigned ? 'green' : 'yellow'} />
              {result.hasScripts && <Badge label="Contains Scripts" color="purple" />}
              {result.metadataPresent && <Badge label="Has Metadata" color="blue" />}
              {result.isSigned && <Badge label={`${result.witnessCount} Witness(es)`} color="slate" />}
            </div>

            {/* Fee & Validity */}
            <div className="grid grid-cols-2 gap-2">
              <SummaryCard label="Fee" value={`${result.feeAda} ADA`} sub={`${result.fee} lovelace`} />
              <SummaryCard label="TTL" value={result.ttl ?? 'Not set'} sub={result.ttl ? 'slot' : undefined} />
              {result.validityStart && (
                <SummaryCard label="Valid After (slot)" value={result.validityStart} />
              )}
            </div>

            {/* Inputs */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">
                Inputs ({result.inputs.length})
              </h3>
              <div className="space-y-2">
                {result.inputs.map((inp, i) => (
                  <div key={i} className="bg-slate-800 rounded-lg p-3 font-mono text-xs">
                    <span className="text-slate-400">{i + 1}. </span>
                    <span className="text-slate-200 break-all">{inp.txHash}</span>
                    <span className="text-violet-400">#{inp.outputIndex}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Outputs */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">
                Outputs ({result.outputs.length})
              </h3>
              <div className="space-y-2">
                {result.outputs.map((out, i) => (
                  <div key={i} className="bg-slate-800 rounded-lg p-3 space-y-1">
                    <div className="font-mono text-xs text-slate-400 break-all">{out.address}</div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-bold text-slate-100">{out.ada} ADA</span>
                      {out.multiassetCount > 0 && (
                        <span className="text-xs bg-violet-900/50 text-violet-300 px-2 py-0.5 rounded">
                          +{out.multiassetCount} asset{out.multiassetCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: 'green' | 'yellow' | 'purple' | 'blue' | 'slate' }) {
  const colorMap = {
    green: 'bg-green-900/50 text-green-300',
    yellow: 'bg-yellow-900/50 text-yellow-300',
    purple: 'bg-violet-900/50 text-violet-300',
    blue: 'bg-blue-900/50 text-blue-300',
    slate: 'bg-slate-700 text-slate-300',
  };
  return <span className={`text-xs px-2 py-1 rounded font-medium ${colorMap[color]}`}>{label}</span>;
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="font-semibold text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
