import { NETWORKS, NETWORK_BY_ID } from "./config.js";
import { escapeHtml, isValidAddress, shortenAddress, validateTokenDraft } from "./core.js";

const app = document.querySelector("#app");
const DRAFT_KEY = "creovex.token-draft.v1";
const DRAFT_STEP_KEY = "creovex.token-draft-step.v1";
const STEP_COUNT = 6;

function loadDraft() {
  const base = { networkId: "", name: "", symbol: "", description: "", supply: "1000000", decimals: "18", website: "", socialX: "", socialTelegram: "", metadataURI: "" };
  try { return { ...base, ...JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") }; }
  catch { return base; }
}

function loadDraftStep() {
  try {
    const step = Number(localStorage.getItem(DRAFT_STEP_KEY) || 0);
    return Number.isInteger(step) && step >= 0 && step < STEP_COUNT ? step : 0;
  } catch { return 0; }
}

const state = {
  wallet: null,
  walletPending: false,
  walletError: "",
  modal: false,
  mobileNav: false,
  networkMenu: false,
  showWalletPanel: false,
  draft: loadDraft(),
  step: loadDraftStep(),
  logoUrl: "",
  networkChecks: {},
  tokenReads: {},
  toast: "",
  toastTimer: null
};

function icon(name, extra = "") {
  const paths = {
    arrow: '<path d="M4.5 12h15m-6-6 6 6-6 6"/>',
    arrowUp: '<path d="M7 17 17 7M7 7h10v10"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    chevron: '<path d="m7 10 5 5 5-5"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    external: '<path d="M14 4h6v6m-11 3L20 4"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
    plus: '<path d="M12 5v14m-7-7h14"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.2 2.3L23 17l-2.8.7L19 20l-1.2-2.3L15 17l2.8-.7L19 14Z"/>',
    wallet: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v15H6a3 3 0 0 1-3-3V6.5Z"/><path d="M3 7h15a2 2 0 0 1 2 2v2h-5a2 2 0 0 0 0 4h5"/><path d="M16 13h.01"/>'
  };
  return `<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.spark}</svg>`;
}

function logoMark(size = "") {
  return `<span class="brand-mark ${size ? `brand-mark--${size}` : ""}" aria-hidden="true"><svg viewBox="0 0 64 64"><defs><linearGradient id="creovex-gradient" x1="8" y1="8" x2="56" y2="56"><stop stop-color="#d8caff"/><stop offset=".52" stop-color="#8b6aff"/><stop offset="1" stop-color="#58e4ec"/></linearGradient></defs><path d="M43 17H29a15 15 0 0 0 0 30h14M43 17l-8 8M43 47l-8-8" fill="none" stroke="url(#creovex-gradient)" stroke-linecap="round" stroke-linejoin="round" stroke-width="5.5"/><circle cx="48" cy="32" r="2.8" fill="#8df6f0"/></svg></span>`;
}

function networkBadge(network, compact = false) {
  return `<span class="chain-badge chain-badge--${network.id}${compact ? " chain-badge--compact" : ""}" aria-label="${escapeHtml(network.name)}">${escapeHtml(network.mark)}</span>`;
}

function header() {
  const wallet = state.wallet;
  const activeChain = wallet?.family === "EVM" ? NETWORKS.find((network) => network.chainId === wallet.chainId) : null;
  const navItems = [
    ["/explore", "Explore"], ["/#networks", "Networks"], ["/docs", "Docs"], ["/fees", "Fees"]
  ];
  const activePath = location.pathname;
  return `<header class="site-header"><div class="nav-wrap page-width">
    <a href="/" class="wordmark" data-route aria-label="CREOVEX home">${logoMark("nav")}<span>CREOVEX</span></a>
    <button class="nav-toggle icon-button" data-action="mobile-nav" aria-label="${state.mobileNav ? "Close" : "Open"} navigation" aria-expanded="${state.mobileNav}">${icon(state.mobileNav ? "close" : "menu")}</button>
    <nav class="primary-nav${state.mobileNav ? " primary-nav--open" : ""}" aria-label="Primary navigation">
      ${navItems.map(([href, label]) => `<a data-route href="${href}" class="nav-link${(href === activePath || (href === "/explore" && activePath === "/explore")) ? " is-active" : ""}">${label}</a>`).join("")}
      <a data-route href="/launch" class="nav-link nav-link--launch">Launch a token <span>${icon("arrowUp")}</span></a>
    </nav>
    <div class="nav-actions"><div class="network-menu-wrap"><button class="network-trigger" data-action="toggle-network-menu" aria-expanded="${state.networkMenu}" aria-label="Network availability"><span class="status-dot"></span><span>Networks</span><b>05</b>${icon("chevron")}</button>${state.networkMenu ? networkMenu() : ""}</div>${wallet ? `<button class="wallet-connected" data-action="wallet-menu" aria-expanded="${state.showWalletPanel}" aria-label="Wallet ${escapeHtml(shortenAddress(wallet.address))}"><span class="online-dot"></span><span class="wallet-connected__name">${escapeHtml(wallet.name)}</span><span class="wallet-connected__address">${escapeHtml(shortenAddress(wallet.address))}</span></button>` : `<button class="button button--nav" data-action="open-wallet">${icon("wallet")}<span>Connect wallet</span></button>`}</div>
  </div></header>`;
}

function networkMenu() {
  return `<div class="network-menu" role="region" aria-label="Network status"><div class="network-menu__head"><span>NETWORK AVAILABILITY</span><b>05</b></div>${NETWORKS.map((network) => `<div class="network-menu__item">${networkBadge(network, true)}<span>${escapeHtml(network.name)}</span><b>Paused</b></div>`).join("")}<p>Launches stay paused until each deployment path is tested.</p><a href="/#networks" data-route>Review network details ${icon("arrow")}</a></div>`;
}

function footer() {
  return `<footer class="site-footer"><div class="page-width"><div class="footer-top"><a href="/" data-route class="wordmark">${logoMark("nav")}<span>CREOVEX</span></a><p>Launch Anything. Build Everywhere.</p><a href="/launch" data-route class="footer-cta">Create a token ${icon("arrow")}</a></div><div class="footer-bottom"><span>© 2026 CREOVEX</span><span class="footer-status"><i></i> Launches paused while deployment paths are reviewed</span><div class="footer-links"><a data-route href="/#networks">Networks</a><a data-route href="/docs">Docs</a><a data-route href="/docs">Support</a><a data-route href="/fees">Fees</a><a data-route href="/security">Security</a><a data-route href="/terms">Terms</a><a data-route href="/privacy">Privacy</a></div></div><p class="footer-disclaimer">CREOVEX is an independent project. Network names identify compatibility only; no network endorsement is implied.</p></div></footer>`;
}

function toast() {
  return state.toast ? `<div class="toast" role="status">${icon("check")}<span>${escapeHtml(state.toast)}</span></div>` : "";
}

function networkCard(network, index) {
  const check = state.networkChecks[network.id];
  let checkText = "Check RPC";
  if (check?.loading) checkText = "Checking…";
  else if (check?.result) checkText = check.result.matchesExpectedNetwork ? "RPC reachable" : "Network mismatch";
  else if (check?.error === "rpc_not_configured") checkText = "RPC not configured";
  else if (check?.error) checkText = "Check again";
  return `<article class="network-card network-card--${network.id} reveal" data-order="${index}">
    <div class="network-card__top">${networkBadge(network)}<span class="network-type">${network.environment}</span></div>
    <h3>${escapeHtml(network.name)}</h3><div class="network-chain">${network.family === "Solana" ? "Solana cluster" : `Chain ID ${network.chainLabel}`} <span>·</span> ${escapeHtml(network.family)}</div>
    <div class="network-card__specs"><span>Token standard</span><b>${escapeHtml(network.standard)}</b><span>Gas asset</span><b>${escapeHtml(network.nativeCurrency)}</b></div>
    <div class="network-card__bottom"><span class="paused-label"><i></i> Launching paused</span><a href="${network.explorer}" target="_blank" rel="noreferrer" class="explorer-link">Explorer ${icon("external")}</a></div>
    <button class="rpc-check" data-action="check-network" data-network="${network.id}" ${check?.loading ? "disabled" : ""}>${checkText} ${check?.loading ? "" : icon("arrowUp")}</button>
    ${check?.message ? `<p class="rpc-feedback${check.error || !check.result?.matchesExpectedNetwork ? " rpc-feedback--error" : ""}" role="status">${escapeHtml(check.message)}</p>` : ""}
  </article>`;
}

function homePage() {
  return `<main>
    <section class="hero page-width"><div class="hero-copy"><div class="eyebrow"><span class="eyebrow-line"></span> THE MULTICHAIN TOKEN STUDIO <span class="eyebrow-index">01 / 05</span></div>
      <h1>Your token.<br/><span>Your chain.</span><br/>Your launch.</h1>
      <p class="hero-lede">Create and launch digital tokens through a streamlined multichain experience, with every permission, cost, and confirmation in view.</p>
      <div class="hero-actions"><a class="button button--primary" data-route href="/launch">Launch a token ${icon("arrow")}</a><a class="button button--quiet" data-route href="/explore">Explore tokens ${icon("arrowUp")}</a></div>
      <div class="hero-footnote"><span><i class="status-dot"></i> Network checks on demand</span><span>Self-custody by design</span></div>
    </div><div class="hero-art" aria-label="CREOVEX portal mark, a static illustration with gentle motion"><div class="art-grid"></div><div class="art-orbit art-orbit--one"></div><div class="art-orbit art-orbit--two"></div><div class="art-aura"></div><div class="portal-shell"><div class="portal-core">${logoMark("hero")}</div><span class="portal-glint"></span></div><span class="orbit-node orbit-node--one"></span><span class="orbit-node orbit-node--two"></span><span class="art-label art-label--top">CREOVEX / 001</span><span class="art-label art-label--bottom">A clearer way to launch</span><div class="art-coordinates">42° 36′ 12″<br/>73° 45′ 10″</div></div>
      <div class="hero-scroll"><span>Scroll to explore</span><i></i></div></section>
    <section class="intro-strip"><div class="page-width intro-strip__inner"><span>BUILT FOR THE NEXT WAVE</span><p>One clear flow across the networks you choose.</p><span class="intro-strip__right">ETHEREUM · SOLANA · MULTICHAIN</span></div></section>
    <section class="section page-width" id="networks"><div class="section-heading"><div><p class="eyebrow">01 — NETWORKS</p><h2>Five chains.<br/><span>One considered flow.</span></h2></div><p>Network details are displayed for reference. Deployment is paused on every chain until its contract, wallet path, and release checks are ready.</p></div><div class="network-grid">${NETWORKS.map(networkCard).join("")}</div><div class="section-footnote">RPC checks are read-only and may use shared public endpoints. A healthy RPC does not mean token deployment is enabled.</div></section>
    <section class="section section--steps"><div class="page-width"><div class="section-heading section-heading--light"><div><p class="eyebrow">02 — THE FLOW</p><h2>Make the important<br/><span>parts easy to see.</span></h2></div><p>Every launch begins with clear information. The wallet stays yours; transactions require an explicit confirmation.</p></div><div class="steps-grid">${[
      ["01", "Connect your wallet", "Choose a supported wallet and connect only when you’re ready."],
      ["02", "Choose a network", "Review its chain, gas asset, token standard, and live RPC health."],
      ["03", "Configure your token", "Set the details and supply. Your draft stays in this browser."],
      ["04", "Review every cost", "See gas and any platform fee before opening a wallet prompt."],
      ["05", "Confirm and verify", "Deployment only completes after the chain confirms a real receipt."]
    ].map(([n, title, copy]) => `<article class="step-card"><span class="step-number">${n}</span><div class="step-line"></div><h3>${title}</h3><p>${copy}</p></article>`).join("")}</div></div></section>
    <section class="section page-width"><div class="section-heading"><div><p class="eyebrow">03 — THE FOUNDATION</p><h2>Everything you need.<br/><span>Nothing hidden.</span></h2></div><p>Trust comes from making the rules visible before a wallet is asked to approve anything.</p></div><div class="feature-grid">${[
      ["01", "Simple token creation", "A focused wizard for name, symbol, supply, and public details."],
      ["02", "Transparent costs", "Gas and platform fees shown separately. No configured platform fee means no collection."],
      ["03", "Self-custody wallets", "No seed phrases. No connection on page load. You approve each wallet action."],
      ["04", "Public token pages", "Read on-chain token data and link to the correct explorer when available."],
      ["05", "Clear permissions", "Fixed supply by default. No hidden mint, tax, blacklist, or upgrade controls."],
      ["06", "Real transaction status", "Pending, rejected, reverted, and confirmed are distinct states."]
    ].map(([n, title, copy]) => `<article class="feature-card"><span>${n} / CREOVEX</span><h3>${title}</h3><p>${copy}</p></article>`).join("")}</div></section>
    <section class="section section--activity"><div class="page-width"><div class="section-heading section-heading--light"><div><p class="eyebrow">04 — ON-CHAIN ACTIVITY</p><h2>Built on what’s<br/><span>actually there.</span></h2></div><p>Launch history will appear here only after a real chain indexer is configured.</p></div><div class="activity-empty"><div class="empty-orbit">${logoMark("empty")}</div><div><span class="empty-tag">INDEXER NOT CONFIGURED</span><h3>No launches to show yet.</h3><p>CREOVEX is not connected to a launch registry. We’ll never fill this space with sample transactions.</p><a data-route href="/activity" class="text-link">Activity details ${icon("arrow")}</a></div></div></div></section>
    <section class="section page-width risk-section"><div class="risk-mark">${icon("shield")}</div><div><p class="eyebrow">05 — SECURITY & TRANSPARENCY</p><h2>Creating a token<br/><span>is only the beginning.</span></h2><p class="risk-copy">A token deployment does not create liquidity, a market, or a safe investment. On-chain deployments can be irreversible. Review the contract, permissions, network, and wallet request before confirming anything.</p><div class="risk-links"><a data-route href="/security">Security practices ${icon("arrowUp")}</a><a data-route href="/fees">Fee schedule ${icon("arrowUp")}</a></div></div></section>
    <section class="closing-cta page-width"><div class="closing-portal">${logoMark("closing")}</div><p class="eyebrow">YOUR NEXT IDEA STARTS HERE</p><h2>Thoughtful launches<br/>start with clarity.</h2><a data-route href="/launch" class="button button--primary">Open the token studio ${icon("arrow")}</a><p class="closing-note">Draft and validation available · On-chain deployment paused</p></section>
  </main>`;
}

function pageHero(kicker, title, subtitle) {
  return `<section class="subhero page-width"><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${subtitle}</p></section>`;
}

function emptyDataPage(type) {
  const isActivity = type === "activity";
  return `<main>${pageHero(isActivity ? "ON-CHAIN RECORDS" : "TOKEN DIRECTORY", isActivity ? "Activity, with receipts." : "Explore tokens." , isActivity ? "Only confirmed on-chain deployments belong here. No indexer is configured yet." : "Browse real token deployments once a supported chain indexer is connected.")}
    <section class="page-width data-panel"><div class="data-panel__top"><span>${isActivity ? "RECENT ACTIVITY" : "TOKEN DIRECTORY"}</span><span class="unavailable-pill"><i></i> Indexer unavailable</span></div><div class="empty-state">${logoMark("empty")}<h2>No live records yet.</h2><p>This view will populate from verified chain data after the CREOVEX indexer is configured. No sample tokens, counts, or activity are shown.</p><a data-route href="/docs" class="text-link">Read about current setup ${icon("arrow")}</a></div></section></main>`;
}

function feesPage() {
  return `<main>${pageHero("COSTS BEFORE CONFIRMATION", "A fee schedule you can inspect.", "No platform fee has been finalized or configured. The app does not collect a fee when a wallet connects.")}
    <section class="page-width fee-layout"><article class="fee-card fee-card--main"><div class="fee-card__head"><div><span class="eyebrow">CURRENT STATUS</span><h2>No platform fee configured</h2></div><span class="unavailable-pill"><i></i> Not enabled</span></div><p>Paid deployment stays disabled until the fee policy, recipient, settlement contract, and failure behavior are agreed and tested.</p><div class="fee-line"><span>Platform fee</span><b>Not set</b></div><div class="fee-line"><span>Fee recipient</span><b>Not configured</b></div><div class="fee-line"><span>Optional service fee</span><b>None configured</b></div><div class="fee-line fee-line--total"><span>Gas estimate</span><b>Shown only for an implemented deployment</b></div></article><aside class="fee-note"><span class="note-icon">{ }</span><h3>Gas is not a platform fee.</h3><p>Network gas is paid to validators or network infrastructure. Any future CREOVEX fee must be shown separately with its recipient, asset, chain, and purpose.</p><a data-route href="/security" class="text-link">How we handle transactions ${icon("arrow")}</a></aside></section></main>`;
}

function docsPage() {
  return `<main>${pageHero("USER & DEVELOPER GUIDE", "A clear path from draft to deployment.", "This guide reflects the current build. Launches remain paused while deployment and verification paths are completed.")}
    <section class="page-width docs-grid"><article class="docs-card docs-card--wide"><span class="eyebrow">01 / CURRENT CAPABILITIES</span><h2>What works today</h2><ul><li>Connect an injected EVM wallet after an explicit click.</li><li>Save and validate token details locally in this browser.</li><li>Check an allowlisted chain RPC from the server.</li><li>Read basic ERC-20 values from an EVM token address when RPC is available.</li><li>Open the configured explorer for each network.</li></ul></article><article class="docs-card"><span class="eyebrow">02 / WALLET SAFETY</span><h2>Connect only when asked</h2><p>CREOVEX does not request wallet access on page load, ask for recovery phrases, or sign transactions in the background. Disconnecting here clears the app session; wallet permissions may still need to be revoked in the wallet.</p></article><article class="docs-card"><span class="eyebrow">03 / TOKEN SETTINGS</span><h2>Fixed supply by default</h2><p>The draft describes a fixed supply and 0–18 decimals. Minting, burning, ownership renunciation, and metadata uploads are unavailable until a real contract supports and documents them.</p></article><article class="docs-card"><span class="eyebrow">04 / NETWORK CONFIG</span><h2>Server-side RPC</h2><p>Use the <code>CREOVEX_RPC_*</code> environment variables. The server validates HTTPS URLs and never returns the RPC endpoint to the browser. Shared public endpoints can be rate-limited.</p></article><article class="docs-card docs-card--wide"><span class="eyebrow">05 / DEVELOPER RELEASE GATE</span><h2>No contract deployment in this build</h2><p>Before enabling a network, implement and test its separate token path, verify wallet chain handling, configure a maintained RPC service, finalize the fee and recipient, and verify successful receipts from chain data. EVM ERC-20 and Solana SPL token flows must stay separate.</p><a href="https://docs.robinhood.com/chain/deploy-smart-contracts/" class="text-link" target="_blank" rel="noreferrer">Robinhood Chain deployment documentation ${icon("external")}</a></article></section></main>`;
}

function securityPage() {
  return `<main>${pageHero("SECURITY & RISK", "Trust is a set of visible choices.", "CREOVEX is being built to make the transaction, permissions, and operational state clear before a wallet prompt appears.")}
    <section class="page-width security-list">${[
      ["01", "A wallet connection is not a transaction", "Connecting exposes the selected public address to the page. It does not authorize token deployment or move funds. A transaction should only be requested after a clear review action."],
      ["02", "Token deployment can be irreversible", "Contract code and token settings may be difficult or impossible to change after deployment. Review the address, supply, permissions, and selected chain."],
      ["03", "A token is not liquidity", "Creating a token does not create a market, trading pair, liquidity, or demand. Separate liquidity actions carry separate costs and risks."],
      ["04", "Verification is not a safety guarantee", "Explorer source verification helps compare source code with deployed bytecode. It does not prove that a project, token, or investment is safe."],
      ["05", "No hidden fee or authority", "No platform fee is configured, and no deployment template is active. Mint, burn, tax, blacklist, or upgrade permissions will not be presented as available unless implemented on-chain."],
      ["06", "Network data can fail", "RPC providers can be stale, rate-limited, or unavailable. Always confirm a chain, contract, transaction, and receipt in the selected network's explorer."]
    ].map(([n, title, copy]) => `<article class="security-row"><span>${n}</span><div><h2>${title}</h2><p>${copy}</p></div>${icon("arrowUp")}</article>`).join("")}</section></main>`;
}

function legalPage(type) {
  const terms = type === "terms";
  return `<main>${pageHero(terms ? "SERVICE TERMS · DRAFT" : "PRIVACY · DRAFT", terms ? "Terms & conditions." : "Privacy, with restraint.", "These pages are draft product disclosures and require legal review before a public launch.")}
    <section class="page-width legal-copy"><div class="legal-callout"><span>PRE-LAUNCH DRAFT</span><p>This page is a product-content placeholder, not legal advice or a final legal agreement. Jurisdiction-specific review and approved business details are still required.</p></div>
      ${terms ? `<h2>Using the CREOVEX interface</h2><p>CREOVEX is a software interface for configuring token drafts and, in a future release, initiating user-approved blockchain transactions. Features marked unavailable are not offered by this build.</p><h2>Wallets and networks</h2><p>Wallet software, RPC services, block explorers, and public blockchain networks are provided by third parties. You control your wallet and must review each network and transaction request.</p><h2>Token and network risks</h2><p>Token creation is not investment advice, liquidity provision, legal approval, or a guarantee of safety. Blockchain transactions may be irreversible. You are responsible for your token design and applicable obligations.</p><h2>Service availability</h2><p>Network data can be delayed or unavailable. Do not rely on a status badge alone; verify important details with the network explorer.</p>` : `<h2>Data handled in this build</h2><p>Wallet connection is optional and user-initiated. The connected public address is held in the current page session. Token draft fields are stored in this browser's local storage. Logo files are not uploaded.</p><h2>Network requests</h2><p>When you request an RPC check or token read, the server sends a read-only request to the selected network's RPC provider. The provider may process your request according to its own terms.</p><h2>No account database</h2><p>This build has no user accounts, analytics tracker, launch indexer, metadata upload, or database configured. Server logs may contain standard request metadata depending on the hosting environment.</p><h2>Your choices</h2><p>You can disconnect the wallet from this interface, clear the local token draft in the launch wizard, or remove browser data through your browser settings. Wallet-side permissions are controlled by your wallet.</p>`}
    </section></main>`;
}

function networkByRouteChain(chainId) {
  return NETWORKS.find((network) => String(network.chainId) === String(chainId) || network.id === String(chainId)) || null;
}

function tokenPage(chainId, address) {
  const network = networkByRouteChain(chainId);
  const solanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(address || ""));
  const isSolana = network?.family === "Solana" && solanaAddress;
  const valid = network && network.family === "EVM" && isValidAddress(address);
  const key = valid ? `${network.id}:${address.toLowerCase()}` : "";
  const item = key ? state.tokenReads[key] : null;
  const loading = item?.loading;
  const data = item?.data;
  const error = item?.error;
  const solanaExplorer = isSolana ? `https://explorer.solana.com/address/${encodeURIComponent(address)}?cluster=mainnet-beta` : "#";
  const body = isSolana ? `<div class="empty-state"><span class="unavailable-pill"><i></i> SPL reader not configured</span><h2>Solana token data is unavailable here.</h2><p>This build does not yet include a Solana SPL token reader or Metaplex metadata integration. No token details are inferred.</p><a class="button button--quiet" href="${solanaExplorer}" target="_blank" rel="noreferrer">Open Solana Explorer ${icon("external")}</a></div>` : !valid ? `<div class="empty-state"><h2>Token details unavailable.</h2><p>Use a valid EVM chain ID and contract address, or a Solana token address.</p></div>` : loading ? `<div class="detail-loading"><span class="skeleton skeleton--long"></span><span class="skeleton"></span><span class="skeleton"></span><p>Reading token details from ${escapeHtml(network.name)}…</p></div>` : data ? `<div class="token-detail-grid"><div class="token-detail-primary"><span class="token-network-label">${networkBadge(network, true)} ${escapeHtml(network.name)}</span><h2>${escapeHtml(data.name || "Name unavailable")} <em>${escapeHtml(data.symbol || "—")}</em></h2><p class="token-address">${escapeHtml(data.address)}</p><button data-action="copy" data-copy="${escapeHtml(data.address)}" class="text-link">${icon("copy")} Copy contract address</button></div><div class="token-stat"><span>Decimals</span><b>${data.decimals ?? "Unavailable"}</b></div><div class="token-stat"><span>Total supply</span><b>${escapeHtml(data.totalSupply || "Unavailable")}</b></div><div class="token-stat"><span>Deployer</span><b>Unavailable without an indexer</b></div><div class="token-stat"><span>Source verification</span><b>Not checked</b></div><div class="token-detail-note">Explorer data is the source of truth. Contract verification does not guarantee token safety.</div><a class="button button--quiet" href="${escapeHtml(data.explorer)}" target="_blank" rel="noreferrer">Open explorer ${icon("external")}</a></div>` : `<div class="empty-state"><span class="unavailable-pill"><i></i> ${error ? "Read unavailable" : "Read not started"}</span><h2>${error ? escapeHtml(error) : "Read from the chain."}</h2><p>${error ? "The selected RPC may be unavailable, or this address may not expose standard ERC-20 data." : "Token name, symbol, decimals, and supply are fetched from the selected chain. No launch or indexer data is fabricated."}</p><button data-action="read-token" data-network="${network.id}" data-address="${escapeHtml(address)}" class="button button--primary">Read token on-chain ${icon("arrow")}</button></div>`;
  return `<main>${pageHero("ON-CHAIN TOKEN DETAILS", valid ? `Token on ${escapeHtml(network.name)}.` : "Token details.", "Data is read from the selected chain when an RPC endpoint responds.")}
    <section class="page-width data-panel token-panel"><div class="data-panel__top"><span>CONTRACT <code>${escapeHtml(address)}</code></span><a href="${network?.explorer || "#"}" target="_blank" rel="noreferrer" class="explorer-link">Network explorer ${icon("external")}</a></div>${body}</section></main>`;
}

function launchStepNetwork() {
  return `<div class="wizard-panel"><div class="wizard-panel__eyebrow">STEP 01 / NETWORK</div><h2>Choose where to build.</h2><p class="wizard-lede">Network selection is locked until a chain-specific deployment path has passed its release checks.</p><div class="launch-networks">${NETWORKS.map((network) => `<article class="launch-network ${state.draft.networkId === network.id ? "is-selected" : ""}"><div>${networkBadge(network)}<div><b>${escapeHtml(network.name)}</b><span>${escapeHtml(network.environment)} · ${network.chainId ?? network.chainLabel}</span></div></div><span class="launch-network__state">Launches paused</span></article>`).join("")}</div><div class="inline-note inline-note--violet">${icon("shield")} <span>Preview mode keeps the chain unselected. You can complete and save a token draft without starting a transaction.</span></div><div class="wizard-actions"><span></span><button class="button button--primary" data-action="next-step">Continue in draft mode ${icon("arrow")}</button></div></div>`;
}

function tokenInput(label, key, placeholder, error, options = {}) {
  const value = escapeHtml(state.draft[key] || "");
  const kind = options.type || "text";
  return `<label class="field ${options.wide ? "field--wide" : ""}"><span>${label}${options.optional ? " <i>Optional</i>" : ""}</span><input data-draft-key="${key}" name="${key}" type="${kind}" value="${value}" placeholder="${placeholder}" ${options.max ? `maxlength="${options.max}"` : ""} autocomplete="${options.autocomplete || "off"}" ${options.inputmode ? `inputmode="${options.inputmode}"` : ""}/>${error ? `<small class="field-error">${escapeHtml(error)}</small>` : ""}</label>`;
}

function launchStepInformation() {
  const errors = validateTokenDraft(state.draft);
  return `<div class="wizard-panel"><div class="wizard-panel__eyebrow">STEP 02 / TOKEN INFORMATION</div><h2>Give it a name.</h2><p class="wizard-lede">These details are saved as a local draft. Metadata uploads and publishing are not configured.</p><div class="token-editor"><div class="logo-upload"><div class="logo-preview">${state.logoUrl ? `<img src="${state.logoUrl}" alt="Token logo preview"/>` : `<span>CV</span>`}</div><label class="upload-control">Choose logo<input type="file" data-action="logo-file" accept="image/png,image/jpeg,image/webp,image/svg+xml"/><span>PNG, JPG, WEBP or SVG · up to 2 MB</span></label></div><div class="form-grid">${tokenInput("Token name", "name", "e.g. Aurora", errors.name, { max: 40 })}${tokenInput("Token symbol", "symbol", "e.g. AURA", errors.symbol, { max: 12 })}${tokenInput("Website", "website", "https://", errors.website, { type: "url", optional: true })}${tokenInput("X / social link", "socialX", "https://x.com/…", errors.socialX, { type: "url", optional: true })}${tokenInput("Telegram", "socialTelegram", "https://t.me/…", errors.socialTelegram, { type: "url", optional: true })}${tokenInput("Metadata URI", "metadataURI", "https://…", errors.metadataURI, { type: "url", optional: true })}${tokenInput("Description", "description", "What should people know?", errors.description, { wide: true, max: 500 })}</div><p class="upload-disclaimer">Logo stays in this browser session. A storage service is not configured.</p></div><div class="wizard-actions"><button class="button button--quiet" data-action="prev-step">${icon("arrow")} Back</button><button class="button button--primary" data-action="next-step">Continue ${icon("arrow")}</button></div></div>`;
}

function launchStepSupply() {
  const errors = validateTokenDraft(state.draft);
  return `<div class="wizard-panel"><div class="wizard-panel__eyebrow">STEP 03 / TOKENOMICS</div><h2>Set a fixed supply.</h2><p class="wizard-lede">The current draft supports only a fixed-supply description. The on-chain contract is not yet configured.</p><div class="form-grid form-grid--compact">${tokenInput("Initial total supply", "supply", "1000000", errors.supply, { inputmode: "decimal" })}${tokenInput("Decimals", "decimals", "18", errors.decimals, { inputmode: "numeric" })}<div class="field field--wide"><span>Supply model</span><div class="choice-card"><span class="choice-icon">${icon("check")}</span><div><b>Fixed supply</b><p>No mint or burn controls are enabled in this draft.</p></div><span class="choice-badge">DEFAULT</span></div></div></div><div class="inline-note">${icon("shield")} <span>Minting, burning, and renouncing ownership are unavailable until their exact contract behavior is implemented and tested.</span></div><div class="wizard-actions"><button class="button button--quiet" data-action="prev-step">${icon("arrow")} Back</button><button class="button button--primary" data-action="next-step">Continue ${icon("arrow")}</button></div></div>`;
}

function launchStepAdvanced() {
  return `<div class="wizard-panel"><div class="wizard-panel__eyebrow">STEP 04 / CONTRACT SETTINGS</div><h2>Know the rules.</h2><p class="wizard-lede">No contract template or version is currently active for deployment.</p><div class="advanced-list"><div><span>Contract template</span><b>Not configured</b></div><div><span>Upgradeability</span><b>Not configured</b></div><div><span>Owner permissions</span><b>Not configured</b></div><div><span>Metadata authority</span><b>Not configured</b></div><div><span>Token standard</span><b>Depends on an enabled network</b></div></div><div class="inline-note inline-note--amber">${icon("shield")} <span>Deployment must remain disabled until the complete contract source, compiler settings, permissions, and verified test results are published.</span></div><div class="wizard-actions"><button class="button button--quiet" data-action="prev-step">${icon("arrow")} Back</button><button class="button button--primary" data-action="next-step">Review costs ${icon("arrow")}</button></div></div>`;
}

function feeReview() {
  return `<div class="cost-card"><div class="cost-card__header"><span>ESTIMATED DEPLOYMENT COST</span><span class="unavailable-pill"><i></i> Unavailable</span></div><div class="cost-line"><span>Network gas</span><b>Not estimated</b></div><div class="cost-line"><span>Platform fee</span><b>Not configured</b></div><div class="cost-line"><span>Optional service fee</span><b>None</b></div><div class="cost-line cost-line--total"><span>Total estimate</span><b>Unavailable</b></div><p>Gas estimates can change before a wallet confirms a transaction. No fee recipient or deployment contract is configured.</p></div>`;
}

function launchStepCost() {
  return `<div class="wizard-panel"><div class="wizard-panel__eyebrow">STEP 05 / COST REVIEW</div><h2>See every cost before signing.</h2><p class="wizard-lede">Cost estimates are only available when a tested deployment transaction can be constructed on a configured chain.</p>${feeReview()}<div class="wizard-actions"><button class="button button--quiet" data-action="prev-step">${icon("arrow")} Back</button><button class="button button--primary" data-action="next-step">Review launch details ${icon("arrow")}</button></div></div>`;
}

function launchStepConfirm() {
  const errors = validateTokenDraft(state.draft);
  const valid = Object.keys(errors).length === 0;
  const network = NETWORK_BY_ID[state.draft.networkId];
  return `<div class="wizard-panel"><div class="wizard-panel__eyebrow">STEP 06 / FINAL REVIEW</div><h2>One last look.</h2><p class="wizard-lede">Review the draft details below. The final wallet confirmation is disabled until an audited deployment path and fee configuration are available.</p><div class="review-card"><div class="review-card__identity"><div class="review-token-avatar">${escapeHtml((state.draft.symbol || "CV").slice(0, 2).toUpperCase())}</div><div><span>TOKEN DRAFT</span><h3>${escapeHtml(state.draft.name || "Untitled token")} <em>${escapeHtml(state.draft.symbol || "—")}</em></h3></div></div><div class="review-lines"><div><span>Network</span><b>${network ? escapeHtml(network.name) : "Not selected"}</b></div><div><span>Supply</span><b>${escapeHtml(state.draft.supply || "—")} ${escapeHtml(state.draft.symbol || "")}</b></div><div><span>Decimals</span><b>${escapeHtml(state.draft.decimals || "—")}</b></div><div><span>Supply model</span><b>Fixed (draft setting)</b></div><div><span>Contract</span><b>Not configured</b></div></div></div>${feeReview()}<label class="confirm-check"><input type="checkbox" data-confirm/> <span>I understand this is a saved draft and no token has been deployed.</span></label><div class="wizard-actions"><button class="button button--quiet" data-action="prev-step">${icon("arrow")} Back</button><button class="button button--disabled" disabled aria-disabled="true">Deployment unavailable</button></div>${!valid ? `<p class="confirm-error">Add a valid token name, symbol, supply, decimals, and URLs to save a complete draft.</p>` : ""}</div>`;
}

function launchSidebar() {
  const labels = ["Network", "Token info", "Tokenomics", "Advanced", "Costs", "Review"];
  const completed = state.step > 0;
  return `<aside class="wizard-aside"><div class="aside-mark">${logoMark("aside")}</div><span class="eyebrow">TOKEN STUDIO</span><h2>Build with<br/>intention.</h2><p>Your details are saved only in this browser. Nothing is sent to a chain from this draft.</p><ol class="wizard-progress">${labels.map((label, index) => `<li class="${index === state.step ? "is-current" : index < state.step && completed ? "is-done" : ""}"><span>${index < state.step && completed ? icon("check") : `0${index + 1}`}</span><b>${label}</b></li>`).join("")}</ol><button class="draft-clear" data-action="clear-draft">Clear local draft</button><div class="aside-safe">${icon("shield")}<span>Self-custody<br/><b>No action without approval</b></span></div></aside>`;
}

function launchPage() {
  const steps = [launchStepNetwork, launchStepInformation, launchStepSupply, launchStepAdvanced, launchStepCost, launchStepConfirm];
  return `<main>${pageHero("CREOVEX TOKEN STUDIO", "Create your token draft.", "Configure the details and review the release gates. Deployment is disabled until a tested on-chain path is available.")}
    <section class="page-width wizard-layout">${launchSidebar()}<div class="wizard-main">${steps[state.step]()}</div></section></main>`;
}

function walletModal() {
  if (!state.modal) return "";
  const providers = detectEvmProviders();
  const hasSolana = Boolean(window.phantom?.solana?.connect || window.solana?.connect);
  const walletChoices = [
    { id: "metamask", name: "MetaMask", note: providers.metamask ? "Detected in this browser" : "Install or open the extension", available: Boolean(providers.metamask), mark: "M" },
    { id: "coinbase", name: "Coinbase Wallet", note: providers.coinbase ? "Detected in this browser" : "Browser extension not detected", available: Boolean(providers.coinbase), mark: "C" },
    { id: "phantom", name: "Phantom · EVM", note: providers.phantom ? "EVM provider detected" : "EVM provider not detected", available: Boolean(providers.phantom), mark: "P" },
    { id: "robinhood", name: "Robinhood Wallet", note: providers.robinhood ? "EVM provider detected" : "Open its supported wallet browser", available: Boolean(providers.robinhood), mark: "R" },
    { id: "injected", name: "Other EVM wallet", note: window.ethereum ? "Injected provider detected" : "No injected EVM provider found", available: Boolean(providers.injected), mark: "◇" }
  ];
  return `<div class="modal-backdrop" data-action="close-modal"><section class="wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title" tabindex="-1"><button class="icon-button modal-close" data-action="close-modal" aria-label="Close wallet dialog">${icon("close")}</button><div class="modal-logo">${logoMark("modal")}</div><p class="eyebrow">SELF-CUSTODY CONNECTION</p><h2 id="wallet-modal-title">Connect a wallet.</h2><p class="modal-intro">Choose a wallet to request access. CREOVEX never asks for a recovery phrase.</p>${state.walletError ? `<div class="wallet-error" role="alert">${icon("shield")}<span>${escapeHtml(state.walletError)}</span></div>` : ""}<div class="wallet-list">${walletChoices.map((wallet) => `<button class="wallet-option" data-action="connect-wallet" data-wallet="${wallet.id}" ${!wallet.available || state.walletPending ? "disabled" : ""}><span class="wallet-option__mark wallet-option__mark--${wallet.id}">${wallet.mark}</span><span class="wallet-option__copy"><b>${wallet.name}</b><small>${wallet.note}</small></span>${state.walletPending && state.walletPending === wallet.id ? `<span class="mini-spinner"></span>` : icon("arrowUp", "wallet-option__arrow")}</button>`).join("")}</div><div class="wallet-divider"><span>Solana wallet</span></div><button class="wallet-option wallet-option--solana" data-action="connect-solana" ${!hasSolana || state.walletPending ? "disabled" : ""}><span class="wallet-option__mark wallet-option__mark--phantom">P</span><span class="wallet-option__copy"><b>Phantom · Solana</b><small>${hasSolana ? "Solana provider detected" : "Phantom Solana provider not detected"}</small></span>${icon("arrowUp", "wallet-option__arrow")}</button><button class="walletconnect-disabled" disabled>WalletConnect <span>Not configured</span></button><p class="modal-footnote">Wallet support depends on your browser, extension, and selected network. Closing this dialog does not disconnect an existing wallet.</p></section></div>`;
}

function walletPanel() {
  if (!state.wallet || !state.showWalletPanel) return "";
  const active = state.wallet.family === "EVM" ? NETWORKS.find((network) => network.chainId === state.wallet.chainId) : null;
  const networkText = state.wallet.family === "Solana" ? "Solana wallet · cluster unverified" : active ? `${active.name} · ${active.environment}` : `Unsupported chain · ${state.wallet.chainId ?? "unknown"}`;
  return `<div class="wallet-panel"><div class="wallet-panel__head"><span class="online-dot"></span><div><b>${escapeHtml(state.wallet.name)}</b><small>Connected to this page</small></div><button class="icon-button" data-action="close-wallet-panel" aria-label="Close account panel">${icon("close")}</button></div><div class="wallet-panel__address"><span>PUBLIC ADDRESS</span><b>${escapeHtml(state.wallet.address)}</b><button data-action="copy" data-copy="${escapeHtml(state.wallet.address)}" aria-label="Copy address">${icon("copy")}</button></div><div class="wallet-panel__network"><span>ACTIVE NETWORK</span><b>${escapeHtml(networkText)}</b></div><button class="disconnect-button" data-action="disconnect-wallet">Disconnect from CREOVEX</button><small>Disconnecting here clears the app session. Your wallet may retain this site's permission.</small></div>`;
}

function currentPage() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return homePage();
  if (path === "/launch") return launchPage();
  if (path === "/explore") return emptyDataPage("explore");
  if (path === "/activity") return emptyDataPage("activity");
  if (path === "/docs") return docsPage();
  if (path === "/fees") return feesPage();
  if (path === "/security") return securityPage();
  if (path === "/terms") return legalPage("terms");
  if (path === "/privacy") return legalPage("privacy");
  const match = path.match(/^\/token\/([^/]+)\/([^/]+)$/);
  if (match) return tokenPage(decodeURIComponent(match[1]), decodeURIComponent(match[2]));
  return `<main>${pageHero("NOT FOUND", "This path is still uncharted.", "The page may have moved. Explore networks or return to the CREOVEX home page.")}<div class="page-width not-found"><a data-route href="/" class="button button--primary">Back home ${icon("arrow")}</a></div></main>`;
}

function render() {
  app.innerHTML = `${header()}${currentPage()}${footer()}${walletPanel()}${walletModal()}${toast()}`;
  if (state.modal) app.querySelector(".wallet-modal")?.focus();
  observeReveals();
}

function observeReveals() {
  const items = document.querySelectorAll(".reveal:not(.is-visible)");
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach((item) => observer.observe(item));
}

function showToast(message) {
  state.toast = message;
  clearTimeout(state.toastTimer);
  render();
  state.toastTimer = setTimeout(() => { state.toast = ""; render(); }, 2600);
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state.draft));
    localStorage.setItem(DRAFT_STEP_KEY, String(state.step));
  } catch { /* Storage may be disabled. */ }
}

function detectEvmProviders() {
  const providers = [];
  if (Array.isArray(window.ethereum?.providers)) providers.push(...window.ethereum.providers);
  else if (window.ethereum) providers.push(window.ethereum);
  if (window.phantom?.ethereum && !providers.includes(window.phantom.ethereum)) providers.push(window.phantom.ethereum);
  const find = (predicate) => providers.find((provider) => predicate(provider)) || null;
  return {
    metamask: find((provider) => provider.isMetaMask && !provider.isCoinbaseWallet && !provider.isPhantom),
    coinbase: find((provider) => provider.isCoinbaseWallet),
    phantom: find((provider) => provider.isPhantom) || window.phantom?.ethereum || null,
    robinhood: find((provider) => provider.isRobinhood || provider.isRobinhoodWallet),
    injected: providers[0] || null
  };
}

function removeWalletListeners() {
  const wallet = state.wallet;
  if (!wallet?.provider || !wallet.handlers) return;
  const remove = wallet.provider.removeListener?.bind(wallet.provider) || wallet.provider.off?.bind(wallet.provider);
  if (!remove) return;
  if (wallet.family === "EVM") {
    remove("accountsChanged", wallet.handlers.accountsChanged);
    remove("chainChanged", wallet.handlers.chainChanged);
  } else {
    remove("accountChanged", wallet.handlers.accountChanged);
  }
  remove("disconnect", wallet.handlers.disconnect);
}

function parseChainId(chainId) {
  if (typeof chainId === "number") return chainId;
  if (typeof chainId === "string" && /^0x[\da-f]+$/i.test(chainId)) return Number.parseInt(chainId, 16);
  const number = Number(chainId);
  return Number.isFinite(number) ? number : null;
}

function withTimeout(promise, milliseconds = 45_000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("Wallet request timed out.");
      error.code = "ETIMEDOUT";
      reject(error);
    }, milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function connectEvmWallet(id) {
  const providers = detectEvmProviders();
  const provider = providers[id];
  if (!provider) return;
  state.walletPending = id;
  state.walletError = "";
  render();
  try {
    const accounts = await withTimeout(provider.request({ method: "eth_requestAccounts" }));
    if (!Array.isArray(accounts) || !accounts[0]) throw new Error("The wallet did not return an account.");
    const chain = await withTimeout(provider.request({ method: "eth_chainId" }));
    const wallet = { family: "EVM", address: accounts[0], chainId: parseChainId(chain), name: ({ metamask: "MetaMask", coinbase: "Coinbase Wallet", phantom: "Phantom", robinhood: "Robinhood Wallet", injected: "Browser wallet" })[id], provider };
    const handlers = {
      accountsChanged: (next) => {
        if (!Array.isArray(next) || !next[0]) { removeWalletListeners(); state.wallet = null; state.showWalletPanel = false; }
        else state.wallet.address = next[0];
        render();
      },
      chainChanged: (next) => { if (state.wallet) state.wallet.chainId = parseChainId(next); render(); },
      disconnect: () => { state.wallet = null; state.showWalletPanel = false; render(); }
    };
    wallet.handlers = handlers;
    provider.on?.("accountsChanged", handlers.accountsChanged);
    provider.on?.("chainChanged", handlers.chainChanged);
    provider.on?.("disconnect", handlers.disconnect);
    state.wallet = wallet;
    state.modal = false;
    state.walletPending = false;
    showToast("Wallet connected to this page.");
  } catch (error) {
    state.walletPending = false;
    state.walletError = error?.code === 4001 ? "Connection was rejected in your wallet. You can try again when ready." : error?.code === "ETIMEDOUT" ? "The wallet did not respond in time. Check the wallet and reconnect." : "Could not connect. Check the wallet extension and try again.";
    render();
  }
}

async function connectSolana() {
  const provider = window.phantom?.solana || window.solana;
  if (!provider?.connect) return;
  state.walletPending = "solana";
  state.walletError = "";
  render();
  try {
    const result = await withTimeout(provider.connect());
    const address = result?.publicKey?.toString?.() || provider.publicKey?.toString?.();
    if (!address) throw new Error("Public key unavailable");
    const handlers = {
      accountChanged: (next) => {
        const nextAddress = next?.toString?.();
        if (!nextAddress) { removeWalletListeners(); state.wallet = null; }
        else state.wallet.address = nextAddress;
        render();
      },
      disconnect: () => { state.wallet = null; state.showWalletPanel = false; render(); }
    };
    state.wallet = { family: "Solana", address, name: "Phantom", provider, handlers };
    provider.on?.("accountChanged", handlers.accountChanged);
    provider.on?.("disconnect", handlers.disconnect);
    state.modal = false;
    state.walletPending = false;
    showToast("Solana wallet connected to this page.");
  } catch (error) {
    state.walletPending = false;
    state.walletError = error?.code === 4001 ? "Connection was rejected in your wallet. You can try again when ready." : error?.code === "ETIMEDOUT" ? "Phantom did not respond in time. Check the wallet and reconnect." : "Could not connect to Phantom. Check the wallet and try again.";
    render();
  }
}

async function checkNetwork(networkId) {
  state.networkChecks[networkId] = { loading: true };
  render();
  try {
    const response = await fetch("/api/network-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ networkId }) });
    const result = await response.json();
    if (!response.ok) state.networkChecks[networkId] = { error: result.error, message: result.message || "Could not check this network." };
    else state.networkChecks[networkId] = { result, message: result.message };
  } catch {
    state.networkChecks[networkId] = { error: "request_failed", message: "Could not reach the CREOVEX read service. Try again later." };
  }
  render();
}

async function readToken(networkId, address) {
  const key = `${networkId}:${address.toLowerCase()}`;
  state.tokenReads[key] = { loading: true };
  render();
  try {
    const response = await fetch(`/api/token?network=${encodeURIComponent(networkId)}&address=${encodeURIComponent(address)}`);
    const data = await response.json();
    state.tokenReads[key] = response.ok ? { data } : { error: data.message || "Token data could not be read." };
  } catch {
    state.tokenReads[key] = { error: "Could not reach the CREOVEX read service. Try again later." };
  }
  render();
}

function updateDraft(target) {
  const key = target.dataset.draftKey;
  if (!key) return;
  state.draft[key] = target.value;
  saveDraft();
  const preview = document.querySelector(`[data-preview="${key}"]`);
  if (preview) preview.textContent = target.value || "—";
}

function routeTo(href) {
  const url = new URL(href, location.href);
  if (url.origin !== location.origin) return;
  history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  state.mobileNav = false;
  state.networkMenu = false;
  render();
  if (url.hash) document.querySelector(url.hash)?.scrollIntoView({ behavior: "smooth" });
  else window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

document.addEventListener("click", async (event) => {
  const anchor = event.target.closest("a[data-route]");
  if (anchor && !event.metaKey && !event.ctrlKey && !event.shiftKey && anchor.target !== "_blank") {
    event.preventDefault(); routeTo(anchor.href); return;
  }
  const action = event.target.closest("[data-action]");
  if (!action) {
    if (event.target.classList?.contains("modal-backdrop")) { state.modal = false; state.walletError = ""; render(); }
    return;
  }
  switch (action.dataset.action) {
    case "open-wallet": state.modal = true; state.walletError = ""; render(); break;
    case "close-modal": if (event.target === action || action.classList.contains("modal-close")) closeWalletModal(); break;
    case "mobile-nav": state.mobileNav = !state.mobileNav; render(); break;
    case "toggle-network-menu": state.networkMenu = !state.networkMenu; render(); break;
    case "wallet-menu": state.showWalletPanel = !state.showWalletPanel; render(); break;
    case "close-wallet-panel": state.showWalletPanel = false; render(); break;
    case "disconnect-wallet": removeWalletListeners(); state.wallet = null; state.showWalletPanel = false; render(); showToast("Disconnected from CREOVEX."); break;
    case "connect-wallet": await connectEvmWallet(action.dataset.wallet); break;
    case "connect-solana": await connectSolana(); break;
    case "check-network": await checkNetwork(action.dataset.network); break;
    case "read-token": await readToken(action.dataset.network, action.dataset.address); break;
    case "next-step": {
      if (state.step === 1 || state.step === 2) {
        const errors = validateTokenDraft(state.draft);
        const stepKeys = state.step === 1 ? ["name", "symbol", "description", "website", "socialX", "socialTelegram", "metadataURI"] : ["supply", "decimals"];
        const invalid = stepKeys.some((key) => errors[key]);
        if (invalid) { render(); app.querySelector(".field-error")?.scrollIntoView({ block: "center", behavior: "smooth" }); break; }
      }
      if (state.step < STEP_COUNT - 1) state.step++;
      saveDraft(); render(); break;
    }
    case "prev-step": if (state.step > 0) state.step--; saveDraft(); render(); break;
    case "clear-draft": if (window.confirm("Clear the saved CREOVEX token draft from this browser?")) { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(DRAFT_STEP_KEY); state.draft = loadDraft(); state.step = 0; state.logoUrl = ""; render(); showToast("Local draft cleared."); } break;
    case "copy": try { await navigator.clipboard.writeText(action.dataset.copy || ""); showToast("Copied to clipboard."); } catch { showToast("Clipboard access is unavailable in this browser."); } break;
    default: break;
  }
});

document.addEventListener("input", (event) => updateDraft(event.target));
document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches("[data-draft-key]")) updateDraft(target);
  if (target.matches("[data-action='logo-file']")) {
    const file = target.files?.[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type) || file.size > 2 * 1024 * 1024) {
      showToast("Choose a PNG, JPG, WEBP, or SVG image under 2 MB.");
      target.value = "";
      return;
    }
    if (state.logoUrl) URL.revokeObjectURL(state.logoUrl);
    state.logoUrl = URL.createObjectURL(file);
    render();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.modal) { closeWalletModal(); }
  if (event.key === "Escape" && state.mobileNav) { state.mobileNav = false; render(); }
  if (event.key === "Escape" && state.networkMenu) { state.networkMenu = false; render(); }
  if (event.key === "Tab" && state.modal) {
    const modal = document.querySelector(".wallet-modal");
    const focusable = [...(modal?.querySelectorAll("button:not(:disabled),a[href],input:not(:disabled),[tabindex]:not([tabindex='-1'])") || [])];
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

function closeWalletModal() {
  state.modal = false;
  state.walletError = "";
  render();
  document.querySelector("[data-action='open-wallet'], [data-action='wallet-menu']")?.focus();
}

window.addEventListener("popstate", () => { state.mobileNav = false; render(); });

function loadCurrentToken() {
  const match = location.pathname.match(/^\/token\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return;
  const network = networkByRouteChain(decodeURIComponent(match[1]));
  const address = decodeURIComponent(match[2]);
  if (!network || network.family !== "EVM" || !isValidAddress(address)) return;
  const key = `${network.id}:${address.toLowerCase()}`;
  if (!state.tokenReads[key]) readToken(network.id, address);
}

render();
loadCurrentToken();
