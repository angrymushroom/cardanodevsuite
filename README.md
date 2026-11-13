# Cardano Developer Suite

A browser based transaction builder and script evaluator for Cardano.

## Features

- Connect a CIP-30 wallet and inspect its address, payment key hash, balance, and UTxOs. The DRep public key is shown when the wallet supports CIP-95.
- Build an ADA transfer, optionally choose inputs and attach metadata, inspect the fee, change and unsigned CBOR, then sign and submit with the wallet.
- Lock ADA at a script address with an inline datum.
- Fetch script UTxOs, evaluate a Plutus V1, V2, or V3 spend with a redeemer and collateral, or build, sign, and submit it with the wallet. Evaluation alone does **not** submit a transaction.
- Watch a submitted transaction until Koios indexes it, or paste any transaction hash to inspect confirmation, block, slot, fee, and size. Submission errors show recovery hints for common Cardano ledger rules.
- Use Plutus Data Lab to convert detailed datum/redeemer JSON and CBOR, calculate the exact datum hash, and compare an expected hash. Contract views can send their datum to the lab.
- Use mainnet, preprod, or preview. CIP-30 returns network ID `0` for both testnets, so select the testnet that matches your wallet. Transaction links follow that choice.

The app uses [Mesh SDK](https://meshjs.dev/) and the public [Koios provider](https://meshjs.dev/providers/koios). A same-origin route forwards the required Koios calls because its public endpoint does not allow arbitrary browser origins. It does not embed an API key. Transaction builders fetch current protocol parameters from the provider instead of using a checked in snapshot. Network access and a compatible wallet are needed for chain operations. Public Koios endpoints may rate limit requests; production deployments can configure another provider.

## Run

Requires Node.js 20.9 or later, npm, and a CIP-30 browser wallet. For script spending, configure collateral in the wallet.

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>. Start on preprod with test ADA before using mainnet funds. The script CBOR and datum/redeemer must match the validator being tested. A datum hash input needs the original datum JSON; an inline datum is taken from its UTxO.

## Checks

```bash
npm run typecheck
npm test
npm run test:live
npm run build
```

`npm test` runs deterministic unit tests against the actual conversion, validation, parsing, preview-key, and Plutus serialization functions. Their inputs are fixed vectors; the transaction parser uses a constructed Koios-shaped response, and the provider test replaces Koios with a local fake to exercise empty and failure cases. These tests do not prove live connectivity. `npm run test:live` makes real preprod Koios requests through the app's route handler and Mesh SDK, checks a confirmed on-chain transaction, and loads UTxOs from a real address. It needs internet access and can fail during provider outages or if the reference UTxO is spent. End to end wallet signing and on-chain script evaluation require a funded wallet and are not covered by these commands.

The Transaction Watch checks every 5 seconds for up to 10 minutes. A missing hash can mean propagation delay, a wrong network, or a transaction that was never accepted; it does not prove failure. The app refreshes wallet UTxOs after confirmation instead of immediately after submission, and does not automatically sign or resubmit.

See [developer tool research](docs/developer-tool-research.md) for the demand signals and the next candidate tools.

## Cardano compatibility

Cardano is in the Conway era. The [van Rossem upgrade](https://docs.cardano.org/about-cardano/evolution/upgrades/van-rossem) moved mainnet to protocol version 11 in July 2026 without changing the transaction format. This app supports Plutus V1, V2, and V3 interactions and uses live chain parameters, so it does not pin protocol version 11 fee or cost values. Governance can change those values.
