'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet, useWalletList, useNetwork } from '@meshsdk/react';
import { Transaction, UTxO } from '@meshsdk/core';
import { Sparkles, ArrowRight, Power } from 'lucide-react';
import UTXOSelector from '../components/UTXOSelector';
import UTxODetailModal from '../components/UTxODetailModal'; // 1. Import the new component

// Main Page Component
export default function Home() {

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-700">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="text-violet-400" />
            <h1 className="text-xl font-bold">Cardano Dev Suite</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-32 text-center">
        <h2 className="text-5xl font-extrabold leading-tight mb-4">The Smartest Way to Build on Cardano</h2>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
          An all-in-one toolkit to accelerate your development workflow. Build, test, and debug transactions with unprecedented speed and clarity.
        </p>
        {/*
        <button onClick={handleScrollToSuite} className="bg-white text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 mx-auto">
          Start Building <ArrowRight size={20} />
        </button>
        */}
      </main>

      {/* The Suite Section */}
      <div className="bg-black py-20 mt-16">
        <div className="container mx-auto px-6">
          <DeveloperSuite />
        </div>
      </div>
    </div>
  );
}

// The Core Developer Suite Component
// The Core Developer Suite Component
const DeveloperSuite = () => {
  const { connected, wallet, connect, disconnect } = useWallet();
  const network = useNetwork();
  const [address, setAddress] = useState<string | undefined>();
  const [adaBalance, setAdaBalance] = useState<string>('0');
  const [utxos, setUtxos] = useState<UTxO[]>([]);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Builder State
  const [activeTab, setActiveTab] = useState('Transfer');
  const [selectedUtxos, setSelectedUtxos] = useState<UTxO[]>([]);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const defaultMetadata = { "674": { "msg": ["Built with the Cardano Dev Suite!"] } };
  const [metadata, setMetadata] = useState(JSON.stringify(defaultMetadata, null, 2));
    
  // Transaction State
  const [unsignedTx, setUnsignedTx] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  // V2 State: For contract interaction
  const [scriptAddress, setScriptAddress] = useState('');
  const [scriptUtxos, setScriptUtxos] = useState<UTxO[]>([]);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [detailUtxo, setDetailUtxo] = useState<UTxO | null>(null);

  //define the URL of cardano to query data
  const explorerUrl = network === 1 
    ? 'https://cardanoscan.io' 
    : 'https://preprod.cardanoscan.io';

  // We wrap the function in useCallback for performance optimization
  const updateWalletState = useCallback(async () => {
      if (connected && wallet) {
        setLoading(true);
        try {
          const currentUtxos = await wallet.getUtxos();
          const currentBalance = await wallet.getBalance();
          const usedAddresses = await wallet.getUsedAddresses();
          setUtxos(currentUtxos || []);
          setAddress(usedAddresses[0]);
          setAdaBalance(currentBalance.find(a => a.unit === 'lovelace')?.quantity || '0');
        } catch (error) {
          console.error("Error updating wallet state:", error);
          setError("Failed to fetch wallet data.");
        } finally {
          setLoading(false);
        }
      } else {
        setAddress(undefined);
        setAdaBalance('0');
        setUtxos([]);
        setSelectedUtxos([]);
        setSummary(null);
        setUnsignedTx(null);
      }
  }, [connected, wallet]); // Dependencies for useCallback

  // The new, simplified useEffect hook
  useEffect(() => {
      updateWalletState();
  }, [updateWalletState]); // It now runs whenever the function itself changes


  // V2 Function: Fetch UTxOs from a script address
  const fetchScriptUtxos = async () => {
    if (!scriptAddress) return alert('Please enter a script address.');
    setScriptLoading(true);
    setError(null);
    setScriptUtxos([]);
    try {
      // IMPORTANT: Replace with your actual Blockfrost API key
      const apiKey = 'preprodUfxEoynE8cv2NDY0NegobQrU78piDVnN'; 
      const response = await fetch(
        `https://cardano-preprod.blockfrost.io/api/v0/addresses/${scriptAddress}/utxos`,
        { headers: { project_id: apiKey } }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch UTxOs. Check the address and network.');
      }
      const data = await response.json();
      setScriptUtxos(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScriptLoading(false);
    }
  };


    async function buildPreview() {
    if (!wallet) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    setUnsignedTx(null);
    try {
      const tx = new Transaction({ initiator: wallet });
      tx.sendLovelace(recipient, (parseFloat(amount) * 1000000).toString());
      if (selectedUtxos.length > 0) {
        tx.setTxInputs(selectedUtxos);
      }

      // --- Attach metadata to transaction ---
      if (metadata.trim() !== '{}' && metadata.trim() !== '') {
        try {
          const metadataJson = JSON.parse(metadata);
          // Get the first key from the JSON object (e.g., "674")
          const label = Object.keys(metadataJson)[0]; 
          // Use the dynamic label instead of '0'
          tx.setMetadata(parseInt(label), metadataJson[label]);
        } catch (e) {
          throw new Error('Metadata is not valid JSON.');
        }
      }
      // --------------------
    
      const builtTxCbor = await tx.build();
      
      if (!builtTxCbor) {
          throw new Error("Failed to build transaction. Check inputs and wallet balance for collateral.");
      }
      
      setUnsignedTx(builtTxCbor);

      // This is the correct path based on your console.log
      const txBody = tx.txBuilder.meshTxBuilderBody;
      
      const change = txBody.outputs.find((o: any) => o.address === address);
      setSummary({
        fee: txBody.fee,
        change: change?.amount.find((a: any) => a.unit === 'lovelace')?.quantity || '0',
        cbor: builtTxCbor,
      });

    } catch (err: any) {
      setError(err.message || 'Failed to build transaction. Check inputs.');
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
        // Clear summary after successful submission
        setSummary(null);
        setUnsignedTx(null);
      // Refresh wallet state to show new balance and UTxOs
        updateWalletState(); 
    } catch (err: any) {
        setError(err.message || "Transaction failed.");
    } finally {
        setLoading(false);
    }
  }


  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Wallet</h2>
                {connected && (
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <div className={`w-2 h-2 rounded-full ${network === 1 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span>{network === 1 ? 'Mainnet' : 'Testnet'}</span>
                  </div>
                )}
              </div>
              <CustomWalletConnector 
                onConnect={connect} 
                connected={connected} 
                onDisconnect={disconnect} 
              />
            </div>
            {connected && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Balance:</span><span className="font-mono font-bold">{(parseInt(adaBalance) / 1000000).toFixed(6)} ADA</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Address:</span><span className="font-mono text-violet-300 truncate">{address ? `${address.slice(0, 10)}...${address.slice(-4)}` : 'N/A'}</span></div>
              </div>
            )}
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <UTXOSelector utxos={utxos} selectedUtxos={selectedUtxos} onSelectionChange={setSelectedUtxos} disabled={!connected} />
          </div>
        </div>

        {/* Middle Column (Updated with V2 UI) */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Transaction Builder</h2>
            <div className="border-b border-slate-700">
                <nav className="-mb-px flex">
                    <TabButton title="Simple Transfer" isActive={activeTab === 'Transfer'} onClick={() => setActiveTab('Transfer')} />
                    <TabButton title="Contract Interaction" isActive={activeTab === 'Contract'} onClick={() => setActiveTab('Contract')} />
                </nav>
            </div>
            <div className="mt-6">
              {activeTab === 'Transfer' && (
                <div className="space-y-4">
                    <FormInput label="Recipient Address" placeholder="addr_test1..." value={recipient} onChange={setRecipient} />
                    <FormInput label="Amount (ADA)" placeholder="0.0" value={amount} onChange={setAmount} />
                    <FormTextarea label="Metadata (JSON, optional)" value={metadata} onChange={setMetadata} />
                </div>
              )}


                {activeTab === 'Contract' && (
                  <div className="space-y-4">
                    <FormInput label="Script Address" placeholder="addr_test1w..." value={scriptAddress} onChange={setScriptAddress} />
                    <button onClick={fetchScriptUtxos} disabled={scriptLoading || !connected} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed">
                      {scriptLoading ? 'Fetching...' : 'Fetch UTxOs from Script'}
                    </button>
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-slate-300">Locked UTxOs</h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto mt-2 pr-2">
                        {scriptUtxos.length > 0 ? scriptUtxos.map((utxo: any, i) => (
                          // 3. Add onClick to each list item
                          <div key={i} onClick={() => setDetailUtxo(utxo)} className="p-3 rounded-lg border bg-slate-800 border-slate-700 text-sm cursor-pointer hover:border-violet-500">
                            <p className="font-bold">
                              {(parseInt(utxo.amount.find(a => a.unit === 'lovelace')?.quantity || '0') / 1000000)} ADA
                            </p>
                            <p className="text-xs text-slate-400 truncate">Hash: {utxo.tx_hash}</p>
                            {utxo.data_hash && <p className="text-xs text-amber-400 truncate">Datum Hash: {utxo.data_hash}</p>}
                          </div>
                        )) : (
                          <p className="text-slate-500 text-sm text-center py-4">No UTxOs found at this address.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
          </div>
          
        {/* Right Column */}
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
                  {loading ? 'Building...' : 'Build & Preview'}
                </button>
                <button onClick={signAndSubmit} disabled={!unsignedTx || loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500">
                  {loading ? 'Submitting...' : 'Sign & Submit'}
                </button>
                {error && <div className="text-red-400 text-sm text-center p-2 bg-red-900/50 rounded-md">{error}</div>}
                {txHash && <div className="text-green-400 text-sm text-center p-2 bg-green-900/50 rounded-md">Success! Tx ID: <a href={`${explorerUrl}/transaction/${txHash}`} target="_blank" rel="noreferrer" className="underline font-mono text-xs break-all">{txHash}</a></div>}
            </div>
        </div>
      </div>
      {/* 4. Render the modal component */}
      <UTxODetailModal utxo={detailUtxo} onClose={() => setDetailUtxo(null)} />
    </>
  );
};

// --- Sub-Components ---

const CustomWalletConnector = ({ onConnect, connected, onDisconnect }) => {
  const wallets = useWalletList();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConnect = (walletName) => {
    onConnect(walletName);
    setIsModalOpen(false);
  };

  return (
    <>
      {connected ? (
        <button onClick={onDisconnect} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
          <Power size={16} /> Disconnect
        </button>
      ) : (
        <button onClick={() => setIsModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg text-sm">
          Connect Wallet
        </button>
      )}

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

const TabButton = ({ title, isActive, onClick }) => (
  <button className={`flex-1 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none ${isActive ? 'border-violet-400 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-300'}`} onClick={onClick}>
    {title}
  </button>
);

const FormInput = ({ label, value, onChange, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <div className="mt-1">
            <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="block w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none" placeholder={placeholder}/>
        </div>
    </div>
);

const FormTextarea = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <div className="mt-1">
            <textarea value={value} onChange={(e) => onChange(e.target.value)} className="block w-full h-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono text-sm" />
        </div>
    </div>
);

const SummaryRow = ({ label, value }) => (
    <div className="flex justify-between items-center bg-slate-800 p-2 rounded-md">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono font-bold">{value}</span>
    </div>
);