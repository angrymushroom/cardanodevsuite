'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PlutusData, PlutusDatumSchema } from '@emurgo/cardano-serialization-lib-asmjs';

interface Amount {
  unit: string;
  quantity: string;
}

// Supports both Blockfrost REST API shape and MeshSDK UTxO shape
interface BlockfrostUtxo {
  tx_hash: string;
  output_index: number;
  amount: Amount[];
  data_hash: string | null;
  inline_datum: string | null;
}

interface MeshUtxo {
  input: { txHash: string; outputIndex: number };
  output: { address: string; amount: Amount[]; dataHash?: string; plutusData?: string };
}

type UTxODetailModalProps = {
  utxo: BlockfrostUtxo | MeshUtxo;
  onClose: () => void;
};

const DetailRow = ({ label, value, isMono = true, isBreakable = false }: { label: string; value?: string; isMono?: boolean; isBreakable?: boolean }) => (
  <div>
    <p className="text-sm text-slate-400">{label}</p>
    <p className={`font-semibold text-slate-100 ${isMono ? 'font-mono text-xs' : ''} ${isBreakable ? 'break-all' : 'truncate'}`}>
      {value || 'N/A'}
    </p>
  </div>
);

export default function UTxODetailModal({ utxo, onClose }: UTxODetailModalProps) {
  const [decodedDatum, setDecodedDatum] = useState<object | null>(null);

  const isMesh = 'input' in utxo;
  const amountList: Amount[] = isMesh ? utxo.output.amount : utxo.amount;
  const dataHash: string | null | undefined = isMesh ? utxo.output.dataHash : utxo.data_hash;
  const inlineDatum: string | null | undefined = isMesh ? utxo.output.plutusData : utxo.inline_datum;
  const txHash: string = isMesh ? utxo.input.txHash : utxo.tx_hash;
  const outputIndex: number = isMesh ? utxo.input.outputIndex : utxo.output_index;

  useEffect(() => {
    if (inlineDatum) {
      try {
        const plutusData = PlutusData.from_hex(inlineDatum);
        const datumJson = JSON.parse(plutusData.to_json(PlutusDatumSchema.DetailedSchema));
        setDecodedDatum(datumJson);
      } catch {
        setDecodedDatum({ error: 'Failed to decode datum CBOR.' });
      }
    } else {
      setDecodedDatum(null);
    }
  }, [inlineDatum]);

  const totalAda = (parseInt(amountList.find(a => a.unit === 'lovelace')?.quantity || '0') / 1000000).toFixed(6);
  const otherAssets = amountList.filter(a => a.unit !== 'lovelace');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl space-y-4 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">UTxO Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3 bg-slate-800 p-4 rounded-lg">
          <DetailRow label="Total ADA" value={totalAda} isBreakable />
          <DetailRow label="Tx Hash" value={txHash} isBreakable />
          <DetailRow label="Output Index" value={outputIndex?.toString()} isMono={false} />
          <DetailRow label="Datum Hash" value={dataHash ?? undefined} isBreakable />
          <DetailRow label="Inline Datum (CBOR)" value={inlineDatum ?? undefined} isBreakable />
          {otherAssets.length > 0 && (
            <div>
              <p className="text-sm text-slate-400">Other Assets</p>
              {otherAssets.map((a, i) => (
                <p key={i} className="font-mono text-xs text-slate-100 break-all">{a.quantity} {a.unit}</p>
              ))}
            </div>
          )}
          <div className="pt-2">
            <p className="text-sm text-slate-400">Decoded Datum (JSON)</p>
            <div className="max-h-48 overflow-y-auto bg-slate-950 p-3 rounded-lg mt-1">
              <pre className="text-xs font-mono text-amber-300">
                {decodedDatum ? JSON.stringify(decodedDatum, null, 2) : 'No inline datum to decode.'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
