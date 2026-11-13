export type ConfirmedTransaction = {
  hash: string;
  blockHash: string;
  blockHeight: number;
  slot: number;
  fee: string;
  size: number;
  timestamp: number;
};

export function isTransactionHash(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value.trim());
}

export function parseTransactionInfo(rows: unknown, hash: string): ConfirmedTransaction | null {
  if (!Array.isArray(rows)) throw new Error('Provider returned unexpected transaction data.');
  if (rows.length === 0) return null;
  const row = rows[0];
  if (!row || typeof row !== 'object' || row.tx_hash?.toLowerCase() !== hash.toLowerCase()) {
    throw new Error('Provider returned unexpected transaction data.');
  }
  if (typeof row.block_hash !== 'string' || !Number.isSafeInteger(Number(row.absolute_slot)) ||
    !Number.isSafeInteger(Number(row.block_height)) || !Number.isSafeInteger(Number(row.tx_size)) ||
    !Number.isSafeInteger(Number(row.tx_timestamp)) || !/^\d+$/.test(String(row.fee))) {
    throw new Error('Provider returned incomplete confirmation data.');
  }
  return {
    hash: row.tx_hash,
    blockHash: row.block_hash,
    blockHeight: Number(row.block_height),
    slot: Number(row.absolute_slot),
    fee: String(row.fee),
    size: Number(row.tx_size),
    timestamp: Number(row.tx_timestamp),
  };
}

export function transactionErrorHint(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  if (/BadInputsUTxO/i.test(message)) return 'An input is already spent or the indexer is behind. Refresh UTxOs, rebuild, then sign again.';
  if (/OutsideValidityIntervalUTxO/i.test(message)) return 'The validity interval has expired. Rebuild with a current interval.';
  if (/ValueNotConservedUTxO/i.test(message)) return 'Inputs do not equal outputs plus fees. Review amounts and rebuild.';
  if (/FeeTooSmallUTxO/i.test(message)) return 'The fee is too low. Fetch current protocol parameters and rebuild.';
  if (/insufficient|not enough|utxo balance/i.test(message)) return 'The wallet lacks spendable funds for the outputs, minimum ADA, and fees.';
  if (/429|rate.?limit/i.test(message)) return 'The provider is rate limiting requests. Wait briefly before retrying.';
  return null;
}
