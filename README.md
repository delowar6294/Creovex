# CREOVEX

CREOVEX is a dependency-free, responsive launchpad frontend with a same-origin Node server for read-only network checks and EVM token reads. The current checkout started empty, so this is a fresh implementation rather than a rewrite of an existing app.

## Current release boundary

- The five mainnet entries show verified chain identifiers, native gas assets, token standards, and explorers. Robinhood Chain, Base, BNB Smart Chain, and Solana use shared public RPC endpoints for read-only checks by default; these may be rate-limited and are not production infrastructure. Ethereum needs a server-side RPC URL. Set dedicated HTTPS RPC URLs through server environment variables before production use.
- Wallet access is user-initiated through injected EIP-1193 providers. This build does not include WalletConnect credentials, a Solana wallet adapter, or native mobile deep links.
- Token drafts and wizard progress stay in the current browser's local storage. Logo selection is local to the current page; no upload service is configured.
- Mainnet and testnet deployment are disabled. There is no audited/compiled deployment contract, verified testnet release, configured fee recipient, or deployment infrastructure in this checkout. No fee is charged and the app never submits a transaction.
- Explore and activity pages show honest empty states. There is no indexer or launch registry configured. EVM token detail reads use `eth_call` when the selected chain's RPC is reachable; deployer, transaction, verification, and metadata fields remain unavailable without an indexer/explorer integration.
- No database is needed for the draft-first version.

## Run locally

Requires Node.js 20 or newer. No package installation is needed.

```sh
npm run dev
```

Open `http://127.0.0.1:4173`. Set `CREOVEX_RPC_ETHEREUM`, `CREOVEX_RPC_BASE`, `CREOVEX_RPC_BNB`, `CREOVEX_RPC_ROBINHOOD`, or `CREOVEX_RPC_SOLANA` in the server environment to choose an HTTPS RPC endpoint. RPC credentials stay on the server and are never sent to browser code. Public default endpoints are for lightweight read checks only.

For PowerShell, for example:

```powershell
$env:CREOVEX_RPC_ETHEREUM = "https://your-provider.example"
npm.cmd run dev
```

## Checks

```sh
npm run lint
npm test
npm run build
```

This first version uses plain JavaScript and has no TypeScript compiler or framework packages. The lint script performs syntax checks; there is no separate static type-check step.

## Network references used for displayed configuration

- [Robinhood Chain network details](https://docs.robinhood.com/chain/connecting/) and [wallet network setup](https://docs.robinhood.com/chain/add-network-to-wallet/)
- [Base chain ID](https://docs.base.org/base-chain/api-reference/ethereum-json-rpc-api/eth_chainId) and [Base RPC](https://docs.base.org/base-chain/api-reference/ethereum-json-rpc-api/eth_getTransactionCount)
- [BNB Smart Chain JSON-RPC endpoints](https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/)
- [Ethereum JSON-RPC and network IDs](https://ethereum.org/developers/docs/apis/json-rpc/)
- [Solana clusters and public RPC endpoints](https://solana.com/docs/references/clusters)

Network compatibility is not a Robinhood endorsement. This app uses the network name for factual compatibility identification and does not use official network marks.
