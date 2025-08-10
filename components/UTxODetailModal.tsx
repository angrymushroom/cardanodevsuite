'use client';

import { UTxO } from '@meshsdk/core';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
// Import the CSL library
import { PlutusData, PlutusDatumSchema } from '@emurgo/cardano-serialization-lib-asmjs';

type UTxODetailModalProps = {
  utxo: any | null;
  onClose: () => void;
};


const DetailRow = ({ label, value, isMono = true, isBreakable = false }) => (
  <div>
    <p className="text-sm text-slate-400">{label}</p>
    <p className={`font-semibold text-slate-100 ${isMono ? 'font-mono text-xs' : ''} ${isBreakable ? 'break-all' : 'truncate'}`}>
      {value || 'N/A'}
    </p>
  </div>
);

export default function UTxODetailModal({ utxo, onClose }: UTxODetailModalProps) {
  const [decodedDatum, setDecodedDatum] = useState<any | null>(null);
  const amountList = utxo?.output ? utxo.output.amount : utxo?.amount || [];
  const dataHash = utxo?.output ? utxo.output.dataHash : utxo?.data_hash;
  const inlineDatum = utxo?.output ? utxo.output.plutusData : utxo?.inline_datum;
  const txHash = utxo?.input ? utxo.input.txHash : utxo?.tx_hash;
  const outputIndex = utxo?.input ? utxo.input.outputIndex : utxo?.output_index;

  // This effect now decodes the datum locally
  useEffect(() => {
    if (inlineDatum) {
      try {
        const plutusData = PlutusData.from_hex(inlineDatum);
        const datumJson = JSON.parse(plutusData.to_json(PlutusDatumSchema.DetailedSchema));
        setDecodedDatum(datumJson);
      } catch (error) {
        console.error("Failed to decode datum locally:", error);
        setDecodedDatum({ error: 'Failed to decode datum CBOR.' });
      }
    } else {
      setDecodedDatum(null);
    }
  }, [inlineDatum]);

  if (!utxo) return null;

  const totalAda = (parseInt(amountList.find(a => a.unit === 'lovelace')?.quantity || '0') / 1000000).toFixed(6);
  const otherAssets = amountList.filter(a => a.unit !== 'lovelace');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl space-y-4 relative" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3 bg-slate-800 p-4 rounded-lg">
          <h3 className="text-lg font-bold">Smart Contract Data</h3>
          <DetailRow label="Total ADA" value={totalAda} isBreakable />
          <DetailRow label="Hash Address" value={txHash} isBreakable />
          <DetailRow label="Datum Hash" value={dataHash} isBreakable />
          <DetailRow label="Inline Datum (CBOR)" value={inlineDatum} isBreakable />
          <div className="pt-2">
              <p className="text-sm text-slate-400">Decoded Datum (JSON)</p>
                <div className="max-h-48 overflow-y-auto bg-slate-950 p-3 rounded-lg mt-1">
                <pre className="text-xs font-mono text-amber-300">
                    {JSON.stringify(decodedDatum, null, 2) || 'No inline datum to decode.'}
                </pre>
                </div>
          </div>
        </div>
      </div>
    </div>
  );
}


