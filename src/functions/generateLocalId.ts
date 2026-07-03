import { ID_UUID_PREFIX } from "../constants/ID_UUID_PREFIX";

/**
 * Generates a special (UU)ID for locally stored entries,
 * which can be recognized again via `isLocalId()`.
 * @param prefix Optional prefix of the ID.
 * @returns {string} The generated ID.
 */
export function generateLocalId(prefix?: string) {
  const prefixToUse = typeof prefix === "string" ? prefix : ID_UUID_PREFIX;
  return `${prefixToUse}${crypto.randomUUID()}`;
}
