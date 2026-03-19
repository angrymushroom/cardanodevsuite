'use client';

import { useState } from 'react';
import { PlutusData, PlutusDatumSchema } from '@emurgo/cardano-serialization-lib-asmjs';

type Direction = 'toJson' | 'toCbor';

export default function CborInspectorView() {
  const [direction, setDirection] = useState<Direction>('toJson');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function convert() {
    setError(null);
    setOutput('');
    try {
      if (direction === 'toJson') {
        const data = PlutusData.from_hex(input.trim());
        const json = JSON.parse(data.to_json(PlutusDatumSchema.DetailedSchema));
        setOutput(JSON.stringify(json, null, 2));
      } else {
        const data = PlutusData.from_json(input.trim(), PlutusDatumSchema.DetailedSchema);
        setOutput(data.to_hex());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed. Check your input format.');
    }
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputLabel = direction === 'toJson' ? 'CBOR Hex Input' : 'JSON Input (DetailedSchema)';
  const outputLabel = direction === 'toJson' ? 'JSON Output (DetailedSchema)' : 'CBOR Hex Output';
  const inputPlaceholder =
    direction === 'toJson'
      ? 'd87980  (or any Plutus data CBOR hex)'
      : '{\n  "constructor": 0,\n  "fields": []\n}';

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-2">CBOR / Plutus Data Inspector</h2>
      <p className="text-slate-400 text-sm mb-6">
        Bidirectional converter between Plutus Data CBOR hex and JSON (Cardano DetailedSchema). Useful for inspecting datums,
        redeemers, and any on-chain data.
      </p>

      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setDirection('toJson'); setOutput(''); setError(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              direction === 'toJson' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            CBOR → JSON
          </button>
          <button
            onClick={() => { setDirection('toCbor'); setOutput(''); setError(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              direction === 'toCbor' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            JSON → CBOR
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{inputLabel}</label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={12}
              placeholder={inputPlaceholder}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{outputLabel}</label>
            <textarea
              readOnly
              value={output}
              rows={12}
              placeholder="Output will appear here..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono resize-y text-slate-300 cursor-default"
            />
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={convert}
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Convert
          </button>
          {output && (
            <button
              onClick={copyOutput}
              className="text-sm text-slate-400 hover:text-white border border-slate-700 py-2 px-4 rounded-lg transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy Output'}
            </button>
          )}
        </div>

        {error && <div className="text-red-400 text-sm p-3 bg-red-900/30 rounded-lg">{error}</div>}

        <div className="bg-slate-800 rounded-lg p-4 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-400">DetailedSchema format reference:</p>
          <p>Constructor: <code className="text-violet-400">{'{ "constructor": 0, "fields": [] }'}</code></p>
          <p>Integer: <code className="text-violet-400">{'{ "int": 42 }'}</code></p>
          <p>Bytes: <code className="text-violet-400">{'{ "bytes": "deadbeef" }'}</code></p>
          <p>List: <code className="text-violet-400">{'{ "list": [ ... ] }'}</code></p>
          <p>Map: <code className="text-violet-400">{'{ "map": [ { "k": ..., "v": ... } ] }'}</code></p>
        </div>
      </div>
    </div>
  );
}
