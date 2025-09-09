'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet, useWalletList, useNetwork } from '@meshsdk/react';
import { Transaction, UTxO } from '@meshsdk/core';
import { PlutusData, PlutusDatumSchema } from '@emurgo/cardano-serialization-lib-asmjs';
import { Sparkles, ArrowRight, Power, ChevronsRight, FileJson, Send, Search, Clipboard } from 'lucide-react';
import UTXOSelector from '../components/UTXOSelector';
import UTxODetailModal from '../components/UTxODetailModal';
import SimulationResult from '../components/SimulationResult';
import DeployContractView from '../components/DeployContractView'; // <-- ADD THIS IMPORT

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
  
  // State that is shared across all views
  const [address, setAddress] = useState<string | undefined>();
  const [adaBalance, setAdaBalance] = useState<string>('0');
  const [utxos, setUtxos] = useState<UTxO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pkh, setPkh] = useState<string | null>(null); // <-- Add PKH state here

  // LIFTED STATE: Selected UTxOs is now managed here
  const [selectedUtxos, setSelectedUtxos] = useState<UTxO[]>([]);

  const updateWalletState = useCallback(async () => {
    if (connected && wallet) {
        setLoading(true);
        try {
            const currentUtxos = await wallet.getUtxos();
            const currentBalance = await wallet.getBalance();
            const usedAddresses = await wallet.getUsedAddresses();
            const dRep = await wallet.getDRep(); 
            const pkh = dRep.publicKeyHash;

            setUtxos(currentUtxos || []);
            setAddress(usedAddresses[0]);
            setAdaBalance(currentBalance.find(a => a.unit === 'lovelace')?.quantity || '0');
            setPkh(pkh); // <-- Set PKH state here


        } catch (e) { console.error(e); setError("Failed to fetch wallet data."); }
        finally { setLoading(false); }
    } else {
        setAddress(undefined); setAdaBalance('0'); setUtxos([]); setSelectedUtxos([]);
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
        walletProps={{ connected, wallet, address, updateWalletState, selectedUtxos }}
      />
    </div>
  );
};


// ==================================================================
// Sidebar and Navigation Components
// ==================================================================
const Sidebar = ({ activeView, onNavigate, walletState, utxos, selectedUtxos, onSelectionChange }) => {
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
            {/* Use the new InfoRow component for these */}
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
              fullValue={pkh}
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
      {/* UTXO SELECTOR IS NOW HERE */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sticky top-96">
          <UTXOSelector utxos={utxos} selectedUtxos={selectedUtxos} onSelectionChange={onSelectionChange} disabled={!connected} />
      </div>
    </aside>
  );
};

const MainContent = ({ activeView, walletProps }) => {
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
const SimpleTransferView = ({ connected, wallet, address, utxos, updateWalletState }) => {
  const [loading, setLoading]       = useState(false);
  const [txHash, setTxHash]         = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [selectedUtxos, setSelectedUtxos] = useState<UTxO[]>([]);
  const [recipient, setRecipient]   = useState('');
  const [amount, setAmount]         = useState('');
  const [metadata, setMetadata]     = useState('{}');
  const [unsignedTx, setUnsignedTx] = useState<string | null>(null);
  const [summary, setSummary]       = useState<any>(null);

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
      const change = txBody.outputs.find((o: any) => o.address === address);
      setSummary({
        fee: txBody.fee,
        change: change?.amount.find((a: any) => a.unit === 'lovelace')?.quantity || '0',
        cbor: builtTxCbor,
      });

    } catch (err: any) {
      setError(err.message || 'Failed to build transaction.');
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
        if(updateWalletState) updateWalletState(); 
    } catch (err: any) {
        setError(err.message || "Transaction failed.");
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
                {txHash && <div className="text-green-400 text-sm text-center p-2 bg-green-900/50 rounded-md">Success! Tx ID: <a href={`https://preprod.cardanoscan.io/transaction/${txHash}`} target="_blank" rel="noreferrer" className="underline font-mono text-xs break-all">{txHash}</a></div>}
            </div>
        </div>
    </div>
  );
};

// ==================================================================
// Feature View: Contract Interaction
// ==================================================================
const ContractInteractionView = ({ connected, wallet, address }) => {
  const [scriptAddress, setScriptAddress] = useState('');
  const [scriptUtxos, setScriptUtxos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScriptUtxo, setSelectedScriptUtxo] = useState<any | null>(null);

  const [datum, setDatum] = useState('');
  const [redeemer, setRedeemer] = useState('');
  const [scriptCbor, setScriptCbor] = useState('');

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);

  const fetchScriptUtxos = async () => {
    if (!scriptAddress) return alert('Please enter a script address.');
    setIsLoading(true);
    setError(null);
    setScriptUtxos([]);
    try {
      const apiKey = 'preprodUfxEoynE8cv2NDY0NegobQrU78piDVnN'; // IMPORTANT: Replace with your key
      const response = await fetch(
        `https://cardano-preprod.blockfrost.io/api/v0/addresses/${scriptAddress}/utxos`,
        { headers: { project_id: apiKey } }
      );
      if (!response.ok) throw new Error('Failed to fetch UTxOs.');
      const data = await response.json();
      setScriptUtxos(data);
    } catch (err: any) {
      setError(err.message);
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
      } catch (error) {
        setDatum('// Failed to decode datum CBOR.');
      }
    } else {
      setDatum('// No inline datum found on selected UTxO.');
    }
  }, [selectedScriptUtxo]);

  async function handleSimulate() {
    if (!wallet || !selectedScriptUtxo) {
      return alert("Please select a script UTxO to interact with.");
    }
    setIsSimulating(true);
    setError(null);
    setSimulationResult(null);

    try {
      const tx = new Transaction({ initiator: wallet });

      tx.redeemValue({
        value: selectedScriptUtxo,
        script: { version: 'V2', code: scriptCbor },
        datum: selectedScriptUtxo.inline_datum ? 'inline' : selectedScriptUtxo.data_hash,
        redeemer: JSON.parse(redeemer),
      });

      tx.setChangeAddress(address);

      const unsignedTxCbor = await tx.build();
      
      const apiKey = 'preprodUfxEoynE8cv2NDY0NegobQrU78piDVnN'; // IMPORTANT: Replace with your key
      const response = await fetch(
        'https://cardano-preprod.blockfrost.io/api/v0/utils/txs/evaluate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/cbor',
            'project_id': apiKey,
          },
          body: unsignedTxCbor,
        }
      );
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Simulation request failed.');
      }

      setSimulationResult({ result });

    } catch (err: any) {
      setError(err.message);
      setSimulationResult({ error: true, reason: err.message });
    } finally {
      setIsSimulating(false);
    }
  }

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
                  <p className="font-bold">{(parseInt(utxo.amount.find(a => a.unit === 'lovelace')?.quantity || '0') / 1000000)} ADA</p>
                  <p className="text-xs text-slate-400 truncate">Hash: {utxo.tx_hash}</p>
                  {utxo.data_hash && <p className="text-xs text-amber-400">Datum Present</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
        {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}
      </div>
      <div className={`bg-slate-900 border border-slate-700 rounded-2xl p-8 transition-opacity ${!selectedScriptUtxo ? 'opacity-40' : ''}`}>
        <h2 className="text-2xl font-bold mb-6">Step 2: Interaction Data</h2>
        <div className="space-y-4">
          <FormTextarea label="Datum (auto-populated)" value={datum} onChange={setDatum} />
          <FormTextarea label="Redeemer (JSON)" value={redeemer} onChange={setRedeemer} placeholder='{ "constructor": 0, "fields": [] }' />
          <FormTextarea label="Script CBOR Hex" value={scriptCbor} onChange={setScriptCbor} placeholder='58... (from your plutus.json)' />
        </div>
      </div>
      <div className={`bg-slate-900 border border-slate-700 rounded-2xl p-8 transition-opacity ${!selectedScriptUtxo ? 'opacity-40' : ''}`}>
        <h2 className="text-2xl font-bold mb-6">Step 3: Actions</h2>
        <div className="space-y-4">
          <button onClick={handleSimulate} disabled={isSimulating || !connected || !selectedScriptUtxo} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500">
            {isSimulating ? 'Simulating...' : 'Simulate Transaction'}
          </button>
          <button disabled className="w-full bg-violet-800 text-slate-500 font-bold py-3 px-4 rounded-lg cursor-not-allowed">Build & Submit</button>
        </div>
        <SimulationResult result={simulationResult} />
        {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}
      </div>
    </div>
  );
};

// ==================================================================
// UI Helper Sub-Components
// ==================================================================
const NavItem = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
        {icon}
        <span>{label}</span>
        {isActive && <ChevronsRight size={16} className="ml-auto" />}
    </button>
);
const CustomWalletConnector = ({ onConnect, connected, onDisconnect }) => {
    const wallets = useWalletList();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const handleConnect = (walletName: string) => {
        onConnect(walletName);
        setIsModalOpen(false);
    };
    return (
        <>
        {connected ? ( <button onClick={onDisconnect} className="text-sm text-slate-400 hover:text-white flex items-center gap-1"><Power size={16} /> Disconnect</button> ) : ( <button onClick={() => setIsModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Connect</button> )}
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
const FormInput = ({ label, value, onChange, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <div className="mt-1">
            <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="block w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none" placeholder={placeholder}/>
        </div>
    </div>
);
const FormTextarea = ({ label, value, onChange, placeholder = "" }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <div className="mt-1">
            <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="block w-full h-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono text-sm" />
        </div>
    </div>
);
const SummaryRow = ({ label, value }) => (
    <div className="flex justify-between items-center bg-slate-800 p-2 rounded-md">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono font-bold">{value}</span>
    </div>
);

// Add these to the bottom of page.tsx

const CopyButton = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
        }
    };

    return (
        <button onClick={handleCopy} className="ml-2 text-slate-500 hover:text-slate-200">
            {copied ? <ChevronsRight size={16} className="text-green-400" /> : <Clipboard size={16} />}
        </button>
    );
};

const InfoRow = ({ label, value, fullValue, isMono = true }) => (
    <div className="flex justify-between items-center">
        <span className="text-slate-400">{label}:</span>
        <div className="flex items-center">
            <span className={`font-mono ${isMono ? 'truncate' : ''}`}>{value}</span>
            <CopyButton textToCopy={fullValue || value} />
        </div>
    </div>
);