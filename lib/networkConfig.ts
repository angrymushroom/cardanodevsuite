/**
 * Returns Blockfrost and Cardanoscan config for the current wallet network.
 * network === 1 → Mainnet, anything else → Testnet (preprod/preview)
 */
export function getNetworkConfig(network: number | undefined) {
  const isMainnet = network === 1;

  const blockfrostApiKey = isMainnet
    ? (process.env.NEXT_PUBLIC_BLOCKFROST_MAINNET_API_KEY ?? '')
    : (process.env.NEXT_PUBLIC_BLOCKFROST_TESTNET_API_KEY
        ?? process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY
        ?? '');

  const blockfrostBaseUrl = isMainnet
    ? (process.env.NEXT_PUBLIC_BLOCKFROST_MAINNET_BASE_URL ?? 'https://cardano-mainnet.blockfrost.io/api/v0')
    : (process.env.NEXT_PUBLIC_BLOCKFROST_TESTNET_BASE_URL
        ?? process.env.NEXT_PUBLIC_BLOCKFROST_BASE_URL
        ?? 'https://cardano-preprod.blockfrost.io/api/v0');

  const cardanoscanBaseUrl = isMainnet
    ? (process.env.NEXT_PUBLIC_CARDANOSCAN_MAINNET_BASE_URL ?? 'https://cardanoscan.io')
    : (process.env.NEXT_PUBLIC_CARDANOSCAN_TESTNET_BASE_URL
        ?? process.env.NEXT_PUBLIC_CARDANOSCAN_BASE_URL
        ?? 'https://preprod.cardanoscan.io');

  return { blockfrostApiKey, blockfrostBaseUrl, cardanoscanBaseUrl };
}
