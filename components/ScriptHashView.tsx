'use client';

import { useState } from 'react';
import { PlutusScript, Credential, EnterpriseAddress } from '@emurgo/cardano-serialization-lib-asmjs';

type ScriptVersion = 'V1' | 'V2' | 'V3';

interface ScriptResult {
  hash: string;
  testnetAddress: string;
  mainnetAddress: string;
}

export default function ScriptHashView() {
  const [cbor, setCbor] = useState('');
  const [version, setVersion] = useState<ScriptVersion>('V2');
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function calculate() {
    setError(null);
    setResult(null);
    try {
      const bytes = Buffer.from(cbor.trim(), 'hex');

      let scriptHash: ReturnType<typeof PlutusScript.prototype.hash>;
      if (version === 'V1') {
        scriptHash = PlutusScript.new(bytes).hash();
      } else if (version === 'V2') {
        scriptHash = PlutusScript.new_v2(bytes).hash();
      } else {
        scriptHash = PlutusScript.new_v3(bytes).hash();
      }

      const testnetCred = Credential.from_scripthash(scriptHash);
      const mainnetCred = Credential.from_scripthash(scriptHash);

      const testnetAddress = EnterpriseAddress.new(0, testnetCred).to_address().to_bech32();
      const mainnetAddress = EnterpriseAddress.new(1, mainnetCred).to_address().to_bech32();

      setResult({ hash: scriptHash.to_hex(), testnetAddress, mainnetAddress });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to compute hash. Ensure the CBOR hex is valid (from plutus.json compiledCode or Aiken blueprint).'
      );
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-2">Script Hash Calculator</h2>
      <p className="text-slate-400 text-sm mb-6">
        Compute the script hash and enterprise address for any Plutus script. Paste the <code className="text-violet-400">compiledCode</code> from your{' '}
        <code className="text-violet-400">plutus.json</code> or Aiken blueprint.
      </p>
      <div className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Script Version</label>
          <div className="flex gap-2">
            {(['V1', 'V2', 'V3'] as ScriptVersion[]).map(v => (
              <button
                key={v}
                onClick={() => setVersion(v)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  version === v ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1">Aiken compiles to V3 by default. PlutusTx legacy contracts are typically V2.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Script CBOR Hex</label>
          <textarea
            value={cbor}
            onChange={e => setCbor(e.target.value)}
            rows={4}
            placeholder="5901... (the compiledCode field from plutus.json or aiken blueprint)"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
          />
        </div>

        <button
          onClick={calculate}
          className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          Calculate Hash
        </button>

        {error && <div className="text-red-400 text-sm p-3 bg-red-900/30 rounded-lg">{error}</div>}

        {result && (
          <div className="space-y-2 mt-2">
            <FieldRow label="Script Hash" value={result.hash} mono />
            <FieldRow label="Script Address (Testnet / Preprod)" value={result.testnetAddress} mono />
            <FieldRow label="Script Address (Mainnet)" value={result.mainnetAddress} mono />
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-slate-800 rounded-lg p-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="flex items-start gap-2">
        <span className={`flex-1 ${mono ? 'font-mono text-xs break-all' : 'text-sm'} text-slate-100`}>{value}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="shrink-0 text-xs text-slate-500 hover:text-slate-300 mt-0.5"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
