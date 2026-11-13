'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as CSL from '@emurgo/cardano-serialization-lib-asmjs';
import { formatAda } from '../lib/cardano';

const DetailRow = ({ label, value, isMono = true, isBreakable = false, valueClass = '' }) => (
  <div>
    <p className="text-sm text-slate-400">{label}</p>
    <p className={`font-semibold text-slate-100 ${isMono ? 'font-mono text-xs' : ''} ${isBreakable ? 'break-all' : 'truncate'} ${valueClass}`}>
      {value || 'N/A'}
    </p>
  </div>
);

export default function UTxODetailModal({ utxo, onClose }) {
  const [decodedDatum, setDecodedDatum] = useState<any | null>(null);
  const [loadingDatum, setLoadingDatum] = useState(false);

  const amountList = utxo?.output?.amount || utxo?.amount || [];
  const dataHash = utxo?.output?.dataHash || utxo?.data_hash;
  const inlineDatum = utxo?.output?.plutusData || utxo?.inline_datum;
  const txHash = utxo?.input?.txHash || utxo?.tx_hash;
  const outputIndex = utxo?.input?.outputIndex ?? utxo?.output_index;

  useEffect(() => {
    async function decodeDatum() {
      if (inlineDatum) {
        setLoadingDatum(true);
        try {
          const plutusData = CSL.PlutusData.from_hex(inlineDatum);
          const datumJson = JSON.parse(plutusData.to_json(CSL.PlutusDatumSchema.DetailedSchema));
          setDecodedDatum(datumJson);
        } catch {
          setDecodedDatum({ error: 'Failed to decode datum CBOR.' });
        } finally {
          setLoadingDatum(false);
        }
      } else {
        setDecodedDatum(null);
      }
    }
    decodeDatum();
  }, [inlineDatum]);

  if (!utxo) return null;

  const totalAda = formatAda(amountList.find(a => a.unit === 'lovelace')?.quantity || '0');
  const otherAssets = amountList.filter(a => a.unit !== 'lovelace');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl space-y-4 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24} /></button>
        <h2 className="text-xl font-bold text-violet-400">UTxO Details</h2>
        <div className="space-y-3 bg-slate-800 p-4 rounded-lg">
          <DetailRow label="Total ADA" value={`${totalAda} ADA`} isMono={false} valueClass="text-lg" />
          <DetailRow label="Transaction Output" value={`${txHash}#${outputIndex}`} isBreakable />
        </div>
        <div className="space-y-3 bg-slate-800 p-4 rounded-lg">
          <h3 className="text-lg font-bold">All Assets</h3>
          {otherAssets.length > 0 ? (
            otherAssets.map(asset => (<p key={asset.unit} className="font-mono text-xs text-slate-100 mt-1">{asset.quantity} of {asset.unit.slice(56)}</p>))
          ) : ( <p className="text-sm text-slate-400">This UTxO only contains ADA.</p> )}
        </div>
        <div className="space-y-3 bg-slate-800 p-4 rounded-lg">
          <h3 className="text-lg font-bold">Smart Contract Data</h3>
          <DetailRow label="Datum Hash" value={dataHash} isBreakable />
          <div className="pt-2">
            <p className="text-sm text-slate-400">Decoded Datum (JSON)</p>
            <div className="max-h-48 overflow-y-auto bg-slate-950 p-3 rounded-lg mt-1">
              <pre className="text-xs font-mono text-amber-300 whitespace-pre-wrap">
                {loadingDatum ? 'Decoding...' : JSON.stringify(decodedDatum, null, 2) || 'No inline datum to decode.'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
