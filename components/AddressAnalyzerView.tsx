'use client';

import { useState } from 'react';
import {
  Address,
  BaseAddress,
  EnterpriseAddress,
  RewardAddress,
} from '@emurgo/cardano-serialization-lib-asmjs';

interface ParsedAddress {
  type: string;
  networkId: number;
  network: string;
  rawHex: string;
  paymentKeyHash?: string;
  paymentScriptHash?: string;
  stakeKeyHash?: string;
  stakeScriptHash?: string;
}

export default function AddressAnalyzerView() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ParsedAddress | null>(null);
  const [error, setError] = useState<string | null>(null);

  function analyze() {
    setError(null);
    setResult(null);
    try {
      const addr = Address.from_bech32(input.trim());
      const kind = addr.kind(); // 0=Base, 1=Pointer, 2=Enterprise, 3=Reward, 4=Byron
      const networkId = addr.network_id();
      const network = networkId === 1 ? 'Mainnet' : 'Testnet';
      const rawHex = addr.to_hex();

      const res: ParsedAddress = { type: '', networkId, network, rawHex };

      if (kind === 0) {
        const base = BaseAddress.from_address(addr)!;
        const pay = base.payment_cred();
        const stake = base.stake_cred();
        res.type = 'Base Address';
        if (pay.kind() === 0) res.paymentKeyHash = pay.to_keyhash()!.to_hex();
        else res.paymentScriptHash = pay.to_scripthash()!.to_hex();
        if (stake.kind() === 0) res.stakeKeyHash = stake.to_keyhash()!.to_hex();
        else res.stakeScriptHash = stake.to_scripthash()!.to_hex();
      } else if (kind === 1) {
        res.type = 'Pointer Address';
      } else if (kind === 2) {
        const ent = EnterpriseAddress.from_address(addr)!;
        const pay = ent.payment_cred();
        if (pay.kind() === 0) {
          res.type = 'Enterprise Address (Key)';
          res.paymentKeyHash = pay.to_keyhash()!.to_hex();
        } else {
          res.type = 'Enterprise Address (Script)';
          res.paymentScriptHash = pay.to_scripthash()!.to_hex();
        }
      } else if (kind === 3) {
        const reward = RewardAddress.from_address(addr)!;
        const cred = reward.payment_cred();
        if (cred.kind() === 0) {
          res.type = 'Reward / Stake Address (Key)';
          res.stakeKeyHash = cred.to_keyhash()!.to_hex();
        } else {
          res.type = 'Reward / Stake Address (Script)';
          res.stakeScriptHash = cred.to_scripthash()!.to_hex();
        }
      } else if (kind === 4) {
        res.type = 'Byron Address (Legacy)';
      }

      setResult(res);
    } catch {
      setError('Invalid address. Please enter a valid bech32 Cardano address (addr1..., addr_test1..., stake1...).');
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-2">Address Analyzer</h2>
      <p className="text-slate-400 text-sm mb-6">
        Decode any Cardano bech32 address into its components: type, network, payment key/script hash, and stake key/script hash.
      </p>
      <div className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Cardano Address (bech32)</label>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && analyze()}
            placeholder="addr1... / addr_test1... / stake1..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <button
          onClick={analyze}
          className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          Analyze
        </button>

        {error && <div className="text-red-400 text-sm p-3 bg-red-900/30 rounded-lg">{error}</div>}

        {result && (
          <div className="space-y-2 mt-2">
            <FieldRow label="Address Type" value={result.type} bold />
            <FieldRow
              label="Network"
              value={`${result.network}  (Network ID: ${result.networkId})`}
              color={result.networkId === 1 ? 'green' : 'yellow'}
            />
            <FieldRow label="Raw Hex" value={result.rawHex} mono />
            {result.paymentKeyHash && <FieldRow label="Payment Key Hash" value={result.paymentKeyHash} mono />}
            {result.paymentScriptHash && (
              <FieldRow label="Payment Script Hash" value={result.paymentScriptHash} mono color="purple" />
            )}
            {result.stakeKeyHash && <FieldRow label="Stake Key Hash" value={result.stakeKeyHash} mono />}
            {result.stakeScriptHash && (
              <FieldRow label="Stake Script Hash" value={result.stakeScriptHash} mono color="purple" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  mono = false,
  bold = false,
  color,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  color?: 'green' | 'yellow' | 'purple';
}) {
  const [copied, setCopied] = useState(false);
  const colorMap = { green: 'text-green-400', yellow: 'text-yellow-400', purple: 'text-violet-400' };
  const textColor = color ? colorMap[color] : 'text-slate-100';

  return (
    <div className="bg-slate-800 rounded-lg p-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="flex items-start gap-2">
        <span className={`flex-1 ${mono ? 'font-mono text-xs break-all' : bold ? 'font-semibold' : 'text-sm'} ${textColor}`}>
          {value}
        </span>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="shrink-0 text-xs text-slate-500 hover:text-slate-300 mt-0.5"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
