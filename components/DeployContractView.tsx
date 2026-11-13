'use client';

import { useState } from 'react';
import { MeshTxBuilder } from '@meshsdk/core';
import { FormInput, FormTextarea } from './Form';
import { adaToLovelace, assertAddressNetwork, explorerTxUrl, type CardanoNetwork } from '../lib/cardano';
import { createKoiosProvider } from '../lib/provider';

export default function DeployContractView({ connected, wallet, network, updateWalletState }: { connected: boolean; wallet: any; network: CardanoNetwork; updateWalletState?: () => Promise<void> }) {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [scriptAddress, setScriptAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [datum, setDatum] = useState(`{
    "constructor": 0,
    "fields": [
      {
        "bytes": ""
      }
    ]
  }`);

  async function handleDeploy() {
    if (!wallet) return;
    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      assertAddressNetwork(scriptAddress, network);
      const lovelaceAmount = adaToLovelace(amount);
      const assets = [{ unit: "lovelace", quantity: lovelaceAmount }];
      const walletAddress = await wallet.getChangeAddress();
      const utxos = await wallet.getUtxos();
      const provider = createKoiosProvider(network);

      const meshTxBuilder = new MeshTxBuilder({
        fetcher: provider,
        params: await provider.fetchProtocolParameters(),
      });

      const datumObject = JSON.parse(datum);
      if (!datumObject || typeof datumObject !== 'object') throw new Error('Datum must be a JSON object.');

      const unsignedTx = await meshTxBuilder
        .txOut(scriptAddress, assets)
        .txOutInlineDatumValue(datumObject,"JSON")
        .changeAddress(walletAddress)
        .selectUtxosFrom(utxos)
        .complete();

      const signedTx = await wallet.signTx(unsignedTx);
      const hash = await wallet.submitTx(signedTx);

      setTxHash(hash);
      await updateWalletState?.();

    } catch (err: any) {
      setError(err.message || 'Deployment failed. Ensure collateral is set.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-6">Deploy Contract (Lock UTxO)</h2>
      <div className="space-y-4 max-w-lg mx-auto">
        <FormInput label="Script Address" placeholder="addr_test1w..." value={scriptAddress} onChange={setScriptAddress} />
        <FormInput label="Amount to Lock (ADA)" placeholder="0.0" value={amount} onChange={setAmount} />
        <FormTextarea label="Datum (JSON)" value={datum} onChange={setDatum} />
        <button onClick={handleDeploy} disabled={isLoading || !connected} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500">
          {isLoading ? 'Deploying...' : 'Deploy & Lock Funds'}
        </button>
        {error && <div className="mt-4 text-red-400 text-sm text-center p-2 bg-red-900/50 rounded-md">{error}</div>}
        {txHash && (
          <div className="mt-4 text-green-400 text-sm text-center p-2 bg-green-900/50 rounded-md">
            Success! Tx ID: <a href={explorerTxUrl(network, txHash)} target="_blank" rel="noreferrer" className="underline font-mono text-xs break-all">{txHash}</a>
          </div>
        )}
      </div>
    </div>
  );
};
