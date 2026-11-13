'use client';

import { useEffect, useRef, useState } from 'react';
import { createKoiosProvider } from '../lib/provider';
import { explorerTxUrl, formatAda, type CardanoNetwork } from '../lib/cardano';
import { isTransactionHash, parseTransactionInfo, type ConfirmedTransaction } from '../lib/transactionDiagnostics';

type Props = {
  initialHash?: string;
  initialNetwork: CardanoNetwork;
  onConfirmed?: (hash: string, network: CardanoNetwork) => void;
};

export default function TransactionWatch({ initialHash = '', initialNetwork, onConfirmed }: Props) {
  const [hash, setHash] = useState(initialHash);
  const [network, setNetwork] = useState<CardanoNetwork>(initialNetwork);
  const [watching, setWatching] = useState(Boolean(initialHash));
  const [status, setStatus] = useState<'idle' | 'checking' | 'not_found' | 'confirmed' | 'provider_error' | 'timed_out'>('idle');
  const [info, setInfo] = useState<ConfirmedTransaction | null>(null);
  const [error, setError] = useState('');
  const confirmedCallback = useRef(onConfirmed);
  useEffect(() => { confirmedCallback.current = onConfirmed; }, [onConfirmed]);

  useEffect(() => {
    if (!watching || !isTransactionHash(hash)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();
    const normalizedHash = hash.trim().toLowerCase();
    const provider = createKoiosProvider(network);

    async function check() {
      if (cancelled) return;
      setStatus('checking');
      try {
        const rows = await provider.post('tx_info', { _tx_hashes: [normalizedHash] });
        if (cancelled) return;
        const confirmed = parseTransactionInfo(rows, normalizedHash);
        if (confirmed) {
          setInfo(confirmed);
          setError('');
          setStatus('confirmed');
          setWatching(false);
          confirmedCallback.current?.(normalizedHash, network);
          return;
        }
        setStatus('not_found');
        setError('');
      } catch (cause) {
        if (cancelled) return;
        setStatus('provider_error');
        setError(cause instanceof Error ? cause.message : String(cause));
      }
      if (Date.now() - startedAt >= 10 * 60_000) {
        setStatus('timed_out');
        setWatching(false);
      } else {
        timer = setTimeout(check, 5_000);
      }
    }

    void check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [hash, network, watching]);

  function resetHash(value: string) {
    setHash(value);
    setWatching(false);
    setInfo(null);
    setStatus('idle');
  }

  return <section className="bg-slate-900 border border-slate-700 rounded-2xl p-8 space-y-5">
    <div>
      <h2 className="text-2xl font-bold">Transaction Watch</h2>
      <p className="text-sm text-slate-400 mt-2">Check when a submitted transaction appears on-chain. No wallet is required for lookup.</p>
    </div>
    <label className="block text-sm text-slate-300">Transaction hash
      <input value={hash} onChange={event => resetHash(event.target.value)} placeholder="64 hexadecimal characters" className="mt-1 block w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs" />
    </label>
    <label className="block text-sm text-slate-300">Network
      <select value={network} onChange={event => { setNetwork(event.target.value as CardanoNetwork); setWatching(false); setInfo(null); setStatus('idle'); }} className="mt-1 block w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
        <option value="mainnet">Mainnet</option><option value="preprod">Preprod</option><option value="preview">Preview</option>
      </select>
    </label>
    <div className="flex gap-3">
      <button onClick={() => { setInfo(null); setWatching(true); }} disabled={!isTransactionHash(hash) || watching} className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg font-semibold disabled:opacity-50">Check &amp; Watch</button>
      {watching && <button onClick={() => { setWatching(false); if (status === 'checking') setStatus('idle'); }} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg">Stop</button>}
    </div>
    {hash && !isTransactionHash(hash) && <p className="text-amber-400 text-sm">Enter a 64-character hexadecimal transaction hash.</p>}
    {status === 'checking' && <p className="text-slate-300 text-sm">Checking {network}...</p>}
    {status === 'not_found' && <p className="text-amber-300 text-sm">Not indexed yet. This can mean propagation delay, an incorrect hash, or the wrong network. {watching ? 'Checking again in 5 seconds.' : 'Watch stopped.'}</p>}
    {status === 'provider_error' && <p className="text-amber-300 text-sm">Provider request failed. {watching ? 'Retrying in 5 seconds.' : 'Watch stopped.'} {error}</p>}
    {status === 'timed_out' && <p className="text-amber-300 text-sm">No confirmation found after 10 minutes. Check the hash and network, then start watching again if needed.</p>}
    {status === 'confirmed' && info && <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-sm space-y-2">
      <p className="font-bold text-green-400">Confirmed on-chain</p>
      <p>Block: <span className="font-mono break-all">{info.blockHash}</span></p>
      <p>Height: {info.blockHeight} · Slot: {info.slot}</p>
      <p>Fee: {formatAda(info.fee)} ADA · Size: {info.size} bytes</p>
      {Number.isFinite(info.timestamp) && <p>Time: {new Date(info.timestamp * 1000).toLocaleString()}</p>}
      <a href={explorerTxUrl(network, info.hash)} target="_blank" rel="noreferrer" className="inline-block text-violet-300 underline">Open in Cardanoscan</a>
    </div>}
    <p className="text-xs text-slate-500">A missing transaction is not proof of failure. This tool reads Koios every 5 seconds for at most 10 minutes and never resubmits a transaction.</p>
  </section>;
}
