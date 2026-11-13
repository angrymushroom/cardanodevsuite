import { KoiosProvider } from '@meshsdk/core';
import { koiosNetwork, type CardanoNetwork } from './cardano';

export function createKoiosProvider(network: CardanoNetwork): KoiosProvider {
  // The browser uses the same-origin route so Koios need not allow cross-origin calls.
  // The proxy discards the SDK's unused Authorization header.
  return new KoiosProvider(`${window.location.origin}/api/koios/${koiosNetwork(network)}`);
}
