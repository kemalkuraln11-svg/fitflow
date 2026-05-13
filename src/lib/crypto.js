/**
 * Hash a password using SHA-256 via the Web Crypto API.
 * Returns a hex string. This is a one-way hash — passwords are never stored in plaintext.
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}