import { StoredPinVerifier } from '../types';

export const PBKDF2_ITERATIONS = 100000;
export const SALT_BYTE_LENGTH = 16;
export const HASH_BYTE_LENGTH = 32;

/**
 * Converts a Uint8Array to a hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts a hex string to a Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const val = parseInt(hex.substring(i, i + 2), 16);
    if (isNaN(val)) {
      throw new Error('Invalid character in hex string');
    }
    bytes[i / 2] = val;
  }
  return bytes;
}

/**
 * Generates a cryptographically secure random salt.
 */
export function generateSalt(length = SALT_BYTE_LENGTH): Uint8Array {
  const salt = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(salt);
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(salt);
  } else {
    throw new Error('Cryptographic RNG is unavailable');
  }
  return salt;
}

/**
 * Derives a cryptographic hash from a PIN and salt using PBKDF2-HMAC-SHA256.
 */
export async function derivePinHash(
  pin: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS
): Promise<Uint8Array> {
  if (!pin || typeof pin !== 'string') {
    throw new Error('PIN must be a non-empty string');
  }
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);

  const cryptoObj = (typeof window !== 'undefined' && window.crypto?.subtle) 
    ? window.crypto.subtle 
    : globalThis.crypto?.subtle;

  if (!cryptoObj) {
    throw new Error('WebCrypto SubtleCrypto is unavailable in this environment');
  }

  const keyMaterial = await cryptoObj.importKey(
    'raw',
    pinData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await cryptoObj.deriveBits(
    {
      name: 'PBKDF2',
      salt: (salt.buffer as ArrayBuffer),
      iterations: iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BYTE_LENGTH * 8
  );

  return new Uint8Array(derivedBits);
}

/**
 * Creates a complete verifier record for a new PIN.
 * NOTE: The PIN itself is NEVER returned or retained.
 */
export async function createPinVerifier(pin: string): Promise<StoredPinVerifier> {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error('PIN must be between 4 and 6 numeric digits');
  }

  const salt = generateSalt(SALT_BYTE_LENGTH);
  const hashBytes = await derivePinHash(pin, salt, PBKDF2_ITERATIONS);

  return {
    algorithm: 'PBKDF2-HMAC-SHA256',
    iterations: PBKDF2_ITERATIONS,
    saltHex: bytesToHex(salt),
    hashHex: bytesToHex(hashBytes),
    pinLength: pin.length,
    createdAt: Date.now(),
  };
}

/**
 * Constant-time comparison between two Uint8Arrays to prevent timing attacks.
 */
export function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Securely verifies an entered PIN against the stored verifier.
 */
export async function verifyPin(
  enteredPin: string,
  verifier: StoredPinVerifier | null
): Promise<boolean> {
  if (!verifier || !enteredPin) {
    return false;
  }

  try {
    if (verifier.algorithm !== 'PBKDF2-HMAC-SHA256') {
      return false;
    }
    if (!verifier.saltHex || !verifier.hashHex) {
      return false;
    }

    const salt = hexToBytes(verifier.saltHex);
    const expectedHash = hexToBytes(verifier.hashHex);

    const derivedHash = await derivePinHash(
      enteredPin,
      salt,
      verifier.iterations || PBKDF2_ITERATIONS
    );

    return constantTimeEquals(derivedHash, expectedHash);
  } catch {
    return false;
  }
}
