import type { UTxO } from '@meshsdk/core';
import type { CardanoNetwork } from './cardano';

type TransferDraft = {
  recipient: string;
  amount: string;
  metadata: string;
  network: CardanoNetwork;
  address?: string;
  selectedUtxos: UTxO[];
};

export function transferDraftKey({ recipient, amount, metadata, network, address, selectedUtxos }: TransferDraft): string {
  return JSON.stringify({
    recipient,
    amount,
    metadata,
    network,
    address,
    inputs: selectedUtxos.map(({ input }) => `${input.txHash}#${input.outputIndex}`),
  });
}
