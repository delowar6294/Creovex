export const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

export function isValidAddress(value) {
  return ADDRESS_RE.test(String(value || "").trim());
}

export function validateTokenDraft(draft) {
  const errors = {};
  const name = String(draft.name || "").trim();
  const symbol = String(draft.symbol || "").trim();
  const supply = String(draft.supply || "").trim();
  const decimals = Number(draft.decimals);

  if (name.length < 2 || name.length > 40) errors.name = "Use 2–40 characters.";
  else if (/[\u0000-\u001f\u007f<>]/.test(name)) errors.name = "Remove control characters and angle brackets.";
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{1,11}$/.test(symbol)) errors.symbol = "Use 2–12 letters, numbers, spaces, dots, dashes, or underscores.";
  if (supply.length === 0 || !/^\d+(\.\d+)?$/.test(supply) || !/[1-9]/.test(supply)) errors.supply = "Enter a positive whole or decimal token amount.";
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) errors.decimals = "Decimals must be between 0 and 18.";
  else if (/^\d+(\.\d+)?$/.test(supply)) {
    const [whole, fraction = ""] = supply.split(".");
    if (fraction.length > decimals) errors.supply = `This amount has more than ${decimals} decimal places.`;
    else if (whole.length > 78) errors.supply = "This amount exceeds the maximum supported supply.";
    else {
      const atomic = BigInt(whole) * (10n ** BigInt(decimals)) + BigInt((fraction.padEnd(decimals, "0") || "0"));
      if (atomic > (2n ** 256n) - 1n) errors.supply = "This amount exceeds the maximum supported supply.";
    }
  }
  if (String(draft.description || "").length > 500) errors.description = "Description must be 500 characters or fewer.";

  for (const key of ["website", "socialX", "socialTelegram", "metadataURI"]) {
    const value = String(draft[key] || "").trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!/^https?:$/.test(url.protocol)) throw new Error("unsupported protocol");
    } catch {
      errors[key] = "Enter a valid http or https URL.";
    }
  }

  return errors;
}

export function decodeAbiString(hex) {
  if (typeof hex !== "string" || !/^0x[0-9a-f]*$/i.test(hex) || hex.length < 66) return null;
  const body = hex.slice(2);
  try {
    const offset = Number(BigInt(`0x${body.slice(0, 64)}`)) * 2;
    const lengthAt = offset;
    if (Number.isSafeInteger(offset) && lengthAt + 64 <= body.length) {
      const length = Number(BigInt(`0x${body.slice(lengthAt, lengthAt + 64)}`));
      const start = lengthAt + 64;
      if (Number.isSafeInteger(length) && length >= 0 && start + length * 2 <= body.length) {
        const bytes = Uint8Array.from(body.slice(start, start + length * 2).match(/.{2}/g) || [], (byte) => parseInt(byte, 16));
        return new TextDecoder().decode(bytes).replace(/\0+$/g, "");
      }
    }
    const bytes32 = body.slice(0, 64).match(/.{2}/g) || [];
    const legacyText = new TextDecoder().decode(Uint8Array.from(bytes32, (byte) => parseInt(byte, 16))).replace(/\0+$/g, "");
    return /^[\x20-\x7e]*$/.test(legacyText) ? legacyText : null;
  } catch {
    return null;
  }
}

export function decodeAbiUint(hex) {
  if (typeof hex !== "string" || !/^0x[0-9a-f]+$/i.test(hex)) return null;
  try {
    return BigInt(hex).toString();
  } catch {
    return null;
  }
}

export function formatUnits(raw, decimals = 18, maxFractionDigits = 6) {
  if (raw == null || !/^\d+$/.test(String(raw))) return "Unavailable";
  const value = BigInt(raw);
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const remainder = value % scale;
  if (decimals === 0 || remainder === 0n) return whole.toLocaleString("en-US");
  const fractional = remainder.toString().padStart(decimals, "0").slice(0, maxFractionDigits).replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}.${fractional}`;
}

export function shortenAddress(value, head = 6, tail = 4) {
  const text = String(value || "");
  if (text.length <= head + tail + 3) return text;
  return `${text.slice(0, head)}…${text.slice(-tail)}`;
}
