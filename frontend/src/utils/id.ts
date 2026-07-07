/**
 * ID utilities
 *
 * Cross-device unique ID generation.
 * Uses crypto.randomUUID when available (desktop, modern browsers),
 * falls back to crypto.getRandomValues for environments that lack it
 * (older/in-app mobile WebViews on Android/iOS).
 */

/**
 * Generate an RFC4122 v4 UUID string.
 *
 * On platforms with crypto.randomUUID this returns exactly its value,
 * so existing behavior is unchanged. The fallback produces a valid v4 UUID.
 */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version (4) and variant (RFC4122) bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));

  return (
    `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-` +
    `${hex[4]}${hex[5]}-` +
    `${hex[6]}${hex[7]}-` +
    `${hex[8]}${hex[9]}-` +
    `${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
  );
};
