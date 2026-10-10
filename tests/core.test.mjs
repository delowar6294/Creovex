import test from "node:test";
import assert from "node:assert/strict";
import { NETWORKS, PLATFORM_STATUS } from "../src/config.js";
import { decodeAbiString, decodeAbiUint, formatUnits, isValidAddress, validateTokenDraft } from "../src/core.js";

test("initial network set is exactly the requested five in order and deployment stays disabled", () => {
  assert.deepEqual(NETWORKS.map(({ id }) => id), ["robinhood", "base", "ethereum", "bnb", "solana"]);
  assert.deepEqual(NETWORKS.map(({ chainId }) => chainId), [4663, 8453, 1, 56, null]);
  assert.equal(NETWORKS.every((network) => network.deploymentReady === false), true);
  assert.equal(PLATFORM_STATUS.deploymentEnabled, false);
  assert.equal(PLATFORM_STATUS.feeRecipientConfigured, false);
});

test("token draft validation accepts complete input and rejects unsafe or malformed values", () => {
  const valid = { name: "Aurora", symbol: "AURA", supply: "1000000", decimals: "18", website: "https://aurora.example", metadataURI: "https://cdn.example/meta.json" };
  assert.deepEqual(validateTokenDraft(valid), {});
  assert.match(validateTokenDraft({ ...valid, name: "x" }).name, /2–40/);
  assert.match(validateTokenDraft({ ...valid, symbol: "<script>" }).symbol, /2–12/);
  assert.match(validateTokenDraft({ ...valid, supply: "0" }).supply, /positive/);
  assert.match(validateTokenDraft({ ...valid, decimals: "19" }).decimals, /between 0 and 18/);
  assert.match(validateTokenDraft({ ...valid, website: "javascript:alert(1)" }).website, /http or https/);
  assert.match(validateTokenDraft({ ...valid, supply: "1.0000000000000000001" }).supply, /decimal places/);
  assert.match(validateTokenDraft({ ...valid, supply: "9".repeat(79) }).supply, /maximum supported supply/);
  assert.match(validateTokenDraft({ ...valid, name: "<unsafe>" }).name, /control characters/);
});

function encodeAbiString(value) {
  const bytes = Buffer.from(value, "utf8");
  const length = bytes.length.toString(16).padStart(64, "0");
  const data = bytes.toString("hex").padEnd(Math.ceil(bytes.length / 32) * 64, "0");
  return `0x${"20".padStart(64, "0")}${length}${data}`;
}

test("ABI decoders read dynamic strings, bytes32 strings, and unsigned integers", () => {
  assert.equal(decodeAbiString(encodeAbiString("CREOVEX")), "CREOVEX");
  assert.equal(decodeAbiString(`0x${Buffer.from("CVX").toString("hex").padEnd(64, "0")}`), "CVX");
  assert.equal(decodeAbiUint(`0x${(123456789n).toString(16)}`), "123456789");
  assert.equal(decodeAbiString("not-hex"), null);
  assert.equal(decodeAbiUint("0xnope"), null);
});

test("unit formatting and address validation stay deterministic", () => {
  assert.equal(formatUnits("1234500000000000000", 18), "1.2345");
  assert.equal(formatUnits("0", 18), "0");
  assert.equal(isValidAddress(`0x${"a".repeat(40)}`), true);
  assert.equal(isValidAddress("0x1234"), false);
});
