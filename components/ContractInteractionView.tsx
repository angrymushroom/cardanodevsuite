'use client';

import { useEffect, useRef, useState } from 'react';
import { MeshTxBuilder, resolvePaymentKeyHash, type UTxO } from '@meshsdk/core';
import { PlutusData, PlutusDatumSchema } from '@emurgo/cardano-serialization-lib-asmjs';
import { FormInput, FormTextarea } from './Form';
import SimulationResult, { type SimResult } from './SimulationResult';
import UTxODetailModal from './UTxODetailModal';
import { assertAddressNetwork, explorerTxUrl, formatAda, type CardanoNetwork } from '../lib/cardano';
import { createKoiosProvider, fetchAddressUTxOsStrict } from '../lib/provider';
import { transactionErrorHint } from '../lib/transactionDiagnostics';

type Props = {
  connected: boolean;
  wallet: any;
  address?: string;
  network: CardanoNetwork;
  onInspectDatum?: (request: { format: 'json' | 'cbor'; value: string; expectedHash?: string }) => void;
  onSubmitted?: (hash: string, network: CardanoNetwork) => void;
};

export default function ContractInteractionView({ connected, wallet, address, network, onInspectDatum, onSubmitted }: Props) {
  const [scriptAddress, setScriptAddress] = useState('');
  const [scriptUtxos, setScriptUtxos] = useState<UTxO[]>([]);
  const [selected, setSelected] = useState<UTxO | null>(null);
  const [detailUtxo, setDetailUtxo] = useState<UTxO | null>(null);
  const [datum, setDatum] = useState('');
  const [redeemer, setRedeemer] = useState('{ "constructor": 0, "fields": [] }');
  const [scriptCbor, setScriptCbor] = useState('');
  const [scriptVersion, setScriptVersion] = useState<'V1' | 'V2' | 'V3'>('V3');
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimResult | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const fetchGeneration = useRef(0);

  useEffect(() => {
    fetchGeneration.current += 1;
    setLoading(false);
    setScriptUtxos([]);
    setSelected(null);
    setSimulationResult(null);
    setTxHash(null);
  }, [network, scriptAddress]);

  useEffect(() => {
    if (!selected?.output.plutusData) {
      setDatum('');
      return;
    }
    try {
      const data = PlutusData.from_hex(selected.output.plutusData);
      setDatum(JSON.stringify(JSON.parse(data.to_json(PlutusDatumSchema.DetailedSchema)), null, 2));
    } catch {
      setDatum('');
    }
  }, [selected]);

  async function fetchScriptUtxos() {
    const generation = ++fetchGeneration.current;
    setLoading(true);
    setError(null);
    try {
      assertAddressNetwork(scriptAddress, network);
      const provider = createKoiosProvider(network);
      const utxos = await fetchAddressUTxOsStrict(provider, scriptAddress);
      if (generation === fetchGeneration.current) setScriptUtxos(utxos);
    } catch (e: any) {
      if (generation === fetchGeneration.current) setError(e.message || 'Failed to fetch script UTxOs.');
    } finally {
      if (generation === fetchGeneration.current) setLoading(false);
    }
  }

  async function buildSpendTx() {
    if (!wallet || !selected || !address) throw new Error('Connect a wallet and select a script UTxO first.');
    assertAddressNetwork(scriptAddress, network);
    if (!/^(?:[0-9a-fA-F]{2})+$/.test(scriptCbor.trim())) throw new Error('Enter valid script CBOR hex.');
    const redeemerJson = JSON.parse(redeemer);
    const provider = createKoiosProvider(network);
    const [walletUtxos, collateral, changeAddress] = await Promise.all([
      wallet.getUtxos(), wallet.getCollateral(), wallet.getChangeAddress(),
    ]);
    if (!collateral?.length) throw new Error('Set a collateral UTxO in your wallet before spending a script UTxO.');

    const builder = new MeshTxBuilder({ fetcher: provider, evaluator: provider, params: await provider.fetchProtocolParameters() });
    if (scriptVersion === 'V3') builder.spendingPlutusScriptV3();
    else if (scriptVersion === 'V2') builder.spendingPlutusScriptV2();
    else builder.spendingPlutusScriptV1();
    builder.txIn(selected.input.txHash, selected.input.outputIndex, selected.output.amount, selected.output.address);
    if (selected.output.plutusData) builder.txInInlineDatumPresent();
    else {
      if (!datum.trim()) throw new Error('This UTxO has no inline datum. Enter the original datum JSON.');
      builder.txInDatumValue(JSON.parse(datum), 'JSON');
    }
    builder.txInRedeemerValue(redeemerJson, 'JSON')
      .txInScript(scriptCbor.trim())
      .txOut(changeAddress, selected.output.amount)
      .requiredSignerHash(resolvePaymentKeyHash(changeAddress))
      .txInCollateral(collateral[0].input.txHash, collateral[0].input.outputIndex, collateral[0].output.amount, collateral[0].output.address)
      .changeAddress(changeAddress)
      .selectUtxosFrom(walletUtxos);

    const unsignedTx = await builder.complete();
    return { unsignedTx, provider };
  }

  async function handleSimulate() {
    if (!wallet || !selected || !address) return;
    setSimulating(true);
    setError(null);
    setSimulationResult(null);
    try {
      const { unsignedTx, provider } = await buildSpendTx();
      const evaluation = await provider.evaluateTx(unsignedTx);
      if (!evaluation.length) throw new Error('The evaluator returned no script execution budget.');
      setSimulationResult({ isSuccess: true, evaluationResult: Object.fromEntries(evaluation.map(item => [`${item.tag}:${item.index}`, { memory: item.budget.mem, steps: item.budget.steps }])) });
    } catch (e: any) {
      setError(e.message || 'Simulation failed.');
      setSimulationResult({ isSuccess: false, reason: e.message || 'Simulation failed.' });
    } finally {
      setSimulating(false);
    }
  }

  async function handleBuildAndSubmit() {
    if (!wallet || !selected || !address) return;
    setSubmitting(true);
    setError(null);
    setTxHash(null);
    try {
      const { unsignedTx, provider } = await buildSpendTx();
      const evaluation = await provider.evaluateTx(unsignedTx);
      if (!evaluation.length) throw new Error('The evaluator returned no script execution budget.');
      const signedTx = await wallet.signTx(unsignedTx, true);
      const hash = await wallet.submitTx(signedTx);
      setTxHash(hash);
      setSelected(null);
      setScriptUtxos([]);
      onSubmitted?.(hash, network);
    } catch (e: any) {
      setError(e.message || 'Failed to submit script spend.');
    } finally {
      setSubmitting(false);
    }
  }

  return <>
    <div className="space-y-6">
      <section className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">Step 1: Target Contract &amp; UTxO</h2>
        <div className="space-y-4">
          <FormInput label="Script Address" placeholder={network === 'mainnet' ? 'addr1...' : 'addr_test1...'} value={scriptAddress} onChange={setScriptAddress} />
          <button onClick={fetchScriptUtxos} disabled={loading} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">{loading ? 'Fetching...' : 'Fetch Locked UTxOs'}</button>
          <h3 className="text-lg font-semibold text-slate-300">Locked UTxOs</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {scriptUtxos.map(utxo => <div key={`${utxo.input.txHash}-${utxo.input.outputIndex}`} onClick={() => setSelected(utxo)} className={`p-3 rounded-lg border text-sm cursor-pointer ${selected?.input.txHash === utxo.input.txHash && selected?.input.outputIndex === utxo.input.outputIndex ? 'bg-violet-900/50 border-violet-500' : 'bg-slate-800 border-slate-700 hover:border-violet-600'}`}>
              <div className="flex justify-between items-center"><strong>{formatAda(utxo.output.amount.find(a => a.unit === 'lovelace')?.quantity || '0')} ADA</strong><button onClick={e => { e.stopPropagation(); setDetailUtxo(utxo); }} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-md">Details</button></div>
              <p className="text-xs text-slate-400 truncate mt-1">{utxo.input.txHash}#{utxo.input.outputIndex}</p>
              {(utxo.output.dataHash || utxo.output.plutusData) && <p className="text-xs text-amber-400">{utxo.output.plutusData ? 'Inline datum' : 'Datum hash'}</p>}
            </div>)}
            {!loading && scriptUtxos.length === 0 && <p className="text-sm text-slate-500">No UTxOs loaded.</p>}
          </div>
        </div>
      </section>
      <section className={`bg-slate-900 border border-slate-700 rounded-2xl p-8 ${!selected ? 'opacity-50' : ''}`}>
        <h2 className="text-2xl font-bold mb-6">Step 2: Interaction Data</h2>
        <div className="space-y-4">
          <label className="block text-sm text-slate-300">Plutus version<select value={scriptVersion} onChange={e => setScriptVersion(e.target.value as 'V1' | 'V2' | 'V3')} className="mt-1 block w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"><option value="V3">V3</option><option value="V2">V2</option><option value="V1">V1</option></select></label>
          <FormTextarea label={selected?.output.plutusData ? 'Inline datum (decoded, read only for this spend)' : 'Original datum (JSON, required for datum hash)'} value={datum} onChange={setDatum} readOnly={!!selected?.output.plutusData} />
          {selected && <button onClick={() => onInspectDatum?.({ format: selected.output.plutusData ? 'cbor' : 'json', value: selected.output.plutusData || datum, expectedHash: selected.output.dataHash || '' })} className="text-sm text-violet-300 hover:underline">Check datum hash in Data Lab</button>}
          <FormTextarea label="Redeemer (JSON)" value={redeemer} onChange={setRedeemer} />
          <FormTextarea label="Script CBOR Hex" value={scriptCbor} onChange={setScriptCbor} placeholder="58... (from plutus.json)" />
        </div>
      </section>
      <section className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">Step 3: Evaluate or Submit</h2>
        <div className="space-y-3">
          <button onClick={handleSimulate} disabled={simulating || submitting || !connected || !selected || !scriptCbor.trim() || !redeemer.trim()} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50">{simulating ? 'Evaluating...' : 'Evaluate Transaction'}</button>
          <button onClick={handleBuildAndSubmit} disabled={simulating || submitting || !connected || !selected || !scriptCbor.trim() || !redeemer.trim()} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50">{submitting ? 'Submitting...' : 'Build & Submit'}</button>
        </div>
        <p className="text-xs text-slate-400 mt-3">Evaluation only checks execution units. Build &amp; Submit asks your wallet to sign and submit the script spend.</p>
        <SimulationResult result={simulationResult} />
        {error && <div className="mt-4 text-red-400 text-sm"><p>{error}</p>{transactionErrorHint(error) && <p className="mt-2 text-amber-200">{transactionErrorHint(error)}</p>}</div>}
        {txHash && <p className="mt-4 text-green-400 text-sm">Submitted: <a href={explorerTxUrl(network, txHash)} target="_blank" rel="noreferrer" className="underline font-mono break-all">{txHash}</a></p>}
      </section>
    </div>
    <UTxODetailModal utxo={detailUtxo} onClose={() => setDetailUtxo(null)} />
  </>;
}
