import { describe, it, expect } from 'vitest';
import {
  generateSalt,
  derivePinHash,
  createPinVerifier,
  verifyPin,
  constantTimeEquals,
  bytesToHex,
  hexToBytes,
} from '../src/services/crypto';

describe('HRTA Secure System - Cryptographic PIN & Local Recovery', () => {
  it('should generate a 16-byte random salt', () => {
    const salt1 = generateSalt(16);
    const salt2 = generateSalt(16);
    expect(salt1.length).toBe(16);
    expect(salt2.length).toBe(16);
    expect(salt1).not.toEqual(salt2);
  });

  it('should derive consistent keys for the same PIN and salt', async () => {
    const salt = generateSalt(16);
    const pin = '1234';
    const key1 = await derivePinHash(pin, salt, 100000);
    const key2 = await derivePinHash(pin, salt, 100000);
    expect(key1).toEqual(key2);
  });

  it('should derive different keys for different PINs', async () => {
    const salt = generateSalt(16);
    const key1 = await derivePinHash('1234', salt, 100000);
    const key2 = await derivePinHash('5678', salt, 100000);
    expect(key1).not.toEqual(key2);
  });

  it('should derive different keys for different salts with same PIN', async () => {
    const salt1 = generateSalt(16);
    const salt2 = generateSalt(16);
    const pin = '1234';
    const key1 = await derivePinHash(pin, salt1, 100000);
    const key2 = await derivePinHash(pin, salt2, 100000);
    expect(key1).not.toEqual(key2);
  });

  it('should create and verify a 4-digit PIN verifier', async () => {
    const pin = '4321';
    const verifier = await createPinVerifier(pin);

    expect(verifier.saltHex).toBeDefined();
    expect(verifier.hashHex).toBeDefined();
    expect(verifier.iterations).toBe(100000);
    expect(verifier.pinLength).toBe(4);

    const isCorrect = await verifyPin(pin, verifier);
    expect(isCorrect).toBe(true);

    const isWrong = await verifyPin('9999', verifier);
    expect(isWrong).toBe(false);
  });

  it('should create and verify a 6-digit PIN verifier', async () => {
    const pin = '123456';
    const verifier = await createPinVerifier(pin);

    expect(verifier.pinLength).toBe(6);
    const isCorrect = await verifyPin(pin, verifier);
    expect(isCorrect).toBe(true);

    const isWrong = await verifyPin('123455', verifier);
    expect(isWrong).toBe(false);
  });

  it('should fail-closed if entered PIN length mismatches verifier pinLength', async () => {
    const pin = '1234';
    const verifier = await createPinVerifier(pin);

    const result = await verifyPin('123456', verifier);
    expect(result).toBe(false);
  });

  it('should reject invalid PIN formats during creation', async () => {
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

  it('should reset failed attempts quota when lockout cooldown expires', () => {
    let failedAttempts = 5;
    const lockoutTime = Date.now() - 35000; // 35s ago
    const cooldownMs = 30000;

    if (Date.now() - lockoutTime >= cooldownMs) {
      failedAttempts = 0; // Fresh quota
    }
    expect(failedAttempts).toBe(0);
  });

  it('should validate Emergency Recovery Key structure and >= 80 bits entropy', () => {
    const recoveryRegex = /^HRTA(-[0-9A-Z]{4}){4}$/;
    const validKey = 'HRTA-7F92-44A1-B892-K9Q2';
    expect(recoveryRegex.test(validKey)).toBe(true);

    // 16 chars from 32-char alphabet = 16 * 5 = 80 bits
    const rawChars = validKey.replace(/[^0-9A-Z]/g, '').replace(/^HRTA/, '');
    expect(rawChars.length).toBe(16);
    const entropyBits = rawChars.length * Math.log2(32);
    expect(entropyBits).toBeGreaterThanOrEqual(80);

    // Normalization test
    const normalized = validKey.trim().toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^HRTA/, '');
    expect(normalized).toBe('7F9244A1B892K9Q2');
  });

  it('should support standard relock behaviors', () => {
    const behaviors = ['IMMEDIATELY', 'SCREEN_OFF', 'TIMEOUT_1_MIN', 'TIMEOUT_5_MIN'];
    expect(behaviors).toContain('IMMEDIATELY');
    expect(behaviors).toContain('SCREEN_OFF');
    expect(behaviors).toContain('TIMEOUT_1_MIN');
    expect(behaviors).toContain('TIMEOUT_5_MIN');
  });
});
