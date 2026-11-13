import { KoiosProvider, type UTxO } from '@meshsdk/core';
import { koiosNetwork, type CardanoNetwork } from './cardano';

export function createKoiosProvider(network: CardanoNetwork): KoiosProvider {
  // The browser uses the same-origin route so Koios need not allow cross-origin calls.
  // The proxy discards the SDK's unused Authorization header.
  return new KoiosProvider(`${window.location.origin}/api/koios/${koiosNetwork(network)}`);
}

export async function fetchAddressUTxOsStrict(provider: Pick<KoiosProvider, 'post' | 'fetchAddressUTxOs'>, address: string): Promise<UTxO[]> {
  // Mesh returns [] on any address_info error, which looks like an empty address.
  const response: unknown = await provider.post('address_info', { _addresses: [address] });
  if (!Array.isArray(response) || response.some(info => !info || !Array.isArray(info.utxo_set))) {
    throw new Error('Koios returned an unexpected address response.');
  }
  const utxos = await provider.fetchAddressUTxOs(address);
  const expectedCount = response.reduce((count, info) => count + info.utxo_set.length, 0);
  if (expectedCount > 0 && utxos.length === 0) {
    throw new Error('Could not load the UTxOs returned by Koios. Please retry.');
  }
  return utxos;
}
