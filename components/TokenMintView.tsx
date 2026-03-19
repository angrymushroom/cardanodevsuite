'use client';

import { useState } from 'react';
import { useWallet } from '@meshsdk/react';
import { Transaction, NativeScript, resolveNativeScriptHash, resolveNativeScriptHex } from '@meshsdk/core';
import { FormInput } from './Form';
import { getNetworkConfig } from '../lib/networkConfig';

interface TokenMintViewProps {
  connected: boolean;
  updateWalletState: () => void;
  network: number | undefined;
}

type PolicyType = 'sig_only' | 'sig_and_lock';

export default function TokenMintView({ connected, updateWalletState, network }: TokenMintViewProps) {
  const { wallet } = useWallet();
  const { cardanoscanBaseUrl } = getNetworkConfig(network);

  const [policyType, setPolicyType] = useState<PolicyType>('sig_only');
  const [lockSlot, setLockSlot] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [displayName, setDisplayName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');

  const [computedPolicyId, setComputedPolicyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buildScript(): Promise<{ script: NativeScript; policyId: string }> {
    const usedAddresses = await wallet!.getUsedAddresses();
    const walletAddress = usedAddresses[0];

    // Extract PKH from address via CSL
    const csl = await import('@emurgo/cardano-serialization-lib-asmjs');
    const addr = csl.Address.from_bech32(walletAddress);
    const ent = csl.BaseAddress.from_address(addr) ?? csl.EnterpriseAddress.from_address(addr);
    if (!ent) throw new Error('Could not extract payment credential from wallet address.');
    const pkh = ent.payment_cred().to_keyhash()!.to_hex();

    let script: NativeScript;
    if (policyType === 'sig_only') {
      script = { type: 'all', scripts: [{ type: 'sig', keyHash: pkh }] };
    } else {
      if (!lockSlot || isNaN(parseInt(lockSlot))) throw new Error('Lock slot must be a valid slot number.');
      script = {
        type: 'all',
        scripts: [
          { type: 'before', slot: lockSlot },
          { type: 'sig', keyHash: pkh },
        ],
      };
    }

    const policyId = resolveNativeScriptHash(script);
    return { script, policyId };
  }

  async function handlePreviewPolicy() {
    if (!wallet) return;
    setError(null);
    setComputedPolicyId(null);
    try {
      const { policyId } = await buildScript();
      setComputedPolicyId(policyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute policy ID.');
    }
  }

  async function handleMint() {
    if (!wallet || !tokenName || !quantity) return;
    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const { script, policyId } = await buildScript();
      setComputedPolicyId(policyId);

      const usedAddresses = await wallet.getUsedAddresses();
      const recipient = usedAddresses[0];

      const metadata: Record<string, unknown> = {};
      if (displayName) metadata['name'] = displayName;
      if (imageUrl) metadata['image'] = imageUrl;
      if (description) metadata['description'] = description;

      const tx = new Transaction({ initiator: wallet });

      // resolveNativeScriptHex returns the CBOR hex of the script,
      // which is the ForgeScript format expected by mintAsset
      const scriptHex = resolveNativeScriptHex(script);

      tx.mintAsset(scriptHex, {
        assetName: tokenName,
        assetQuantity: quantity,
        recipient,
      });

      // Attach CIP-25 metadata separately if provided
      if (Object.keys(metadata).length > 0) {
        tx.setMetadata(721, { [policyId]: { [tokenName]: metadata } });
      }

      const builtTx = await tx.build();
      const signedTx = await wallet.signTx(builtTx);
      const hash = await wallet.submitTx(signedTx);

      setTxHash(hash);
      updateWalletState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Minting failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-2">Native Token Minting</h2>
      <p className="text-slate-400 text-sm mb-6">
        Mint Cardano native tokens or NFTs with a signature-based or time-locked policy. No smart contract required.
      </p>

      <div className="space-y-6 max-w-lg">
        {/* Policy Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Minting Policy</label>
          <div className="flex gap-2">
            <button
              onClick={() => setPolicyType('sig_only')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors ${
                policyType === 'sig_only' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Signature Only
            </button>
            <button
              onClick={() => setPolicyType('sig_and_lock')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors ${
                policyType === 'sig_and_lock' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Signature + Time Lock
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {policyType === 'sig_only'
              ? 'Open policy: minting is allowed at any time with your wallet signature.'
              : 'Locked policy: minting must happen before the specified slot. Commonly used for NFT collections.'}
          </p>
        </div>

        {policyType === 'sig_and_lock' && (
          <FormInput
            label="Lock Slot (minting must happen before this slot)"
            placeholder="e.g. 150000000"
            value={lockSlot}
            onChange={setLockSlot}
          />
        )}

        {/* Token Details */}
        <div className="border-t border-slate-700 pt-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Token Details</h3>
          <FormInput label="Token Name (Asset Name)" placeholder="MyToken" value={tokenName} onChange={setTokenName} />
          <FormInput label="Quantity" placeholder="1" value={quantity} onChange={setQuantity} />
        </div>

        {/* CIP-25 Metadata (optional) */}
        <div className="border-t border-slate-700 pt-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            CIP-25 Metadata <span className="text-slate-500 font-normal normal-case">(optional, for NFTs)</span>
          </h3>
          <FormInput label="Display Name" placeholder="My Token" value={displayName} onChange={setDisplayName} />
          <FormInput label="Image URL (ipfs:// or https://)" placeholder="ipfs://Qm..." value={imageUrl} onChange={setImageUrl} />
          <FormInput label="Description" placeholder="A unique Cardano NFT" value={description} onChange={setDescription} />
        </div>

        {/* Policy ID preview */}
        <div className="border-t border-slate-700 pt-4 space-y-3">
          <button
            onClick={handlePreviewPolicy}
            disabled={!connected}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500"
          >
            Preview Policy ID
          </button>
          {computedPolicyId && (
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Policy ID</div>
              <p className="font-mono text-xs break-all text-violet-400">{computedPolicyId}</p>
            </div>
          )}
          <button
            onClick={handleMint}
            disabled={isLoading || !connected || !tokenName || !quantity}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isLoading ? 'Minting...' : 'Mint Token'}
          </button>
        </div>

        {error && <div className="text-red-400 text-sm p-3 bg-red-900/30 rounded-lg">{error}</div>}
        {txHash && (
          <div className="text-green-400 text-sm text-center p-3 bg-green-900/30 rounded-lg">
            Minted! Tx ID:{' '}
            <a
              href={`${cardanoscanBaseUrl}/transaction/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="underline font-mono text-xs break-all"
            >
              {txHash}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
