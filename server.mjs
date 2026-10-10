import { createServer as createHttpServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NETWORK_BY_ID } from "./src/config.js";
import { decodeAbiString, decodeAbiUint, formatUnits, isValidAddress } from "./src/core.js";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(projectRoot, "dist");
const webRoot = existsSync(path.join(distRoot, "index.html")) ? distRoot : projectRoot;
const SOLANA_MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const publicRpcDefaults = {
  robinhood: "https://rpc.mainnet.chain.robinhood.com",
  base: "https://mainnet.base.org",
  bnb: "https://bsc-dataseed.bnbchain.org",
  solana: "https://api.mainnet.solana.com"
};
const rateWindows = new Map();

export function validateTokenRead(networkId, address) {
  const network = NETWORK_BY_ID[networkId || ""];
  if (!network || network.family !== "EVM") return { ok: false, error: "unsupported_network" };
  if (!isValidAddress(address)) return { ok: false, error: "invalid_address" };
  return { ok: true, network, address: String(address).trim() };
}

export function matchesConfiguredNetwork(networkId, chainValue) {
  const network = NETWORK_BY_ID[networkId || ""];
  if (!network) return false;
  if (network.family === "Solana") return chainValue === SOLANA_MAINNET_GENESIS;
  return Number.parseInt(String(chainValue), 16) === network.chainId;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp"
};

function rpcUrl(networkId) {
  const envName = `CREOVEX_RPC_${networkId.toUpperCase()}`;
  const candidate = process.env[envName] || publicRpcDefaults[networkId] || "";
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(value));
}

function limited(request) {
  const now = Date.now();
  if (rateWindows.size > 2000) {
    for (const [key, window] of rateWindows) if (now - window.started > 60_000) rateWindows.delete(key);
  }
  const key = request.socket.remoteAddress || "unknown";
  const current = rateWindows.get(key);
  if (!current || now - current.started > 60_000) {
    rateWindows.set(key, { started: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > 40;
}

async function rpcCall(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw new Error("RPC request failed");
  const body = await response.json();
  if (body.error || body.result === undefined) throw new Error("RPC response was unavailable");
  return body.result;
}

async function handleNetworkStatus(request, response) {
  if (request.method !== "POST") return sendJson(response, 405, { error: "method_not_allowed" });
  if (limited(request)) return sendJson(response, 429, { error: "rate_limited", message: "Wait a moment before checking again." });
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 2048) return sendJson(response, 413, { error: "request_too_large" });
  }
  let input;
  try { input = JSON.parse(body || "{}"); } catch { return sendJson(response, 400, { error: "invalid_json" }); }
  const network = NETWORK_BY_ID[input.networkId];
  if (!network) return sendJson(response, 400, { error: "unsupported_network" });
  const endpoint = rpcUrl(network.id);
  if (!endpoint) return sendJson(response, 503, { error: "rpc_not_configured", message: "A server-side RPC endpoint is not configured for this network." });

  try {
    if (network.family === "Solana") {
      const genesisHash = await rpcCall(endpoint, { jsonrpc: "2.0", id: 1, method: "getGenesisHash", params: [] });
      const matches = matchesConfiguredNetwork(network.id, genesisHash);
      return sendJson(response, 200, {
        reachable: true,
        matchesExpectedNetwork: matches,
        network: network.name,
        environment: network.environment,
        message: matches ? "Mainnet RPC is responding." : "RPC responded with a different Solana cluster."
      });
    }
    const chainIdHex = await rpcCall(endpoint, { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] });
    const actualChainId = Number.parseInt(chainIdHex, 16);
    const matches = matchesConfiguredNetwork(network.id, chainIdHex);
    return sendJson(response, 200, {
      reachable: true,
      matchesExpectedNetwork: matches,
      actualChainId: Number.isFinite(actualChainId) ? actualChainId : null,
      expectedChainId: network.chainId,
      network: network.name,
      environment: network.environment,
      message: matches ? "Mainnet RPC is responding." : "RPC responded with a different chain ID."
    });
  } catch {
    return sendJson(response, 503, { error: "rpc_unavailable", message: "The RPC endpoint did not respond. Try again later or configure a dedicated provider." });
  }
}

async function handleTokenRead(request, response, url) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "method_not_allowed" });
  if (limited(request)) return sendJson(response, 429, { error: "rate_limited", message: "Wait a moment before checking again." });
  const validated = validateTokenRead(url.searchParams.get("network"), url.searchParams.get("address"));
  if (!validated.ok && validated.error === "unsupported_network") return sendJson(response, 400, { error: validated.error, message: "Token reads are currently available for EVM networks only." });
  if (!validated.ok) return sendJson(response, 400, { error: validated.error, message: "Enter a valid EVM contract address." });
  const { network, address } = validated;
  const endpoint = rpcUrl(network.id);
  if (!endpoint) return sendJson(response, 503, { error: "rpc_not_configured", message: "A server-side RPC endpoint is not configured for this network." });

  try {
    const call = (selector) => rpcCall(endpoint, {
      jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: address, data: selector }, "latest"]
    });
    const [nameRaw, symbolRaw, decimalsRaw, supplyRaw] = await Promise.all([
      call("0x06fdde03").catch(() => null),
      call("0x95d89b41").catch(() => null),
      call("0x313ce567").catch(() => null),
      call("0x18160ddd").catch(() => null)
    ]);
    const name = nameRaw ? decodeAbiString(nameRaw) : null;
    const symbol = symbolRaw ? decodeAbiString(symbolRaw) : null;
    const decimalsValue = decimalsRaw ? decodeAbiUint(decimalsRaw) : null;
    const supply = supplyRaw ? decodeAbiUint(supplyRaw) : null;
    if (!name && !symbol && !decimalsValue && !supply) {
      return sendJson(response, 404, { error: "token_data_unavailable", message: "This address returned no readable ERC-20 data on the selected network." });
    }
    const decimals = decimalsValue != null && Number(decimalsValue) <= 255 ? Number(decimalsValue) : null;
    return sendJson(response, 200, {
      available: true,
      network: network.name,
      chainId: network.chainId,
      address,
      name,
      symbol,
      decimals,
      totalSupplyRaw: supply,
      totalSupply: supply != null && decimals != null ? formatUnits(supply, decimals) : null,
      deployer: null,
      deploymentTransaction: null,
      verifiedSource: null,
      metadata: null,
      explorer: `${network.explorer}/address/${address}`
    });
  } catch {
    return sendJson(response, 503, { error: "rpc_unavailable", message: "The RPC endpoint could not read this contract. Try again later." });
  }
}

function setSecurityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
}

async function serveStatic(response, pathname) {
  let requested = decodeURIComponent(pathname);
  if (requested === "/") requested = "/index.html";
  let filePath = path.resolve(webRoot, `.${requested}`);
  const rootWithSep = `${path.resolve(webRoot)}${path.sep}`;
  if (filePath !== path.resolve(webRoot, "index.html") && !filePath.startsWith(rootWithSep)) {
    response.writeHead(403); response.end("Forbidden"); return;
  }
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("not a file");
  } catch {
    if (path.extname(requested)) {
      response.writeHead(404); response.end("Not found"); return;
    }
    filePath = path.join(webRoot, "index.html");
  }
  try {
    const data = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": path.extname(filePath) === ".html" ? "no-cache" : "public, max-age=3600"
    });
    response.end(data);
  } catch {
    response.writeHead(404); response.end("Not found");
  }
}

export function createServer() {
  return createHttpServer(async (request, response) => {
    setSecurityHeaders(response);
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname === "/api/network-status") return handleNetworkStatus(request, response);
    if (url.pathname === "/api/token") return handleTokenRead(request, response, url);
    if (request.method !== "GET" && request.method !== "HEAD") return sendJson(response, 405, { error: "method_not_allowed" });
    return serveStatic(response, url.pathname);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  const host = process.env.HOST || "127.0.0.1";
  createServer().listen(port, host, () => console.log(`CREOVEX is serving on http://${host}:${port}`));
}
