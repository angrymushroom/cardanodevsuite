'use client';

import { UTxO } from '@meshsdk/core';

interface UTXOSelectorProps {
  utxos: UTxO[];
  selectedUtxos: UTxO[];
  onSelectionChange: (utxos: UTxO[]) => void;
  disabled: boolean;
}

const UTXOSelector = ({ utxos, selectedUtxos, onSelectionChange, disabled }: UTXOSelectorProps) => {
  const handleUtxoClick = (utxo: UTxO) => {
    const isSelected = selectedUtxos.some(
      (u) => u.input.txHash === utxo.input.txHash && u.input.outputIndex === utxo.input.outputIndex
    );

    if (isSelected) {
      onSelectionChange(
        selectedUtxos.filter(
          (u) => !(u.input.txHash === utxo.input.txHash && u.input.outputIndex === utxo.input.outputIndex)
        )
      );
    } else {
      onSelectionChange([...selectedUtxos, utxo]);
    }
  };

  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-2xl p-6 ${disabled ? 'opacity-50' : ''}`}>
      <h2 className="text-xl font-bold">Available UTxOs</h2>
      <p className="text-sm text-slate-400 mt-1">Select to use as inputs (optional).</p>
      
      <div className={`mt-4 space-y-2 max-h-60 overflow-y-auto pr-2 ${disabled ? 'cursor-not-allowed' : ''}`}>
        {utxos.length > 0 ? (
          utxos.map((utxo, index) => {
            const isSelected = selectedUtxos.some(
              (u) => u.input.txHash === utxo.input.txHash && u.input.outputIndex === utxo.input.outputIndex
            );
            const lovelace = utxo.output.amount.find((a) => a.unit === 'lovelace')?.quantity || '0';
            
            return (
              <div 
                key={index} 
                onClick={() => !disabled && handleUtxoClick(utxo)}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'bg-violet-900/50 border-violet-500' 
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <p className="font-bold text-slate-100">
                  {(parseInt(lovelace) / 1000000).toFixed(6)} ADA
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {utxo.input.txHash}
                </p>
              </div>
            );
          })
        ) : (
          <div className="text-center text-slate-500 text-sm py-8">
            No UTxOs found.
          </div>
        )}
      </div>
    </div>
  );
};

export default UTXOSelector;