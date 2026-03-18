'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet, useWalletList, useNetwork } from '@meshsdk/react';
import { UTxO } from '@meshsdk/core';
import { Address, BaseAddress } from '@emurgo/cardano-serialization-lib-asmjs';
import { Sparkles, Power, ChevronsRight, FileJson, Send, Search, AlertTriangle } from 'lucide-react';
import UTXOSelector from '../components/UTXOSelector';
import DeployContractView from '../components/DeployContractView';
import SimpleTransferView from '../components/SimpleTransferView';
import ContractInteractionView from '../components/ContractInteractionView';
import CopyButton from '../components/CopyButton';

const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY ?? '';

// ==================================================================
// Shared types
// ==================================================================
export interface WalletProps {
  connected: boolean;
  wallet: ReturnType<typeof useWallet>['wallet'];
  address: string | undefined;
  updateWalletState: () => void;
  selectedUtxos: UTxO[];
}

interface WalletState {
  connected: boolean;
  connect: (name: string) => void;
  disconnect: () => void;
  address: string | undefined;
  adaBalance: string;
  network: number | undefined;
  pkh: string | null;
}

// ==================================================================
// Main Page
// ==================================================================
export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-700">
        <div className="container mx-auto px-6 py-3 flex items-center gap-2">
          <Sparkles className="text-violet-400" />
          <h1 className="text-xl font-bold">Cardano Dev Suite</h1>
        </div>
      </header>
      <div className="bg-black pt-16 min-h-screen">
        <div className="container mx-auto px-6 py-8">
          <DeveloperSuite />
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// Main App Container
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
        // Fetch all wallet data concurrently
        const [currentUtxos, currentBalance, usedAddresses] = await Promise.all([
          wallet.getUtxos(),
          wallet.getBalance(),
          wallet.getUsedAddresses(),
        ]);

        const addr = usedAddresses[0];
        setUtxos(currentUtxos || []);
        setAddress(addr);
        setAdaBalance(currentBalance.find(a => a.unit === 'lovelace')?.quantity || '0');

        // Parse PKH directly from the bech32 address (more reliable than getDRep)
        try {
          const cslAddr = Address.from_bech32(addr);
          const baseAddr = BaseAddress.from_address(cslAddr);
          setPkh(baseAddr?.payment_cred().to_keyhash()?.to_hex() ?? null);
        } catch {
          setPkh(null);
        }
      } catch {
        // Wallet state fetch failed silently — user will see stale data
      }
    } else {
      setAddress(undefined);
      setAdaBalance('0');
      setUtxos([]);
      setSelectedUtxos([]);
      setPkh(null);
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
// Sidebar
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
            <InfoRow label="Balance" value={`${(parseInt(adaBalance) / 1000000).toFixed(2)} ADA`} fullValue={(parseInt(adaBalance) / 1000000).toFixed(6)} />
            <InfoRow label="Address" value={address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'} fullValue={address} />
            <InfoRow label="PKH" value={pkh ? `${pkh.slice(0, 6)}...${pkh.slice(-4)}` : 'N/A'} fullValue={pkh ?? undefined} />
          </div>
        )}
        <nav className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tools</h3>
          <NavItem icon={<Send size={18} />} label="Simple Transfer" isActive={activeView === 'simple_transfer'} onClick={() => onNavigate('simple_transfer')} />
          <NavItem icon={<Search size={18} />} label="Deploy Contract" isActive={activeView === 'deploy_contract'} onClick={() => onNavigate('deploy_contract')} />
          <NavItem icon={<FileJson size={18} />} label="Contract Simulator" isActive={activeView === 'contract_simulator'} onClick={() => onNavigate('contract_simulator')} />
        </nav>
      </div>
      {activeView === 'simple_transfer' && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sticky top-96">
          <UTXOSelector utxos={utxos} selectedUtxos={selectedUtxos} onSelectionChange={onSelectionChange} disabled={!connected} />
        </div>
      )}
    </aside>
  );
};

// ==================================================================
// Main Content
// ==================================================================
const MainContent = ({ activeView, walletProps }: { activeView: string; walletProps: WalletProps }) => (
  <main className="flex-1 space-y-4">
    {!BLOCKFROST_API_KEY && (
      <div className="flex items-center gap-3 bg-amber-900/40 border border-amber-600 rounded-xl px-4 py-3 text-sm text-amber-300">
        <AlertTriangle size={16} className="shrink-0" />
        <span><code className="font-mono">NEXT_PUBLIC_BLOCKFROST_API_KEY</code> is not set — contract features will not work. See <code className="font-mono">.env.example</code>.</span>
      </div>
    )}
    {!walletProps.connected && (
      <div className="flex items-center gap-3 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-300">
        <Power size={16} className="text-violet-400 shrink-0" />
        Connect your wallet from the sidebar to get started.
      </div>
    )}
    {activeView === 'simple_transfer' && <SimpleTransferView {...walletProps} />}
    {activeView === 'deploy_contract' && <DeployContractView {...walletProps} />}
    {activeView === 'contract_simulator' && <ContractInteractionView {...walletProps} />}
  </main>
);

// ==================================================================
// UI Helpers
// ==================================================================
const NavItem = ({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
    {icon}
    <span>{label}</span>
    {isActive && <ChevronsRight size={16} className="ml-auto" />}
  </button>
);

const CustomWalletConnector = ({ onConnect, connected, onDisconnect }: { onConnect: (name: string) => void; connected: boolean; onDisconnect: () => void }) => {
  const wallets = useWalletList();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleConnect = (walletName: string) => { onConnect(walletName); setIsModalOpen(false); };
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

const InfoRow = ({ label, value, fullValue }: { label: string; value: string; fullValue?: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-slate-400">{label}:</span>
    <div className="flex items-center">
      <span className="font-mono truncate">{value}</span>
      <CopyButton textToCopy={fullValue || value} />
    </div>
  </div>
);
