import test from "node:test";
import assert from "node:assert/strict";
import { matchesConfiguredNetwork, validateTokenRead } from "../server.mjs";

test("token read validation only permits known EVM networks and valid addresses", () => {
  assert.equal(validateTokenRead("custom", `0x${"a".repeat(40)}`).error, "unsupported_network");
  assert.equal(validateTokenRead("solana", `0x${"a".repeat(40)}`).error, "unsupported_network");
  assert.equal(validateTokenRead("base", "0x1234").error, "invalid_address");
  const valid = validateTokenRead("base", `0x${"a".repeat(40)}`);
  assert.equal(valid.ok, true);
  assert.equal(valid.network.chainId, 8453);
});

test("RPC health matching rejects wrong EVM chains and Solana clusters", () => {
  assert.equal(matchesConfiguredNetwork("robinhood", "0x1237"), true);
  assert.equal(matchesConfiguredNetwork("robinhood", "0x1"), false);
  assert.equal(matchesConfiguredNetwork("solana", "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"), true);
  assert.equal(matchesConfiguredNetwork("solana", "devnet-genesis"), false);
  assert.equal(matchesConfiguredNetwork("unknown", "0x1"), false);
});
