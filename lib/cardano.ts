import { Address } from '@emurgo/cardano-serialization-lib-asmjs';

export type CardanoNetwork = 'mainnet' | 'preprod' | 'preview';
export type TestnetNetwork = Exclude<CardanoNetwork, 'mainnet'>;

export function walletNetwork(networkId: number | undefined, testnet: TestnetNetwork): CardanoNetwork {
  return networkId === 1 ? 'mainnet' : testnet;
}

export function koiosNetwork(network: CardanoNetwork): 'api' | TestnetNetwork {
  return network === 'mainnet' ? 'api' : network;
}

export function explorerTxUrl(network: CardanoNetwork, hash: string): string {
  const host = network === 'mainnet' ? 'cardanoscan.io' : `${network}.cardanoscan.io`;
  return `https://${host}/transaction/${encodeURIComponent(hash)}`;
}

export function assertAddressNetwork(address: string, network: CardanoNetwork): void {
  const prefix = network === 'mainnet' ? 'addr1' : 'addr_test1';
  let valid = false;
  try {
    valid = address.startsWith(prefix) && Address.from_bech32(address).network_id() === (network === 'mainnet' ? 1 : 0);
  } catch { /* Invalid bech32 or non-payment address. */ }
  if (!valid) {
    throw new Error(`Address must be a ${network} payment or script address.`);
  }
}

export function adaToLovelace(value: string): string {
  const normalized = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(normalized)) {
    throw new Error('Enter a positive ADA amount with at most 6 decimal places.');
  }
  const [whole, fraction = ''] = normalized.split('.');
  const lovelace = BigInt(whole) * 1_000_000n + BigInt((fraction + '000000').slice(0, 6));
  if (lovelace <= 0n) throw new Error('Amount must be greater than zero.');
  return lovelace.toString();
}

export function formatAda(lovelace: string): string {
  const quantity = BigInt(lovelace || '0');
  const sign = quantity < 0n ? '-' : '';
  const absolute = quantity < 0n ? -quantity : quantity;
  return `${sign}${absolute / 1_000_000n}.${(absolute % 1_000_000n).toString().padStart(6, '0')}`;
}
