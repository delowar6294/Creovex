export const NETWORKS = [
  {
    id: "robinhood",
    name: "Robinhood Chain",
    mark: "R",
    family: "EVM",
    chainId: 4663,
    chainLabel: "4663",
    environment: "Mainnet",
    nativeCurrency: "ETH",
    standard: "ERC-20",
    explorer: "https://robinhoodchain.blockscout.com",
    deploymentReady: false,
    rpcMode: "public",
    tint: "#9b8cff"
  },
  {
    id: "base",
    name: "Base",
    mark: "B",
    family: "EVM",
    chainId: 8453,
    chainLabel: "8453",
    environment: "Mainnet",
    nativeCurrency: "ETH",
    standard: "ERC-20",
    explorer: "https://basescan.org",
    deploymentReady: false,
    rpcMode: "public",
    tint: "#668cff"
  },
  {
    id: "ethereum",
    name: "Ethereum",
    mark: "Ξ",
    family: "EVM",
    chainId: 1,
    chainLabel: "1",
    environment: "Mainnet",
    nativeCurrency: "ETH",
    standard: "ERC-20",
    explorer: "https://etherscan.io",
    deploymentReady: false,
    rpcMode: "configured",
    tint: "#98a9d9"
  },
  {
    id: "bnb",
    name: "BNB Smart Chain",
    mark: "◆",
    family: "EVM",
    chainId: 56,
    chainLabel: "56",
    environment: "Mainnet",
    nativeCurrency: "BNB",
    standard: "BEP-20 (ERC-20 compatible)",
    explorer: "https://bscscan.com",
    deploymentReady: false,
    rpcMode: "public",
    tint: "#e8bd64"
  },
  {
    id: "solana",
    name: "Solana",
    mark: "S",
    family: "Solana",
    chainId: null,
    chainLabel: "Mainnet Beta",
    environment: "Mainnet",
    nativeCurrency: "SOL",
    standard: "SPL Token",
    explorer: "https://explorer.solana.com",
    deploymentReady: false,
    rpcMode: "public",
    tint: "#72e0cf"
  }
];

export const NETWORK_BY_ID = Object.assign(Object.create(null), Object.fromEntries(NETWORKS.map((network) => [network.id, network])));

export const PLATFORM_STATUS = Object.freeze({
  deploymentEnabled: false,
  contractConfigured: false,
  feeRecipientConfigured: false,
  indexerConfigured: false,
  metadataStorageConfigured: false
});
