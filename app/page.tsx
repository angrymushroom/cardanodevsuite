'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet, useWalletList, useNetwork } from '@meshsdk/react';
import { Transaction, UTxO, MeshTxBuilder, BlockfrostProvider } from '@meshsdk/core';
import { PlutusData, PlutusDatumSchema } from '@emurgo/cardano-serialization-lib-asmjs';
import { Sparkles, ArrowRight, Power, ChevronsRight, FileJson, Send, Search, Clipboard, Check, Loader2 } from 'lucide-react';
import UTXOSelector from '../components/UTXOSelector';
import UTxODetailModal from '../components/UTxODetailModal';
import SimulationResult, { SimResult } from '../components/SimulationResult';
import DeployContractView from '../components/DeployContractView';
import { FormInput, FormTextarea } from '../components/Form';
import { getNetworkConfig } from '../lib/networkConfig';

// Blockfrost UTxO shape returned from the REST API
interface BlockfrostAmount {
  unit: string;
  quantity: string;
}
interface BlockfrostUtxo {
  tx_hash: string;
  output_index: number;
  amount: BlockfrostAmount[];
  data_hash: string | null;
  inline_datum: string | null;
}

// Transaction pre-flight summary
interface TxSummary {
  fee: string;
  change: string;
  cbor: string;
}

// Wallet state props shared between components
interface WalletState {
  connected: boolean;
  connect: (name: string) => void;
  disconnect: () => void;
  address: string | undefined;
  adaBalance: string;
  network: number | undefined;
  pkh: string | null;
}

interface WalletProps {
  connected: boolean;
  wallet: ReturnType<typeof useWallet>['wallet'];
  address: string | undefined;
  updateWalletState: () => void;
  selectedUtxos: UTxO[];
  network: number | undefined;
}

// Main Page Component (Landing Page)
export default function Home() {
  const suiteRef = useRef<HTMLDivElement>(null);
  const handleScrollToSuite = () => suiteRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-700">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="text-violet-400" />
            <h1 className="text-xl font-bold">Cardano Dev Suite</h1>
          </div>
          <button onClick={handleScrollToSuite} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Launch Suite
          </button>
        </div>
      </header>
      <main className="container mx-auto px-6 pt-32 text-center">
        <h2 className="text-5xl font-extrabold leading-tight mb-4">The Smartest Way to Build on Cardano</h2>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
          An all-in-one toolkit to accelerate your development workflow. Build, test, and debug transactions with unprecedented speed and clarity.
        </p>
        <button onClick={handleScrollToSuite} className="bg-white text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 mx-auto">
          Start Building <ArrowRight size={20} />
        </button>
      </main>
      <div ref={suiteRef} className="bg-black py-20 mt-16">
        <div className="container mx-auto px-6">
          <DeveloperSuite />
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// The Main App Container
// ==================================================================
const DeveloperSuite = () => {
  const [activeView, setActiveView] = useState('simple_transfer');
  const { connected, wallet, connect, disconnect } = useWallet();
  const network = useNetwork();

  const [address, setAddress] = useState<string | undefined>();
  const [adaBalance, setAdaBalance] = useState<string>('0');
  const [utxos, setUtxos] = useState<UTxO[]>([]);
  const [pkh, setPkh] = useState<string | null>(null);
  const [selectedUtxos, setSelectedUtxos] = useState<UTxO[]>([]);

  const updateWalletState = useCallback(async () => {
    if (connected && wallet) {
      try {
        const currentUtxos = await wallet.getUtxos();
        const currentBalance = await wallet.getBalance();
        const usedAddresses = await wallet.getUsedAddresses();
        const dRep = await wallet.getDRep();

        setUtxos(currentUtxos || []);
        setAddress(usedAddresses[0]);
        setAdaBalance(currentBalance.find(a => a.unit === 'lovelace')?.quantity || '0');
        setPkh(dRep.publicKeyHash);
      } catch {
        // Wallet state fetch failed silently — user will see stale data
      }
    } else {
      setAddress(undefined);
      setAdaBalance('0');
      setUtxos([]);
      setSelectedUtxos([]);
    }
  }, [connected, wallet]);

  useEffect(() => {
    updateWalletState();
  }, [updateWalletState]);

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        walletState={{ connected, connect, disconnect, address, adaBalance, network, pkh }}
        utxos={utxos}
        selectedUtxos={selectedUtxos}
        onSelectionChange={setSelectedUtxos}
      />
      <MainContent
        activeView={activeView}
        walletProps={{ connected, wallet, address, updateWalletState, selectedUtxos, network }}
      />
    </div>
  );
};


// ==================================================================
// Sidebar and Navigation Components
// ==================================================================
interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  walletState: WalletState;
  utxos: UTxO[];
  selectedUtxos: UTxO[];
  onSelectionChange: (utxos: UTxO[]) => void;
}

const Sidebar = ({ activeView, onNavigate, walletState, utxos, selectedUtxos, onSelectionChange }: SidebarProps) => {
  const { connected, connect, disconnect, address, adaBalance, network, pkh } = walletState;

  return (
    <aside className="w-full md:w-1/3 lg:w-1/4 space-y-6">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sticky top-24">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Wallet</h2>
          <CustomWalletConnector onConnect={connect} connected={connected} onDisconnect={disconnect} />
        </div>
        {connected && (
          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-slate-400">Network:</span>
              <span className={`font-semibold ${network === 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                {network === 1 ? 'Mainnet' : 'Testnet'}
              </span>
            </div>
            <InfoRow
              label="Balance"
              value={`${(parseInt(adaBalance) / 1000000).toFixed(6)} ADA`}
              fullValue={(parseInt(adaBalance) / 1000000).toString()}
            />
            <InfoRow
              label="Address"
              value={address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}
              fullValue={address}
            />
            <InfoRow
              label="PKH"
              value={pkh ? `${pkh.slice(0, 6)}...${pkh.slice(-4)}` : 'N/A'}
              fullValue={pkh ?? undefined}
            />
          </div>
        )}
        <nav className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tools</h3>
          <NavItem icon={<Send size={18} />} label="Simple Transfer" isActive={activeView === 'simple_transfer'} onClick={() => onNavigate('simple_transfer')} />
          <NavItem icon={<Search size={18} />} label="Deploy Contract" isActive={activeView === 'deploy_contract'} onClick={() => onNavigate('deploy_contract')} />
          <NavItem icon={<FileJson size={18} />} label="Contract Simulator" isActive={activeView === 'contract_simulator'} onClick={() => onNavigate('contract_simulator')} />
        </nav>
      </div>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sticky top-96">
        <UTXOSelector utxos={utxos} selectedUtxos={selectedUtxos} onSelectionChange={onSelectionChange} disabled={!connected} />
      </div>
    </aside>
  );
};

interface MainContentProps {
  activeView: string;
  walletProps: WalletProps;
}

const MainContent = ({ activeView, walletProps }: MainContentProps) => {
  return (
    <main className="flex-1">
      {activeView === 'simple_transfer' && <SimpleTransferView {...walletProps} />}
      {activeView === 'deploy_contract' && <DeployContractView {...walletProps} />}
      {activeView === 'contract_simulator' && <ContractInteractionView {...walletProps} />}
    </main>
  );
};

// ==================================================================
// Feature View: Simple Transfer
// ==================================================================
const SimpleTransferView = ({ connected, wallet, address, updateWalletState, selectedUtxos, network }: WalletProps) => {
  const { cardanoscanBaseUrl } = getNetworkConfig(network);
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
    setLoading(true);
    setError(null);
    setSummary(null);
    setUnsignedTx(null);
    try {
      const tx = new Transaction({ initiator: wallet });
      tx.sendLovelace(recipient, (parseFloat(amount) * 1000000).toString());
      if (selectedUtxos.length > 0) tx.setTxInputs(selectedUtxos);

      if (metadata.trim() !== '{}' && metadata.trim() !== '') {
        const metadataJson = JSON.parse(metadata);
        const label = Object.keys(metadataJson)[0];
        tx.setMetadata(parseInt(label), metadataJson[label]);
      }

      const builtTxCbor = await tx.build();
      if (!builtTxCbor) throw new Error("Failed to build transaction.");

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
      setError(err instanceof Error ? err.message : "Transaction failed.");
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
              <label className="block text-sm font-medium text-slate-300">Transaction CBOR</label>
              <textarea readOnly value={summary ? summary.cbor : ''} className="mt-1 w-full h-24 bg-slate-950 text-xs p-2 rounded-md font-mono break-all resize-none border border-slate-700"></textarea>
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
          {txHash && <div className="text-green-400 text-sm text-center p-2 bg-green-900/50 rounded-md">Success! Tx ID: <a href={`${cardanoscanBaseUrl}/transaction/${txHash}`} target="_blank" rel="noreferrer" className="underline font-mono text-xs break-all">{txHash}</a></div>}
        </div>
      </div>
    </div>
  );
};

// ==================================================================
// Feature View: Contract Interaction
// ==================================================================
type PlutusVersion = 'V1' | 'V2' | 'V3';

const ContractInteractionView = ({ connected, wallet, address, updateWalletState, network }: WalletProps) => {
  const { blockfrostApiKey, blockfrostBaseUrl, cardanoscanBaseUrl } = getNetworkConfig(network);
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
  const [scriptVersion, setScriptVersion] = useState<PlutusVersion>('V2');

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
        `${blockfrostBaseUrl}/addresses/${scriptAddress}/utxos`,
        { headers: { project_id: blockfrostApiKey } }
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

  // Builds the redeem transaction using MeshTxBuilder (canonical MeshJS pattern).
  // Returns the unsigned tx as a CBOR hex string.
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

    const provider = new BlockfrostProvider(blockfrostApiKey);
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

      // Blockfrost evaluate endpoint expects raw CBOR bytes, not a hex string
      const txBytes = Uint8Array.from(Buffer.from(unsignedTxHex, 'hex'));

      const response = await fetch(
        `${blockfrostBaseUrl}/utils/txs/evaluate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/cbor',
            'project_id': blockfrostApiKey,
          },
          body: txBytes,
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Simulation request failed.');
      }

      setSimulationResult({
        isSuccess: true,
        evaluationResult: result.EvaluationResult,
      });

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
      // partialSign=true is required for Plutus script transactions
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
              {scriptUtxos.map((utxo, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedScriptUtxo(utxo)}
                  className={`p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                    selectedScriptUtxo?.tx_hash === utxo.tx_hash && selectedScriptUtxo?.output_index === utxo.output_index
                    ? 'bg-violet-900/50 border-violet-500'
                    : 'bg-slate-800 border-slate-700 hover:border-violet-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{(parseInt(utxo.amount.find(a => a.unit === 'lovelace')?.quantity || '0') / 1000000)} ADA</p>
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
              ))}
            </div>
          </div>
        </div>
        {fetchError && <div className="mt-4 text-red-400 text-sm">{fetchError}</div>}
      </div>

      <div className={`bg-slate-900 border border-slate-700 rounded-2xl p-8 transition-opacity ${isStepsLocked ? 'opacity-40 pointer-events-none' : ''}`}>
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

      <div className={`bg-slate-900 border border-slate-700 rounded-2xl p-8 transition-opacity ${isStepsLocked ? 'opacity-40 pointer-events-none' : ''}`}>
        <h2 className="text-2xl font-bold mb-6">Step 3: Actions</h2>
        <div className="space-y-4">
          <button onClick={handleSimulate} disabled={isSimulating || !connected || !selectedScriptUtxo || !scriptCbor.trim()} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2">
            {isSimulating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Simulating...
              </>
            ) : 'Simulate Transaction'}
          </button>
          <button
            onClick={handleBuildAndSubmit}
            disabled={isSubmitting || !connected || !selectedScriptUtxo || !redeemer.trim() || !scriptCbor.trim()}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isSubmitting ? 'Submitting...' : 'Build & Submit'}
          </button>
        </div>
        <SimulationResult result={simulationResult} />
        {actionError && <div className="mt-4 text-red-400 text-sm">{actionError}</div>}
        {txHash && (
          <div className="mt-4 text-green-400 text-sm text-center p-2 bg-green-900/50 rounded-md">
            Success! Tx ID: <a href={`${cardanoscanBaseUrl}/transaction/${txHash}`} target="_blank" rel="noreferrer" className="underline font-mono text-xs break-all">{txHash}</a>
          </div>
        )}
      </div>

      {detailUtxo && <UTxODetailModal utxo={detailUtxo} onClose={() => setDetailUtxo(null)} />}
    </div>
  );
};

// ==================================================================
// UI Helper Sub-Components
// ==================================================================
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem = ({ icon, label, isActive, onClick }: NavItemProps) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
    {icon}
    <span>{label}</span>
    {isActive && <ChevronsRight size={16} className="ml-auto" />}
  </button>
);

interface CustomWalletConnectorProps {
  onConnect: (name: string) => void;
  connected: boolean;
  onDisconnect: () => void;
}

const CustomWalletConnector = ({ onConnect, connected, onDisconnect }: CustomWalletConnectorProps) => {
  const wallets = useWalletList();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleConnect = (walletName: string) => {
    onConnect(walletName);
    setIsModalOpen(false);
  };
  return (
    <>
      {connected
        ? <button onClick={onDisconnect} className="text-sm text-slate-400 hover:text-white flex items-center gap-1"><Power size={16} /> Disconnect</button>
        : <button onClick={() => setIsModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Connect</button>
      }
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
          <div className="bg-slate-800 rounded-lg p-6 space-y-2 w-72" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Select a Wallet</h3>
            {wallets.map(wallet => (
              <button key={wallet.name} onClick={() => handleConnect(wallet.name)} className="w-full flex items-center gap-4 p-3 hover:bg-slate-700 rounded-md text-left">
                <img src={wallet.icon} alt={wallet.name} width={32} height={32} />
                {wallet.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

interface SummaryRowProps {
  label: string;
  value: string;
}

const SummaryRow = ({ label, value }: SummaryRowProps) => (
  <div className="flex justify-between items-center bg-slate-800 p-2 rounded-md">
    <span className="text-slate-400">{label}</span>
    <span className="font-mono font-bold">{value}</span>
  </div>
);

interface CopyButtonProps {
  textToCopy: string | undefined;
}

const CopyButton = ({ textToCopy }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = () => {
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button onClick={handleCopy} className="ml-2 text-slate-500 hover:text-slate-200">
      {copied ? <Check size={16} className="text-green-400" /> : <Clipboard size={16} />}
    </button>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
  fullValue?: string;
  isMono?: boolean;
}

const InfoRow = ({ label, value, fullValue, isMono = true }: InfoRowProps) => (
  <div className="flex justify-between items-center">
    <span className="text-slate-400">{label}:</span>
    <div className="flex items-center">
      <span className={`font-mono ${isMono ? 'truncate' : ''}`}>{value}</span>
      <CopyButton textToCopy={fullValue || value} />
    </div>
  </div>
);
