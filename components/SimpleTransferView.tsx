'use client';

import { useState } from 'react';
import { Transaction, UTxO } from '@meshsdk/core';
import { useWallet } from '@meshsdk/react';
import { FormInput, FormTextarea } from './Form';
import CopyButton from './CopyButton';

const CARDANOSCAN_BASE_URL = process.env.NEXT_PUBLIC_CARDANOSCAN_BASE_URL ?? 'https://preprod.cardanoscan.io';

interface TxSummary {
  fee: string;
  change: string;
  cbor: string;
}

interface SimpleTransferViewProps {
  connected: boolean;
  wallet: ReturnType<typeof useWallet>['wallet'];
  address: string | undefined;
  updateWalletState: () => void;
  selectedUtxos: UTxO[];
}

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center bg-slate-800 p-2 rounded-md">
    <span className="text-slate-400">{label}</span>
    <span className="font-mono font-bold">{value}</span>
  </div>
);

export default function SimpleTransferView({ connected, wallet, address, updateWalletState, selectedUtxos }: SimpleTransferViewProps) {
  const [loading, setLoading]       = useState(false);
  const [txHash, setTxHash]         = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [recipient, setRecipient]   = useState('');
  const [amount, setAmount]         = useState('');
  const [metadata, setMetadata]     = useState('{}');
  const [unsignedTx, setUnsignedTx] = useState<string | null>(null);
  const [summary, setSummary]       = useState<TxSummary | null>(null);

  async function buildPreview() {
    if (!wallet) return;

    if (!recipient.trim()) {
      setError('Recipient address is required.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    if (metadata.trim() && metadata.trim() !== '{}') {
      try { JSON.parse(metadata); } catch {
        setError('Metadata must be valid JSON.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSummary(null);
    setUnsignedTx(null);
    try {
      const tx = new Transaction({ initiator: wallet });
      tx.sendLovelace(recipient, (parsedAmount * 1000000).toString());
      if (selectedUtxos.length > 0) tx.setTxInputs(selectedUtxos);

      if (metadata.trim() !== '{}' && metadata.trim() !== '') {
        const metadataJson = JSON.parse(metadata);
        const label = Object.keys(metadataJson)[0];
        tx.setMetadata(parseInt(label), metadataJson[label]);
      }

      const builtTxCbor = await tx.build();
      if (!builtTxCbor) throw new Error('Failed to build transaction.');

      setUnsignedTx(builtTxCbor);

      const txBody = tx.txBuilder.meshTxBuilderBody;
      const change = txBody.outputs.find((o: { address: string }) => o.address === address);
      setSummary({
        fee: txBody.fee,
        change: change?.amount.find((a: { unit: string; quantity: string }) => a.unit === 'lovelace')?.quantity || '0',
        cbor: builtTxCbor,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to build transaction.');
    } finally {
      setLoading(false);
    }
  }

  async function signAndSubmit() {
    if (!wallet || !unsignedTx) return;
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      const signedTx = await wallet.signTx(unsignedTx);
      const hash = await wallet.submitTx(signedTx);
      setTxHash(hash);
      setSummary(null);
      setUnsignedTx(null);
      updateWalletState();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transaction failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Builder</h2>
          <div className="space-y-4">
            <FormInput label="Recipient Address" placeholder="addr_test1..." value={recipient} onChange={setRecipient} />
            <FormInput label="Amount (ADA)" placeholder="0.0" value={amount} onChange={setAmount} />
            <FormTextarea label="Metadata (JSON, optional)" value={metadata} onChange={setMetadata} />
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Pre-flight Summary</h2>
          <div className="space-y-3 text-sm">
            <SummaryRow label="Calculated Fee:" value={summary ? `${parseInt(summary.fee) / 1000000} ADA` : '-'} />
            <SummaryRow label="Change Output:" value={summary ? `${parseInt(summary.change) / 1000000} ADA` : '-'} />
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-300">Transaction CBOR</label>
                {summary && <CopyButton textToCopy={summary.cbor} />}
              </div>
              <textarea readOnly value={summary ? summary.cbor : ''} className="w-full h-24 bg-slate-950 text-xs p-2 rounded-md font-mono break-all resize-none border border-slate-700" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
          <button onClick={buildPreview} disabled={loading || !connected} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500">
            {loading && !unsignedTx ? 'Building...' : 'Build & Preview'}
          </button>
          <button onClick={signAndSubmit} disabled={!unsignedTx || loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500">
            {loading && unsignedTx ? 'Submitting...' : 'Sign & Submit'}
          </button>
          {error && <div className="text-red-400 text-sm text-center p-2 bg-red-900/50 rounded-md">{error}</div>}
          {txHash && (
            <div className="text-green-400 text-sm text-center p-2 bg-green-900/50 rounded-md">
              Success! Tx ID: <a href={`${CARDANOSCAN_BASE_URL}/transaction/${txHash}`} target="_blank" rel="noreferrer" className="underline font-mono text-xs break-all">{txHash}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
