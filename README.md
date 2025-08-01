# Cardano Developer Suite

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

A web-based developer tool for the Cardano blockchain designed to simplify transaction building and testing. An open-source, "Postman-like" suite for dApp developers.

## Key Features (V1)

-   **Visual Transaction Builder:** An intuitive UI to construct transactions without using the command line.
-   **Live UTXO Management:** Connect your wallet to see and select available UTxOs to use as inputs.
-   **Automatic Fee & Change Calculation:** The suite automatically calculates the required fee and change output for every transaction.
-   **Pre-flight Summary:** A detailed summary of the transaction, including the final fee, change, and raw CBOR, for easy debugging before signing.
-   **Seamless Wallet Connection:** Connects to popular Cardano browser wallets using MeshJS.

## Tech Stack

-   **Framework:** Next.js
-   **Language:** TypeScript
-   **UI:** React & Tailwind CSS
-   **Blockchain Interaction:** MeshJS

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   Node.js (v18 or later)
-   npm
-   A Cardano browser wallet (like Eternl or Nami) set to the **Preprod Testnet**.

## Project Roadmap

-   **✅ V1: The Foundation:** Core transaction builder and inspector. (Current)
-   **🔜 V2: The Smart Contract Hub:** Add UI for Datum/Redeemer and transaction simulation.
-   **🗓️ V3: The Automation Suite:** Introduce test automation and code generation.

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.
