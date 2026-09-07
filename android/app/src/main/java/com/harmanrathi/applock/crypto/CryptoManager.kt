package com.harmanrathi.applock.crypto

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/**
 * HRTA SECURE SYSTEM - Cryptographic Security Engine
 * Developed by Harman Rathi
 *
 * Implements PBKDF2-HMAC-SHA256 password derivation with 100,000 iterations
 * and 128-bit cryptographically secure random salt.
 * Uses Android Keystore-backed EncryptedSharedPreferences.
 */
object CryptoManager {
    private const val TAG = "HRTA_CryptoManager"
    private const val ALGORITHM = "PBKDF2WithHmacSHA256"
    private const val ITERATIONS = 100000
    private const val KEY_LENGTH_BITS = 256
    private const val SALT_LENGTH_BYTES = 16

    private const val PREFS_FILE = "hrta_secure_credentials"
    private const val KEY_SALT = "enc_pin_salt_hex"
    private const val KEY_HASH = "enc_pin_hash_hex"
    private const val KEY_PIN_LENGTH = "pin_length"

    // Persistent attempt tracking & lockout protection
    private const val KEY_FAILED_ATTEMPTS = "failed_attempts_count"
    private const val KEY_LOCKOUT_TIMESTAMP = "lockout_start_time"
    const val MAX_ATTEMPTS = 5
    const val LOCKOUT_DURATION_MS = 30000L // 30 seconds cooldown

    private fun getSecurePreferences(context: Context): SharedPreferences {
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                context,
                PREFS_FILE,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            Log.w(TAG, "Hardware Keystore EncryptedSharedPreferences unavailable, falling back to private prefs", e)
            context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)
        }
    }

    fun generateSalt(): ByteArray {
        val salt = ByteArray(SALT_LENGTH_BYTES)
        SecureRandom().nextBytes(salt)
        return salt
    }

    fun deriveHash(pin: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(pin.toCharArray(), salt, ITERATIONS, KEY_LENGTH_BITS)
        val factory = SecretKeyFactory.getInstance(ALGORITHM)
        return factory.generateSecret(spec).encoded
    }

    fun setMasterPin(context: Context, pin: String): Boolean {
        if (!pin.matches(Regex("^[0-9]{4,6}$"))) {
            Log.e(TAG, "PIN validation failed: must be 4 to 6 digits")
            return false
        }

        return try {
            val salt = generateSalt()
            val hash = deriveHash(pin, salt)

            val prefs = getSecurePreferences(context)
            prefs.edit()
                .putString(KEY_SALT, bytesToHex(salt))
                .putString(KEY_HASH, bytesToHex(hash))
                .putInt(KEY_PIN_LENGTH, pin.length)
                .remove(KEY_FAILED_ATTEMPTS)
                .remove(KEY_LOCKOUT_TIMESTAMP)
                .apply()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error storing cryptographic verifier", e)
            false
        }
    }

    fun getStoredPinLength(context: Context): Int {
        val prefs = getSecurePreferences(context)
        return prefs.getInt(KEY_PIN_LENGTH, 4)
    }

    fun getRemainingLockoutSeconds(context: Context): Long {
        val prefs = getSecurePreferences(context)
        val lockoutTimestamp = prefs.getLong(KEY_LOCKOUT_TIMESTAMP, 0L)
        if (lockoutTimestamp == 0L) return 0L
        val elapsed = System.currentTimeMillis() - lockoutTimestamp
        return if (elapsed < LOCKOUT_DURATION_MS) {
            (LOCKOUT_DURATION_MS - elapsed) / 1000L + 1L
        } else {
            0L
        }
    }

    fun getFailedAttempts(context: Context): Int {
        return getSecurePreferences(context).getInt(KEY_FAILED_ATTEMPTS, 0)
    }

    fun recordFailedAttempt(context: Context): Int {
        val prefs = getSecurePreferences(context)
        val currentAttempts = prefs.getInt(KEY_FAILED_ATTEMPTS, 0) + 1
        val editor = prefs.edit().putInt(KEY_FAILED_ATTEMPTS, currentAttempts)
        if (currentAttempts >= MAX_ATTEMPTS) {
            editor.putLong(KEY_LOCKOUT_TIMESTAMP, System.currentTimeMillis())
        }
        editor.apply()
        return currentAttempts
    }

    fun resetFailedAttempts(context: Context) {
        getSecurePreferences(context).edit()
            .remove(KEY_FAILED_ATTEMPTS)
            .remove(KEY_LOCKOUT_TIMESTAMP)
            .apply()
    }

    fun verifyPin(context: Context, enteredPin: String): Boolean {
        // Strict Fail-Closed: validate format before attempting crypto
        if (enteredPin.isEmpty() || !enteredPin.matches(Regex("^[0-9]{4,6}$"))) {
            Log.w(TAG, "Fail-closed: entered PIN failed format constraint")
            return false
        }

        return try {
            val prefs = getSecurePreferences(context)
            val saltHex = prefs.getString(KEY_SALT, null) ?: run {
                Log.w(TAG, "Fail-closed: salt missing from secure store")
                return false
            }
            val storedHashHex = prefs.getString(KEY_HASH, null) ?: run {
                Log.w(TAG, "Fail-closed: hash verifier missing from secure store")
                return false
            }

            val storedLength = prefs.getInt(KEY_PIN_LENGTH, 0)
            if (storedLength in 4..6 && enteredPin.length != storedLength) {
                Log.w(TAG, "Fail-closed: PIN length mismatch with stored verifier")
                return false
            }

            val salt = hexToBytes(saltHex)
            val storedHash = hexToBytes(storedHashHex)

            if (salt.isEmpty() || storedHash.isEmpty()) {
                Log.w(TAG, "Fail-closed: corrupted salt or hash bytes")
                return false
            }

            val computedHash = deriveHash(enteredPin, salt)

            // Constant-time comparison to prevent timing side-channel attacks
            MessageDigest.isEqual(computedHash, storedHash)
        } catch (e: Exception) {
            Log.e(TAG, "Fail-closed: Exception during cryptographic verification", e)
            false
        }
    }

    fun isPinConfigured(context: Context): Boolean {
        val prefs = getSecurePreferences(context)
        return prefs.contains(KEY_SALT) && prefs.contains(KEY_HASH)
    }

    fun clearPin(context: Context) {
        val prefs = getSecurePreferences(context)
        prefs.edit().clear().apply()
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val sb = StringBuilder(bytes.size * 2)
        for (b in bytes) {
            sb.append(String.format("%02x", b))
        }
        return sb.toString()
    }

    private fun hexToBytes(hex: String): ByteArray {
        val len = hex.length
        val data = ByteArray(len / 2)
        var i = 0
        while (i < len) {
            data[i / 2] = ((Character.digit(hex[i], 16) shl 4) + Character.digit(hex[i + 1], 16)).toByte()
            i += 2
        }
        return data
    }
}
