// Web Crypto helpers for AES-GCM encrypted .tnote files.
// Format: magic(4) | salt(16) | iv(12) | ciphertext
// Key derivation: PBKDF2-SHA256, 300 000 iterations → AES-256-GCM

const MAGIC = new Uint8Array([0x54, 0x4e, 0x30, 0x31]); // "TN01"
const PBKDF2_ITERATIONS = 300_000;

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Returns true if the ArrayBuffer starts with the TN01 magic header. */
export function isEncryptedBuffer(buffer: ArrayBuffer): boolean {
  const v = new Uint8Array(buffer, 0, 4);
  return v[0] === MAGIC[0] && v[1] === MAGIC[1] && v[2] === MAGIC[2] && v[3] === MAGIC[3];
}

/** Encrypts a ZIP blob with AES-256-GCM using PBKDF2-derived key. */
export async function encryptBlob(blob: Blob, passphrase: string): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>;
  const iv   = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>;
  const key  = await deriveKey(passphrase, salt);
  const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await blob.arrayBuffer());

  const out = new Uint8Array(4 + 16 + 12 + ct.byteLength);
  out.set(MAGIC, 0);
  out.set(salt,  4);
  out.set(iv,   20);
  out.set(new Uint8Array(ct), 32);
  return new Blob([out], { type: 'application/octet-stream' });
}

/**
 * Decrypts an encrypted .tnote blob.
 * Throws DOMException (OperationError) if the passphrase is wrong.
 */
export async function decryptBlob(blob: Blob, passphrase: string): Promise<Blob> {
  const buf  = await blob.arrayBuffer();
  const view = new Uint8Array(buf);
  const salt = view.slice(4, 20) as Uint8Array<ArrayBuffer>;
  const iv   = view.slice(20, 32) as Uint8Array<ArrayBuffer>;
  const ct   = view.slice(32) as Uint8Array<ArrayBuffer>;
  const key  = await deriveKey(passphrase, salt);
  const pt   = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as Uint8Array<ArrayBuffer> }, key, ct);
  return new Blob([pt], { type: 'application/zip' });
}
