'use client';

import { useState, useEffect } from 'react';
import { UTxO, MeshTxBuilder, BlockfrostProvider } from '@meshsdk/core';
import { PlutusData, PlutusDatumSchema } from '@emurgo/cardano-serialization-lib-asmjs';
import { Loader2 } from 'lucide-react';
import { FormInput, FormTextarea } from './Form';
import SimulationResult, { SimResult } from './SimulationResult';
import UTxODetailModal from './UTxODetailModal';

const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY ?? '';
const BLOCKFROST_BASE_URL = process.env.NEXT_PUBLIC_BLOCKFROST_BASE_URL ?? 'https://cardano-preprod.blockfrost.io/api/v0';
const CARDANOSCAN_BASE_URL = process.env.NEXT_PUBLIC_CARDANOSCAN_BASE_URL ?? 'https://preprod.cardanoscan.io';

interface BlockfrostAmount {
  unit: string;
  quantity: string;
}

export interface BlockfrostUtxo {
  tx_hash: string;
  output_index: number;
  amount: BlockfrostAmount[];
  data_hash: string | null;
  inline_datum: string | null;
}

type PlutusVersion = 'V1' | 'V2' | 'V3';

interface ContractInteractionViewProps {
  connected: boolean;
  wallet: { getUtxos: () => Promise<UTxO[]>; getCollateral: () => Promise<UTxO[]>; signTx: (tx: string, partial?: boolean) => Promise<string>; submitTx: (tx: string) => Promise<string> } | null;
  address: string | undefined;
  updateWalletState: () => void;
}

export default function ContractInteractionView({ connected, wallet, address, updateWalletState }: ContractInteractionViewProps) {
  const [scriptAddress, setScriptAddress] = useState('');
  const [scriptUtxos, setScriptUtxos] = useState<BlockfrostUtxo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [selectedScriptUtxo, setSelectedScriptUtxo] = useState<BlockfrostUtxo | null>(null);
  const [detailUtxo, setDetailUtxo] = useState<BlockfrostUtxo | null>(null);

  const [datum, setDatum] = useState('');
  const [redeemer, setRedeemer] = useState('');
  const [scriptCbor, setScriptCbor] = useState('');
  const [scriptVersion, setScriptVersion] = useState<PlutusVersion>('V3');

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimResult | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const fetchScriptUtxos = async () => {
    if (!scriptAddress) return;
    setIsLoading(true);
    setFetchError(null);
    setScriptUtxos([]);
    try {
      const response = await fetch(
        `${BLOCKFROST_BASE_URL}/addresses/${scriptAddress}/utxos`,
        { headers: { project_id: BLOCKFROST_API_KEY } }
      );
      if (!response.ok) throw new Error('Failed to fetch UTxOs.');
      const data: BlockfrostUtxo[] = await response.json();
      setScriptUtxos(data);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch UTxOs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedScriptUtxo?.inline_datum) {
      try {
        const plutusData = PlutusData.from_hex(selectedScriptUtxo.inline_datum);
        const datumJson = JSON.parse(plutusData.to_json(PlutusDatumSchema.DetailedSchema));
        setDatum(JSON.stringify(datumJson, null, 2));
      } catch {
        setDatum('// Failed to decode datum CBOR.');
      }
    } else {
      setDatum('');
    }
  }, [selectedScriptUtxo]);

  async function buildRedeemTx(): Promise<string> {
    if (!wallet || !selectedScriptUtxo || !address) {
      throw new Error('Wallet not connected or no UTxO selected.');
    }

    let redeemerJson: object;
    try {
      redeemerJson = JSON.parse(redeemer);
    } catch {
      throw new Error('Redeemer is not valid JSON. Expected Cardano DetailedSchema, e.g. { "constructor": 0, "fields": [] }');
    }

    const walletUtxos = await wallet.getUtxos();

    const collateralUtxos = await wallet.getCollateral();
    if (!collateralUtxos || collateralUtxos.length === 0) {
      throw new Error('No collateral UTxO found. Please set collateral in your wallet (Settings → Collateral). It must be a pure-ADA UTxO of at least 5 ADA.');
    }
    const collateral = collateralUtxos[0];

    const provider = new BlockfrostProvider(BLOCKFROST_API_KEY);
    const txBuilder = new MeshTxBuilder({
      fetcher: provider,
      submitter: provider,
      evaluator: provider,
    });

    const inputAmount = selectedScriptUtxo.amount.map(a => ({ unit: a.unit, quantity: a.quantity }));

    txBuilder
      .spendingPlutusScript(scriptVersion)
      .txIn(
        selectedScriptUtxo.tx_hash,
        selectedScriptUtxo.output_index,
        inputAmount,
        scriptAddress,
      )
      .txInScript(scriptCbor);

    if (selectedScriptUtxo.inline_datum) {
      txBuilder.txInInlineDatumPresent();
    } else {
      let datumJson: object;
      try {
        datumJson = JSON.parse(datum);
      } catch {
        throw new Error('Datum is not valid JSON. It is required when the UTxO has no inline datum.');
      }
      txBuilder.txInDatumValue(datumJson, 'JSON');
    }

    txBuilder
      .txInRedeemerValue(redeemerJson, 'JSON')
      .changeAddress(address)
      .selectUtxosFrom(walletUtxos)
      .txInCollateral(
        collateral.input.txHash,
        collateral.input.outputIndex,
        collateral.output.amount,
        collateral.output.address,
      );

    await txBuilder.complete();
    return txBuilder.txHex;
  }

  async function handleSimulate() {
    if (!wallet || !selectedScriptUtxo) return;
    setIsSimulating(true);
    setActionError(null);
    setSimulationResult(null);

    try {
      const unsignedTxHex = await buildRedeemTx();
      const txBytes = Uint8Array.from(Buffer.from(unsignedTxHex, 'hex'));

      const response = await fetch(`${BLOCKFROST_BASE_URL}/utils/txs/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/cbor', project_id: BLOCKFROST_API_KEY },
        body: txBytes,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Simulation request failed.');

      setSimulationResult({ isSuccess: true, evaluationResult: result.EvaluationResult });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Simulation failed.';
      setActionError(message);
      setSimulationResult({ isSuccess: false, reason: message });
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleBuildAndSubmit() {
    if (!wallet || !selectedScriptUtxo) return;
    setIsSubmitting(true);
    setActionError(null);
    setTxHash(null);

    try {
      const unsignedTxHex = await buildRedeemTx();
      const signedTx = await wallet.signTx(unsignedTxHex, true);
      const hash = await wallet.submitTx(signedTx);

      setTxHash(hash);
      setSelectedScriptUtxo(null);
      setScriptUtxos([]);
      updateWalletState();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Transaction failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isStepsLocked = !selectedScriptUtxo;

  return (
    <div className="space-y-6">
      {/* Step 1 */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">Step 1: Target Contract & UTxO</h2>
        <div className="space-y-4">
          <FormInput label="Script Address" placeholder="addr_test1w..." value={scriptAddress} onChange={setScriptAddress} />
          <button onClick={fetchScriptUtxos} disabled={isLoading || !connected} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500">
            {isLoading ? 'Fetching...' : 'Fetch Locked UTxOs'}
          </button>
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-slate-300">Locked UTxOs</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto mt-2 pr-2 border-t border-slate-700 pt-4">
              {!isLoading && scriptUtxos.length === 0 && scriptAddress && !fetchError && (
                <p className="text-sm text-slate-500 text-center py-4">No UTxOs found at this address.</p>
              )}
              {scriptUtxos.map(utxo => {
                const lovelace = parseInt(utxo.amount.find(a => a.unit === 'lovelace')?.quantity || '0') / 1000000;
                const tokens = utxo.amount.filter(a => a.unit !== 'lovelace');
                const isSelected = selectedScriptUtxo?.tx_hash === utxo.tx_hash && selectedScriptUtxo?.output_index === utxo.output_index;
                return (
                  <div
                    key={`${utxo.tx_hash}#${utxo.output_index}`}
                    onClick={() => setSelectedScriptUtxo(utxo)}
                    className={`p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                      isSelected ? 'bg-violet-900/50 border-violet-500' : 'bg-slate-800 border-slate-700 hover:border-violet-600'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{lovelace} ADA {tokens.length > 0 && <span className="ml-1 text-xs font-normal text-amber-400">+ {tokens.length} token{tokens.length > 1 ? 's' : ''}</span>}</p>
                        <p className="text-xs text-slate-400 truncate">Hash: {utxo.tx_hash}</p>
                        {(utxo.data_hash || utxo.inline_datum) && <p className="text-xs text-amber-400">Datum Present</p>}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailUtxo(utxo); }}
                        className="text-xs text-slate-500 hover:text-slate-300 shrink-0 ml-2 mt-1"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {fetchError && <div className="mt-4 text-red-400 text-sm">{fetchError}</div>}
      </div>

      {/* Step 2 */}
      <div className={`bg-slate-900 border border-slate-700 rounded-2xl p-8 transition-opacity relative ${isStepsLocked ? 'opacity-40 pointer-events-none' : ''}`}>
        {isStepsLocked && (
          <div className="absolute inset-0 flex items-center justify-center z-10 rounded-2xl">
            <p className="text-slate-400 text-sm bg-slate-900/90 px-4 py-2 rounded-lg border border-slate-700">Select a UTxO in Step 1 to continue</p>
          </div>
        )}
        <h2 className="text-2xl font-bold mb-6">Step 2: Interaction Data</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Plutus Script Version</label>
            <div className="flex gap-2">
              {(['V1', 'V2', 'V3'] as PlutusVersion[]).map(v => (
                <button
                  key={v}
                  onClick={() => setScriptVersion(v)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${scriptVersion === v ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Aiken compiles to V3 by default. PlutusTx legacy contracts are typically V2.</p>
          </div>
          <FormTextarea label={selectedScriptUtxo?.inline_datum ? 'Datum (decoded from inline datum)' : 'Datum (JSON — required if no inline datum)'} value={datum} onChange={setDatum} placeholder='{ "constructor": 0, "fields": [] }' />
          <FormTextarea label="Redeemer (JSON — Cardano DetailedSchema)" value={redeemer} onChange={setRedeemer} placeholder='{ "constructor": 0, "fields": [] }' />
          <FormTextarea label="Script CBOR Hex" value={scriptCbor} onChange={setScriptCbor} placeholder='58... (from your plutus.json or aiken blueprint)' />
        </div>
      </div>

      {/* Step 3 */}
      <div className={`bg-slate-900 border border-slate-700 rounded-2xl p-8 transition-opacity relative ${isStepsLocked ? 'opacity-40 pointer-events-none' : ''}`}>
        <h2 className="text-2xl font-bold mb-6">Step 3: Actions</h2>
        <div className="space-y-4">
          <button onClick={handleSimulate} disabled={isSimulating || !connected || !selectedScriptUtxo || !scriptCbor.trim()} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2">
            {isSimulating ? <><Loader2 size={16} className="animate-spin" /> Simulating...</> : 'Simulate Transaction'}
          </button>
          <button onClick={handleBuildAndSubmit} disabled={isSubmitting || !connected || !selectedScriptUtxo || !redeemer.trim() || !scriptCbor.trim()} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2">
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Build & Submit'}
          </button>
        </div>
        <SimulationResult result={simulationResult} />
        {actionError && <div className="mt-4 text-red-400 text-sm">{actionError}</div>}
        {txHash && (
          <div className="mt-4 text-green-400 text-sm text-center p-2 bg-green-900/50 rounded-md">
            Success! Tx ID: <a href={`${CARDANOSCAN_BASE_URL}/transaction/${txHash}`} target="_blank" rel="noreferrer" className="underline font-mono text-xs break-all">{txHash}</a>
          </div>
        )}
      </div>

      {detailUtxo && <UTxODetailModal utxo={detailUtxo} onClose={() => setDetailUtxo(null)} />}
    </div>
  );
}
