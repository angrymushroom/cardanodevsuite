'use client';

import { useEffect, useState } from 'react';
import { MeshTxBuilder, resolvePaymentKeyHash, type UTxO } from '@meshsdk/core';
import { PlutusData, PlutusDatumSchema } from '@emurgo/cardano-serialization-lib-asmjs';
import { FormInput, FormTextarea } from './Form';
import SimulationResult from './SimulationResult';
import UTxODetailModal from './UTxODetailModal';
import { assertAddressNetwork, formatAda, type CardanoNetwork } from '../lib/cardano';
import { createKoiosProvider } from '../lib/provider';

type Props = {
  connected: boolean;
  wallet: any;
  address?: string;
  network: CardanoNetwork;
};

export default function ContractInteractionView({ connected, wallet, address, network }: Props) {
  const [scriptAddress, setScriptAddress] = useState('');
  const [scriptUtxos, setScriptUtxos] = useState<UTxO[]>([]);
  const [selected, setSelected] = useState<UTxO | null>(null);
  const [detailUtxo, setDetailUtxo] = useState<UTxO | null>(null);
  const [datum, setDatum] = useState('');
  const [redeemer, setRedeemer] = useState('{ "constructor": 0, "fields": [] }');
  const [scriptCbor, setScriptCbor] = useState('');
  const [scriptVersion, setScriptVersion] = useState<'V2' | 'V3'>('V3');
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  useEffect(() => {
    setScriptUtxos([]);
    setSelected(null);
    setSimulationResult(null);
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
    setLoading(true);
    setError(null);
    try {
      assertAddressNetwork(scriptAddress, network);
      const provider = createKoiosProvider(network);
      setScriptUtxos(await provider.fetchAddressUTxOs(scriptAddress));
    } catch (e: any) {
      setError(e.message || 'Failed to fetch script UTxOs.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulate() {
    if (!wallet || !selected || !address) return;
    setSimulating(true);
    setError(null);
    setSimulationResult(null);
    try {
      assertAddressNetwork(scriptAddress, network);
      if (!/^(?:[0-9a-fA-F]{2})+$/.test(scriptCbor.trim())) throw new Error('Enter valid script CBOR hex.');
      const redeemerJson = JSON.parse(redeemer);
      const provider = createKoiosProvider(network);
      const [walletUtxos, collateral, changeAddress] = await Promise.all([
        wallet.getUtxos(), wallet.getCollateral(), wallet.getChangeAddress(),
      ]);
      if (!collateral?.length) throw new Error('Set a collateral UTxO in your wallet before simulating a script spend.');

      const builder = new MeshTxBuilder({ fetcher: provider, evaluator: provider, params: await provider.fetchProtocolParameters() });
      if (scriptVersion === 'V3') builder.spendingPlutusScriptV3();
      else builder.spendingPlutusScriptV2();
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
      const evaluation = await provider.evaluateTx(unsignedTx);
      if (!evaluation.length) throw new Error('The evaluator returned no script execution budget.');
      setSimulationResult({ result: { EvaluationResult: Object.fromEntries(evaluation.map(item => [`${item.tag}:${item.index}`, { memory: item.budget.mem, steps: item.budget.steps }])) } });
    } catch (e: any) {
      setError(e.message || 'Simulation failed.');
      setSimulationResult({ error: true, reason: e.message || 'Simulation failed.' });
    } finally {
      setSimulating(false);
    }
  }

  return <>
    <div className="space-y-6">
      <section className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">Step 1: Target Contract &amp; UTxO</h2>
        <div className="space-y-4">
          <FormInput label="Script Address" placeholder={network === 'mainnet' ? 'addr1...' : 'addr_test1...'} value={scriptAddress} onChange={setScriptAddress} />
          <button onClick={fetchScriptUtxos} disabled={loading || !connected} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">{loading ? 'Fetching...' : 'Fetch Locked UTxOs'}</button>
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
          <label className="block text-sm text-slate-300">Plutus version<select value={scriptVersion} onChange={e => setScriptVersion(e.target.value as 'V2' | 'V3')} className="mt-1 block w-full bg-slate-800 border border-slate-700 rounded px-3 py-2"><option value="V3">V3</option><option value="V2">V2</option></select></label>
          <FormTextarea label={selected?.output.plutusData ? 'Inline datum (decoded, read only for this spend)' : 'Original datum (JSON, required for datum hash)'} value={datum} onChange={setDatum} readOnly={!!selected?.output.plutusData} />
          <FormTextarea label="Redeemer (JSON)" value={redeemer} onChange={setRedeemer} />
          <FormTextarea label="Script CBOR Hex" value={scriptCbor} onChange={setScriptCbor} placeholder="58... (from plutus.json)" />
        </div>
      </section>
      <section className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6">Step 3: Evaluate</h2>
        <button onClick={handleSimulate} disabled={simulating || !connected || !selected} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50">{simulating ? 'Evaluating...' : 'Evaluate Transaction'}</button>
        <p className="text-xs text-slate-400 mt-3">Builds a script spend and asks Koios to evaluate execution units. No transaction is signed or submitted.</p>
        <SimulationResult result={simulationResult} />
        {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
      </section>
    </div>
    <UTxODetailModal utxo={detailUtxo} onClose={() => setDetailUtxo(null)} />
  </>;
}
