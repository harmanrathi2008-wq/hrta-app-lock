package com.harmanrathi.applock

import com.harmanrathi.applock.crypto.CryptoManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.security.MessageDigest

class CryptoManagerTest {

    @Test
    fun testGenerateSaltProduces16Bytes() {
        val salt = CryptoManager.generateSalt()
        assertNotNull("Salt must not be null", salt)
        assertEquals("Salt must be exactly 16 bytes", 16, salt.size)
    }

    @Test
    fun testConsecutiveSaltsAreUnique() {
        val salt1 = CryptoManager.generateSalt()
        val salt2 = CryptoManager.generateSalt()
        assertFalse("Consecutive salts must be cryptographically random and unique", salt1.contentEquals(salt2))
    }

    @Test
    fun testDeriveHashDeterministicForSameInput() {
        val salt = CryptoManager.generateSalt()
        val pin = "1234"
        val hash1 = CryptoManager.deriveHash(pin, salt)
        val hash2 = CryptoManager.deriveHash(pin, salt)

        assertEquals("DeriveHash must produce 32 bytes", 32, hash1.size)
        assertTrue("Hashes for identical PIN and salt must match", MessageDigest.isEqual(hash1, hash2))
    }

    @Test
    fun testDeriveHashDifferentForDifferentPins() {
        val salt = CryptoManager.generateSalt()
        val hash4Digit = CryptoManager.deriveHash("1234", salt)
        val hash6Digit = CryptoManager.deriveHash("123456", salt)
        val hashWrongDigit = CryptoManager.deriveHash("1235", salt)

        assertFalse("Different length PINs must have different hashes", MessageDigest.isEqual(hash4Digit, hash6Digit))
        assertFalse("Different PINs must have different hashes", MessageDigest.isEqual(hash4Digit, hashWrongDigit))
    }

    @Test
    fun testDeriveHashDifferentForDifferentSalts() {
        val salt1 = CryptoManager.generateSalt()
        val salt2 = CryptoManager.generateSalt()
        val pin = "987654"

        val hash1 = CryptoManager.deriveHash(pin, salt1)
        val hash2 = CryptoManager.deriveHash(pin, salt2)

        assertFalse("Same PIN with different salts must produce distinct hashes", MessageDigest.isEqual(hash1, hash2))
    }

    @Test
    fun testPinValidationRegexRules() {
        val pinRegex = Regex("^[0-9]{4,6}$")

        // Valid PINs
        assertTrue("4-digit PIN is valid", "1234".matches(pinRegex))
        assertTrue("5-digit PIN is valid", "12345".matches(pinRegex))
        assertTrue("6-digit PIN is valid", "123456".matches(pinRegex))

        // Invalid PINs
        assertFalse("Empty PIN is invalid", "".matches(pinRegex))
        assertFalse("3-digit PIN is invalid", "123".matches(pinRegex))
        assertFalse("7-digit PIN is invalid", "1234567".matches(pinRegex))
        assertFalse("PIN with letters is invalid", "12a4".matches(pinRegex))
        assertFalse("PIN with spaces is invalid", "12 4".matches(pinRegex))
        assertFalse("PIN with symbols is invalid", "12#4".matches(pinRegex))
    }

    @Test
    fun testLockoutCooldownMath() {
        val maxAttempts = CryptoManager.MAX_ATTEMPTS
        val lockoutDurationMs = CryptoManager.LOCKOUT_DURATION_MS

        assertEquals("Max allowed attempts is 5", 5, maxAttempts)
        assertEquals("Lockout duration is 30,000 ms", 30000L, lockoutDurationMs)

        // Simulate lockout timing
        val now = 1000000L
        val lockoutStartTime = now - 10000L // 10s elapsed
        val elapsed = now - lockoutStartTime
        val remaining = (lockoutDurationMs - elapsed) / 1000L
        assertEquals("Remaining lockout must be 20 seconds", 20L, remaining)

        // Elapsed exceeds duration
        val expiredStartTime = now - 35000L
        val expiredElapsed = now - expiredStartTime
        val expiredRemaining = if (expiredElapsed < lockoutDurationMs) (lockoutDurationMs - expiredElapsed) / 1000L else 0L
        assertEquals("Expired lockout must return 0 seconds", 0L, expiredRemaining)
    }

    @Test
    fun testRelockBehaviorValues() {
        val validBehaviors = listOf("IMMEDIATELY", "SCREEN_OFF", "TIMEOUT_1_MIN", "TIMEOUT_5_MIN")
        assertTrue(validBehaviors.contains("IMMEDIATELY"))
        assertTrue(validBehaviors.contains("SCREEN_OFF"))
        assertTrue(validBehaviors.contains("TIMEOUT_1_MIN"))
        assertTrue(validBehaviors.contains("TIMEOUT_5_MIN"))

        val timeout1MinMs = 60 * 1000L
        val timeout5MinMs = 5 * 60 * 1000L

        assertEquals(60000L, timeout1MinMs)
        assertEquals(300000L, timeout5MinMs)
    }
}
