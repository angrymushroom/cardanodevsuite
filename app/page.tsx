'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserWallet, Transaction, UTxO, resolvePaymentKeyHash } from '@meshsdk/core';
import { Sparkles, ArrowRight, Power, ChevronsRight, FileJson, Send, Search, Clipboard } from 'lucide-react';
import UTXOSelector from '../components/UTXOSelector';
import DeployContractView from '../components/DeployContractView';
import ContractInteractionView from '../components/ContractInteractionView';
import { adaToLovelace, assertAddressNetwork, explorerTxUrl, formatAda, walletNetwork, type TestnetNetwork } from '../lib/cardano';
import { createKoiosProvider } from '../lib/provider';

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
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [networkId, setNetworkId] = useState<number | undefined>();
  const connected = wallet !== null;
  const connect = async (name: string) => {
    try {
      const nextWallet = await BrowserWallet.enable(name);
      setNetworkId(await nextWallet.getNetworkId());
      setWallet(nextWallet);
    } catch (e: any) {
      setError(e.message || 'Wallet connection failed.');
    }
  };
  const disconnect = () => { setWallet(null); setNetworkId(undefined); };
  const [testnet, setTestnet] = useState<TestnetNetwork>('preprod');
  const network = walletNetwork(networkId, testnet);

  // State that is shared across all views
  const [address, setAddress] = useState<string | undefined>();
  const [adaBalance, setAdaBalance] = useState<string>('0');
  const [utxos, setUtxos] = useState<UTxO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pkh, setPkh] = useState<string | null>(null);
  const [pk, setPk] = useState<string | null>(null);

  // LIFTED STATE: Selected UTxOs is now managed here
  const [selectedUtxos, setSelectedUtxos] = useState<UTxO[]>([]);

  const updateWalletState = useCallback(async () => {
    if (connected && wallet) {
        try {
            const currentUtxos = await wallet.getUtxos();
            const currentBalance = await wallet.getBalance();
            const walletAddress = await wallet.getChangeAddress();
            // CIP-95 is optional. Its DRep key is different from the payment key hash.
            const dRep = await wallet.getDRep().catch(() => undefined);

            setUtxos(currentUtxos || []);
            setSelectedUtxos([]);
            setAddress(walletAddress);
            setAdaBalance(currentBalance.find(a => a.unit === 'lovelace')?.quantity || '0');
            setPkh(resolvePaymentKeyHash(walletAddress));
            setPk(dRep?.publicKey || null);
            setError(null);


        } catch (e) { console.error(e); setError("Failed to fetch wallet data."); }
    } else {
        setAddress(undefined); setAdaBalance('0'); setUtxos([]); setSelectedUtxos([]); setPkh(null); setPk(null); setError(null);
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
        walletState={{ connected, connect, disconnect, address, adaBalance, network, networkId, testnet, setTestnet, pkh, pk, error }}
        utxos={utxos}
        selectedUtxos={selectedUtxos}
        onSelectionChange={setSelectedUtxos}
      />
      <MainContent
        activeView={activeView}
        walletProps={{ connected, wallet, address, network, updateWalletState, selectedUtxos }}
      />
    </div>
  );
};


// ==================================================================
// Sidebar and Navigation Components
// ==================================================================
const Sidebar = ({ activeView, onNavigate, walletState, utxos, selectedUtxos, onSelectionChange }) => {
  const { connected, connect, disconnect, address, adaBalance, network, networkId, testnet, setTestnet, pkh, pk, error } = walletState;

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
              <span className={`font-semibold ${network === 'mainnet' ? 'text-green-400' : 'text-yellow-400'}`}>
                {network === 'mainnet' ? 'Mainnet' : network === 'preprod' ? 'Preprod' : 'Preview'}
              </span>
            </div>
            {networkId === 0 && <label className="block text-slate-400">Testnet
              <select value={testnet} onChange={e => setTestnet(e.target.value as TestnetNetwork)} className="mt-1 block w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white">
                <option value="preprod">Preprod</option><option value="preview">Preview</option>
              </select>
            </label>}
            {networkId === 0 && <p className="text-xs text-slate-500">CIP-30 identifies both testnets as network 0. Select the network configured in your wallet.</p>}
            {/* Use the new InfoRow component for these */}
            <InfoRow
              label="Balance"
              value={`${formatAda(adaBalance)} ADA`}
              fullValue={formatAda(adaBalance)}
            />
            <InfoRow
              label="Address"
              value={address ? `${address.slice(0, 10)}...${address.slice(-4)}` : 'N/A'}
              fullValue={address}
            />
            <InfoRow
              label="PKH"
              value={pkh ? `${pkh.slice(0, 10)}...${pkh.slice(-4)}` : 'N/A'}
              fullValue={pkh}
            />
            <InfoRow
              label="DRep PK"
              value={pk ? `${pk.slice(0, 10)}...${pk.slice(-4)}` : 'N/A'}
              fullValue={pk}
            />
          </div>
        )}
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
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
const SimpleTransferView = ({ connected, wallet, address, network, selectedUtxos, updateWalletState }) => {
  const [loading, setLoading]       = useState(false);
  const [txHash, setTxHash]         = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [recipient, setRecipient]   = useState('');
  const [amount, setAmount]         = useState('');
  const [metadata, setMetadata]     = useState('{}');
  const [unsignedTx, setUnsignedTx] = useState<string | null>(null);
  const [summary, setSummary]       = useState<any>(null);

  useEffect(() => {
    setUnsignedTx(null);
    setSummary(null);
  }, [recipient, amount, metadata, selectedUtxos, network, address]);

  async function buildPreview() {
    if (!wallet) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    setUnsignedTx(null);
    try {
      assertAddressNetwork(recipient, network);
      const provider = createKoiosProvider(network);
      const tx = new Transaction({ initiator: wallet, fetcher: provider, params: await provider.fetchProtocolParameters() });
      tx.sendLovelace(recipient, adaToLovelace(amount));
      if (selectedUtxos.length > 0) tx.setTxInputs(selectedUtxos);

      if (metadata.trim() !== '{}' && metadata.trim() !== '') {
        const metadataJson = JSON.parse(metadata);
        if (typeof metadataJson !== 'object' || metadataJson === null || Array.isArray(metadataJson)) throw new Error('Metadata must be a JSON object keyed by numeric labels.');
        for (const [label, value] of Object.entries(metadataJson)) {
          if (!/^\d+$/.test(label) || !Number.isSafeInteger(Number(label))) throw new Error('Metadata labels must be non-negative integers.');
          tx.setMetadata(Number(label), value as object);
        }
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
        await updateWalletState?.();
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
                  <SummaryRow label="Calculated Fee:" value={summary?.fee ? `${formatAda(summary.fee)} ADA` : '-'} />
                  <SummaryRow label="Change Output:" value={summary ? `${formatAda(summary.change)} ADA` : '-'} />
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
                {txHash && <div className="text-green-400 text-sm text-center p-2 bg-green-900/50 rounded-md">Success! Tx ID: <a href={explorerTxUrl(network, txHash)} target="_blank" rel="noreferrer" className="underline font-mono text-xs break-all">{txHash}</a></div>}
            </div>
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
    const [wallets, setWallets] = useState<ReturnType<typeof BrowserWallet.getInstalledWallets>>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    useEffect(() => { setWallets(BrowserWallet.getInstalledWallets()); }, [isModalOpen]);
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
                      {/* Wallet extensions provide data URL icons, which do not need image optimization. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
