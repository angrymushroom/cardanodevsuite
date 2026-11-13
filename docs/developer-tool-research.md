# Small Cardano developer tools: demand review

Reviewed 13 November 2026. This is a qualitative reading of official Cardano and Mesh documentation, not a usage survey or a claim that no competing tool exists.

## Candidates

| Tool or workflow | Demand signal | Effort | Decision |
| --- | --- | --- | --- |
| Transaction confirmation and error guidance | The Cardano Developer Portal calls stale UTxOs after submission a common production bug. Its query guide treats confirmation as a distinct step and lists `BadInputsUTxO`, expired validity, value conservation, and fee errors. | Small | **Built** as Transaction Watch, linked from transfer and contract locking. |
| Datum and redeemer JSON/CBOR/hash workbench | Cardano's datum guide explains that hash-only UTxOs need the original datum at spend time. Mesh provides serializers and hash functions, but a developer still has to combine them and compare results. | Small | **Built** as Plutus Data Lab, linked from the contract views. |
| Wallet and testnet diagnostics | Preprod and Preview both use CIP-30 network ID 0, so developers must select the matching provider. | Small | Current suite already makes the choice explicit. |
| Reference script and minimum ADA cost estimator | Reference scripts reduce repeated script bytes; their fees and output minimums depend on live protocol parameters. | Medium | Later candidate. |

## Implemented workflows

After a wallet submits a transfer or lock transaction, the suite opens Transaction Watch with the submitted hash and network. It queries Koios `tx_info` every five seconds for up to ten minutes, distinguishes a confirmed transaction from a temporary absence, and shows the block, slot, fee, size, and explorer link. Wallet UTxOs refresh after confirmation. A developer can also paste a hash without connecting a wallet.

Errors from building or submission get specific, non-automatic guidance for known ledger rules. The suite does not replay a signed transaction or automatically ask a wallet to sign again: a stale input needs a fresh build, and a missing hash is not proof of rejection.

Plutus Data Lab runs entirely in the browser. It accepts Cardano's detailed Plutus JSON or original CBOR, returns the other format, byte size, and datum hash, and compares the hash with an expected on-chain value. It highlights an important ambiguity: two CBOR encodings can decode to the same JSON while hashing differently. A developer checking an existing datum should use its original CBOR when available.

## Sources

- [Cardano Developer Portal: Transaction building](https://developers.cardano.org/docs/developers/curriculum/start-building/transaction-building/) — stale UTxOs and retry-safe builds.
- [Cardano Developer Portal: Query the chain](https://developers.cardano.org/docs/developers/curriculum/start-building/query-the-chain/) — confirmation, inspection, and rejection reasons.
- [Cardano Developer Portal: Datum, redeemer, and ScriptContext](https://developers.cardano.org/docs/developers/curriculum/smart-contracts/datum-redeemer-context/) — datum availability and script data shapes.
- [Mesh SDK: Koios Provider](https://meshjs.dev/providers/koios) — transaction lookups and confirmation API.
- [Cardano Docs: Vasil](https://docs.cardano.org/about-cardano/evolution/upgrades/vasil) — inline datums and reference scripts.
