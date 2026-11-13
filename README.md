# Cardano Developer Suite

A browser based transaction builder and script evaluator for Cardano.

## Features

- Connect a CIP-30 wallet and inspect its address, payment key hash, balance, and UTxOs. The DRep public key is shown when the wallet supports CIP-95.
- Build an ADA transfer, optionally choose inputs and attach metadata, inspect the fee, change and unsigned CBOR, then sign and submit with the wallet.
- Lock ADA at a script address with an inline datum.
- Fetch script UTxOs and evaluate a Plutus V2 or V3 script spend with a redeemer and collateral. Evaluation does **not** sign or submit the transaction.
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
npm run build
```

The automated tests cover exact ADA conversion, network validation and explorer routing. End to end wallet signing and on-chain script evaluation require a funded wallet and are not part of automated tests.

## Cardano compatibility

Cardano is in the Conway era. The [van Rossem upgrade](https://docs.cardano.org/about-cardano/evolution/upgrades/van-rossem) moved mainnet to protocol version 11 in July 2026 without changing the transaction format. This app supports Plutus V2 and V3 interactions and uses live chain parameters, so it does not pin protocol version 11 fee or cost values. Governance can change those values.
