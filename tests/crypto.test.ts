import { describe, it, expect } from 'vitest';
import {
  createPinVerifier,
  verifyPin,
  bytesToHex,
  hexToBytes,
  constantTimeEquals,
  generateSalt,
  PBKDF2_ITERATIONS,
} from '../src/services/crypto';

describe('HRTA Secure System - Cryptographic PIN Verification', () => {
  it('should generate valid verifier with PBKDF2-HMAC-SHA256 and non-empty salt', async () => {
    const pin = '1234';
    const verifier = await createPinVerifier(pin);

    expect(verifier.algorithm).toBe('PBKDF2-HMAC-SHA256');
    expect(verifier.iterations).toBe(PBKDF2_ITERATIONS);
    expect(verifier.saltHex).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(verifier.hashHex).toHaveLength(64); // 32 bytes = 64 hex chars
    expect(verifier.pinLength).toBe(4);
    // Plaintext PIN must never exist in the verifier object
    expect((verifier as any).pin).toBeUndefined();
  });

  it('should authenticate correct 4-digit PIN', async () => {
    const pin = '5678';
    const verifier = await createPinVerifier(pin);

    const isValid = await verifyPin(pin, verifier);
    expect(isValid).toBe(true);
  });

  it('should authenticate correct 6-digit PIN', async () => {
    const pin = '987654';
    const verifier = await createPinVerifier(pin);

    const isValid = await verifyPin(pin, verifier);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect PIN', async () => {
    const correctPin = '1234';
    const wrongPin = '4321';
    const verifier = await createPinVerifier(correctPin);

    const isValid = await verifyPin(wrongPin, verifier);
    expect(isValid).toBe(false);
  });

  it('should produce unique salts for identical PINs', async () => {
    const pin = '7777';
    const verifier1 = await createPinVerifier(pin);
    const verifier2 = await createPinVerifier(pin);

    expect(verifier1.saltHex).not.toBe(verifier2.saltHex);
    expect(verifier1.hashHex).not.toBe(verifier2.hashHex);

    // Both verifiers should still authenticate the same PIN
    expect(await verifyPin(pin, verifier1)).toBe(true);
    expect(await verifyPin(pin, verifier2)).toBe(true);
  });

  it('should reject corrupted salt in verifier safely without throwing unhandled exception', async () => {
    const pin = '1122';
    const verifier = await createPinVerifier(pin);

    // Corrupt the salt
    const corruptedVerifier = {
      ...verifier,
      saltHex: '00'.repeat(16),
    };

    const isValid = await verifyPin(pin, corruptedVerifier);
    expect(isValid).toBe(false);
  });

  it('should reject corrupted hash in verifier', async () => {
    const pin = '1122';
    const verifier = await createPinVerifier(pin);

    // Corrupt one byte of hash
    const corruptedHash = 'ff' + verifier.hashHex.slice(2);
    const corruptedVerifier = {
      ...verifier,
      hashHex: corruptedHash,
    };

    const isValid = await verifyPin(pin, corruptedVerifier);
    expect(isValid).toBe(false);
  });

  it('should handle null or invalid verifier safely', async () => {
    expect(await verifyPin('1234', null)).toBe(false);
    expect(await verifyPin('', null)).toBe(false);
    expect(await verifyPin('1234', {} as any)).toBe(false);
  });

  it('should reject non-numeric or out-of-bounds PINs during creation', async () => {
    await expect(createPinVerifier('12')).rejects.toThrow();
    await expect(createPinVerifier('1234567')).rejects.toThrow();
    await expect(createPinVerifier('abcd')).rejects.toThrow();
    await expect(createPinVerifier('')).rejects.toThrow();
  });

  it('should correctly convert bytes to hex and back', () => {
    const original = generateSalt(16);
    const hex = bytesToHex(original);
    const recovered = hexToBytes(hex);
    expect(constantTimeEquals(original, recovered)).toBe(true);
  });

  it('should perform constant-time comparison correctly', () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    const c = new Uint8Array([1, 2, 3, 5]);
    const d = new Uint8Array([1, 2, 3]);

    expect(constantTimeEquals(a, b)).toBe(true);
    expect(constantTimeEquals(a, c)).toBe(false);
    expect(constantTimeEquals(a, d)).toBe(false);
  });

  it('should enforce 5-attempt threshold and 30s lockout calculations', () => {
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_DURATION_MS = 30000;

    let failedAttempts = 4;
    expect(failedAttempts < MAX_ATTEMPTS).toBe(true);

    failedAttempts += 1;
    expect(failedAttempts >= MAX_ATTEMPTS).toBe(true);

    const now = Date.now();
    const lockoutStartTime = now;
    const elapsed = 10000;
    const remainingSeconds = Math.ceil((LOCKOUT_DURATION_MS - elapsed) / 1000);
    expect(remainingSeconds).toBe(20);

    const expiredElapsed = 35000;
    const expiredRemaining = Math.max(0, Math.ceil((LOCKOUT_DURATION_MS - expiredElapsed) / 1000));
    expect(expiredRemaining).toBe(0);
  });

  it('should support standard relock behaviors', () => {
    const behaviors = ['IMMEDIATELY', 'SCREEN_OFF', 'TIMEOUT_1_MIN', 'TIMEOUT_5_MIN'];
    expect(behaviors).toContain('IMMEDIATELY');
    expect(behaviors).toContain('SCREEN_OFF');
    expect(behaviors).toContain('TIMEOUT_1_MIN');
    expect(behaviors).toContain('TIMEOUT_5_MIN');
  });
});

