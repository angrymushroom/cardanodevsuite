'use client';

import { useState } from 'react';
import { inspectPlutusData, type PlutusDataFormat, type PlutusDataInspection } from '../lib/plutusData';

type Props = {
  initialFormat?: PlutusDataFormat;
  initialValue?: string;
  initialExpectedHash?: string;
};

const exampleJson = '{\n  "constructor": 0,\n  "fields": [\n    { "bytes": "deadbeef" },\n    { "int": 42 }\n  ]\n}';

export default function PlutusDataLab({ initialFormat = 'json', initialValue = '', initialExpectedHash = '' }: Props) {
  const [format, setFormat] = useState<PlutusDataFormat>(initialFormat);
  const [value, setValue] = useState(initialValue);
  const [expectedHash, setExpectedHash] = useState(initialExpectedHash);
  const [result, setResult] = useState<PlutusDataInspection | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  function analyze() {
    try {
      setResult(inspectPlutusData(value, format, expectedHash));
      setError('');
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch { setCopied('Clipboard unavailable'); }
  }

  return <section className="bg-slate-900 border border-slate-700 rounded-2xl p-8 space-y-5">
    <div>
      <h2 className="text-2xl font-bold">Plutus Data Lab</h2>
      <p className="text-sm text-slate-400 mt-2">Inspect datum or redeemer data locally. Convert detailed JSON and CBOR, calculate the datum hash, and compare it with an expected hash. No wallet or network request is needed.</p>
    </div>
    <div className="flex gap-2" role="group" aria-label="Input format">
      <button onClick={() => { setFormat('json'); setResult(null); }} className={`px-4 py-2 rounded-lg ${format === 'json' ? 'bg-violet-600' : 'bg-slate-700'}`}>Detailed JSON</button>
      <button onClick={() => { setFormat('cbor'); setResult(null); }} className={`px-4 py-2 rounded-lg ${format === 'cbor' ? 'bg-violet-600' : 'bg-slate-700'}`}>CBOR Hex</button>
    </div>
    <label className="block text-sm text-slate-300">{format === 'json' ? 'Detailed Plutus JSON' : 'Plutus data CBOR hex'}
      <textarea value={value} onChange={event => { setValue(event.target.value); setResult(null); }} spellCheck={false} placeholder={format === 'json' ? exampleJson : 'd8799f...'} className="mt-1 block w-full h-44 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs" />
    </label>
    <div className="flex gap-3 items-center">
      <button onClick={analyze} className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg font-semibold">Analyze</button>
      <button onClick={() => { setFormat('json'); setValue(exampleJson); setExpectedHash(''); setResult(null); }} className="text-violet-300 hover:underline text-sm">Load example</button>
    </div>
    <label className="block text-sm text-slate-300">Expected datum hash (optional)
      <input value={expectedHash} onChange={event => { setExpectedHash(event.target.value); setResult(null); }} placeholder="64 hexadecimal characters" className="mt-1 block w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs" />
    </label>
    {error && <p className="text-red-400 text-sm bg-red-900/30 rounded-lg p-3">{error}</p>}
    {result && <div className="space-y-4 border-t border-slate-700 pt-5 text-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-2"><p>CBOR size: <strong>{result.bytes} bytes</strong></p>{result.matchesExpected !== null && <p className={result.matchesExpected ? 'text-green-400' : 'text-red-400'}>{result.matchesExpected ? 'Hash matches expected value' : 'Hash does not match expected value'}</p>}</div>
      <div><div className="flex justify-between items-center"><h3 className="font-semibold">Datum hash (Blake2b-256)</h3><button onClick={() => copy('hash', result.hash)} className="text-violet-300 hover:underline">Copy</button></div><p className="font-mono text-xs break-all bg-slate-950 p-3 rounded">{result.hash}</p></div>
      <div><div className="flex justify-between items-center"><h3 className="font-semibold">CBOR hex</h3><button onClick={() => copy('cbor', result.cbor)} className="text-violet-300 hover:underline">Copy</button></div><p className="font-mono text-xs break-all bg-slate-950 p-3 rounded max-h-36 overflow-y-auto">{result.cbor}</p></div>
      <div><div className="flex justify-between items-center"><h3 className="font-semibold">Detailed JSON</h3><button onClick={() => copy('json', result.json)} className="text-violet-300 hover:underline">Copy</button></div><pre className="font-mono text-xs whitespace-pre-wrap break-all bg-slate-950 p-3 rounded max-h-64 overflow-y-auto">{result.json}</pre></div>
      {copied && <p className="text-green-400 text-xs" role="status">{copied === 'Clipboard unavailable' ? copied : `Copied ${copied}`}</p>}
    </div>}
    <p className="text-xs text-slate-500">The hash depends on the exact CBOR bytes. Two CBOR encodings can decode to the same JSON yet have different hashes; import the original CBOR to compare with an on-chain hash.</p>
  </section>;
}
