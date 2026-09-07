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
 * HRTA SECURE SYSTEM - Cryptographic Security & Local Recovery Engine
 * Developed by Harman Rathi
 *
 * Implements PBKDF2-HMAC-SHA256 derivation (100,000 iterations, 128-bit random salt),
 * Android Keystore-backed EncryptedSharedPreferences (Fail-Closed),
 * and 100% Local-First Emergency Recovery Key with >= 80 bits of random entropy.
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

    // Emergency Recovery Key credentials (>= 80 bits entropy)
    private const val KEY_RECOVERY_SALT = "enc_recovery_salt_hex"
    private const val KEY_RECOVERY_HASH = "enc_recovery_hash_hex"
    private const val KEY_RECOVERY_FAILED_ATTEMPTS = "recovery_failed_attempts"
    private const val KEY_RECOVERY_LOCKOUT_TIMESTAMP = "recovery_lockout_time"

    // Base32 Crockford alphabet: 32 chars = 5 bits per character (16 chars = exactly 80 bits entropy)
    private const val RECOVERY_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

    enum class RecoveryMethod {
        BIOMETRIC,
        RECOVERY_KEY
    }

    // Native in-memory recovery authorization (Zero JS exposure, 60s TTL, single-use)
    @Volatile
    private var isRecoveryAuthorized: Boolean = false
    @Volatile
    private var recoveryAuthExpiry: Long = 0L
    @Volatile
    private var activeRecoveryMethod: RecoveryMethod? = null

    /**
     * Obtains Keystore-backed EncryptedSharedPreferences.
     * STRICT FAIL-CLOSED: If hardware keystore fails or is unavailable,
     * returns null. Under NO circumstances does it fall back to plaintext SharedPreferences.
     */
    private fun getSecurePreferences(context: Context): SharedPreferences? {
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
            Log.e(TAG, "Hardware Keystore EncryptedSharedPreferences unavailable. FAILING CLOSED.", e)
            null
        }
    }

    fun generateSalt(): ByteArray {
        val salt = ByteArray(SALT_LENGTH_BYTES)
        SecureRandom().nextBytes(salt)
        return salt
    }

    fun deriveHash(credential: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(credential.toCharArray(), salt, ITERATIONS, KEY_LENGTH_BITS)
        val factory = SecretKeyFactory.getInstance(ALGORITHM)
        return factory.generateSecret(spec).encoded
    }

    fun setMasterPin(context: Context, pin: String): Boolean {
        if (!pin.matches(Regex("^[0-9]{4,6}$"))) {
            Log.e(TAG, "PIN validation failed: must be 4 to 6 digits")
            return false
        }

        val prefs = getSecurePreferences(context)
        if (prefs == null) {
            Log.e(TAG, "Fail-closed: Keystore unavailable, rejecting PIN setup")
            return false
        }

        return try {
            val salt = generateSalt()
            val hash = deriveHash(pin, salt)

            prefs.edit()
                .putString(KEY_SALT, bytesToHex(salt))
                .putString(KEY_HASH, bytesToHex(hash))
                .putInt(KEY_PIN_LENGTH, pin.length)
                .remove(KEY_FAILED_ATTEMPTS)
                .remove(KEY_LOCKOUT_TIMESTAMP)
                .commit()
        } catch (e: Exception) {
            Log.e(TAG, "Error storing cryptographic verifier", e)
            false
        }
    }

    fun getStoredPinLength(context: Context): Int {
        val prefs = getSecurePreferences(context) ?: return 4
        return prefs.getInt(KEY_PIN_LENGTH, 4)
    }

    fun getRemainingLockoutSeconds(context: Context): Long {
        val prefs = getSecurePreferences(context) ?: return 0L
        val lockoutTimestamp = prefs.getLong(KEY_LOCKOUT_TIMESTAMP, 0L)
        if (lockoutTimestamp == 0L) return 0L
        val elapsed = System.currentTimeMillis() - lockoutTimestamp
        return if (elapsed < LOCKOUT_DURATION_MS) {
            (LOCKOUT_DURATION_MS - elapsed) / 1000L + 1L
        } else {
            // Cooldown has expired: reset attempt counter to give fresh quota
            resetFailedAttempts(context)
            0L
        }
    }

    fun getFailedAttempts(context: Context): Int {
        val prefs = getSecurePreferences(context) ?: return 0
        return prefs.getInt(KEY_FAILED_ATTEMPTS, 0)
    }

    fun recordFailedAttempt(context: Context): Int {
        val prefs = getSecurePreferences(context) ?: return MAX_ATTEMPTS
        val currentAttempts = prefs.getInt(KEY_FAILED_ATTEMPTS, 0) + 1
        val editor = prefs.edit().putInt(KEY_FAILED_ATTEMPTS, currentAttempts)
        if (currentAttempts >= MAX_ATTEMPTS) {
            editor.putLong(KEY_LOCKOUT_TIMESTAMP, System.currentTimeMillis())
        }
        editor.commit()
        return currentAttempts
    }

    fun resetFailedAttempts(context: Context) {
        val prefs = getSecurePreferences(context) ?: return
        prefs.edit()
            .remove(KEY_FAILED_ATTEMPTS)
            .remove(KEY_LOCKOUT_TIMESTAMP)
            .commit()
    }

    fun verifyPin(context: Context, enteredPin: String): Boolean {
        // Strict Fail-Closed: validate format before attempting crypto
        if (enteredPin.isEmpty() || !enteredPin.matches(Regex("^[0-9]{4,6}$"))) {
            Log.w(TAG, "Fail-closed: entered PIN failed format constraint")
            return false
        }

        val prefs = getSecurePreferences(context)
        if (prefs == null) {
            Log.e(TAG, "Fail-closed: Secure Keystore unavailable during PIN verification")
            return false
        }

        return try {
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
        val prefs = getSecurePreferences(context) ?: return false
        return prefs.contains(KEY_SALT) && prefs.contains(KEY_HASH)
    }

    fun clearPin(context: Context) {
        val prefs = getSecurePreferences(context) ?: return
        prefs.edit().clear().commit()
        invalidateRecoveryAuthorization()
    }

    // ==========================================
    // EMERGENCY RECOVERY KEY (>= 80 BITS ENTROPY)
    // ==========================================

    /**
     * Generates a cryptographically random Emergency Recovery Key with at least
     * 80 bits of entropy (16 Crockford Base32 characters = exactly 80 bits).
     * Format: HRTA-XXXX-XXXX-XXXX-XXXX
     *
     * Saves the PBKDF2 hash & salt to the secure keystore and returns the plaintext
     * key EXACTLY ONCE for initial display.
     */
    fun generateRecoveryKey(context: Context): String? {
        val prefs = getSecurePreferences(context)
        if (prefs == null) {
            Log.e(TAG, "Fail-closed: Keystore unavailable, cannot generate recovery key")
            return null
        }

        val random = SecureRandom()
        val rawChars = CharArray(16)
        for (i in 0 until 16) {
            rawChars[i] = RECOVERY_ALPHABET[random.nextInt(RECOVERY_ALPHABET.length)]
        }

        val formattedKey = "HRTA-" +
                String(rawChars, 0, 4) + "-" +
                String(rawChars, 4, 4) + "-" +
                String(rawChars, 8, 4) + "-" +
                String(rawChars, 12, 4)

        return try {
            val normalized = normalizeRecoveryKey(formattedKey)
            val salt = generateSalt()
            val hash = deriveHash(normalized, salt)

            val committed = prefs.edit()
                .putString(KEY_RECOVERY_SALT, bytesToHex(salt))
                .putString(KEY_RECOVERY_HASH, bytesToHex(hash))
                .remove(KEY_RECOVERY_FAILED_ATTEMPTS)
                .remove(KEY_RECOVERY_LOCKOUT_TIMESTAMP)
                .commit()

            if (committed) formattedKey else null
        } catch (e: Exception) {
            Log.e(TAG, "Error storing recovery key verifier", e)
            null
        }
    }

    fun isRecoveryKeyConfigured(context: Context): Boolean {
        val prefs = getSecurePreferences(context) ?: return false
        return prefs.contains(KEY_RECOVERY_SALT) && prefs.contains(KEY_RECOVERY_HASH)
    }

    fun normalizeRecoveryKey(key: String): String {
        return key.trim().uppercase()
            .removePrefix("HRTA")
            .replace("-", "")
            .replace(" ", "")
    }

    fun getRemainingRecoveryLockoutSeconds(context: Context): Long {
        val prefs = getSecurePreferences(context) ?: return 0L
        val lockoutTimestamp = prefs.getLong(KEY_RECOVERY_LOCKOUT_TIMESTAMP, 0L)
        if (lockoutTimestamp == 0L) return 0L
        val elapsed = System.currentTimeMillis() - lockoutTimestamp
        return if (elapsed < LOCKOUT_DURATION_MS) {
            (LOCKOUT_DURATION_MS - elapsed) / 1000L + 1L
        } else {
            resetRecoveryFailedAttempts(context)
            0L
        }
    }

    fun recordFailedRecoveryAttempt(context: Context): Int {
        val prefs = getSecurePreferences(context) ?: return MAX_ATTEMPTS
        val currentAttempts = prefs.getInt(KEY_RECOVERY_FAILED_ATTEMPTS, 0) + 1
        val editor = prefs.edit().putInt(KEY_RECOVERY_FAILED_ATTEMPTS, currentAttempts)
        if (currentAttempts >= MAX_ATTEMPTS) {
            editor.putLong(KEY_RECOVERY_LOCKOUT_TIMESTAMP, System.currentTimeMillis())
        }
        editor.commit()
        return currentAttempts
    }

    fun resetRecoveryFailedAttempts(context: Context) {
        val prefs = getSecurePreferences(context) ?: return
        prefs.edit()
            .remove(KEY_RECOVERY_FAILED_ATTEMPTS)
            .remove(KEY_RECOVERY_LOCKOUT_TIMESTAMP)
            .commit()
    }

    fun verifyRecoveryKey(context: Context, enteredKey: String): Boolean {
        val remainingCooldown = getRemainingRecoveryLockoutSeconds(context)
        if (remainingCooldown > 0L) {
            Log.w(TAG, "Recovery key verification rejected: lockout active (${remainingCooldown}s)")
            return false
        }

        val normalized = normalizeRecoveryKey(enteredKey)
        if (normalized.length != 16) {
            Log.w(TAG, "Recovery key verification rejected: invalid length")
            recordFailedRecoveryAttempt(context)
            return false
        }

        val prefs = getSecurePreferences(context)
        if (prefs == null) {
            Log.e(TAG, "Fail-closed: Keystore unavailable during recovery key verification")
            return false
        }

        return try {
            val saltHex = prefs.getString(KEY_RECOVERY_SALT, null) ?: run {
                Log.w(TAG, "Recovery salt missing")
                return false
            }
            val storedHashHex = prefs.getString(KEY_RECOVERY_HASH, null) ?: run {
                Log.w(TAG, "Recovery hash verifier missing")
                return false
            }

            val salt = hexToBytes(saltHex)
            val storedHash = hexToBytes(storedHashHex)
            val computedHash = deriveHash(normalized, salt)

            val isValid = MessageDigest.isEqual(computedHash, storedHash)
            if (isValid) {
                resetRecoveryFailedAttempts(context)
                authorizeRecovery(RecoveryMethod.RECOVERY_KEY)
                true
            } else {
                recordFailedRecoveryAttempt(context)
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception during recovery key verification", e)
            recordFailedRecoveryAttempt(context)
            false
        }
    }

    // ====================================================
    // NATIVE IN-MEMORY RECOVERY AUTHORIZATION (ZERO JS LEAK)
    // ====================================================

    fun authorizeRecovery(method: RecoveryMethod) {
        synchronized(this) {
            isRecoveryAuthorized = true
            recoveryAuthExpiry = System.currentTimeMillis() + 60000L // 60s TTL
            activeRecoveryMethod = method
        }
        try {
            Log.i(TAG, "Recovery authorization granted natively (60s TTL)")
        } catch (ignored: Throwable) {}
    }

    fun isRecoveryAuthorized(): Boolean {
        synchronized(this) {
            if (!isRecoveryAuthorized) return false
            if (System.currentTimeMillis() > recoveryAuthExpiry) {
                invalidateRecoveryAuthorization()
                return false
            }
            return true
        }
    }

    fun invalidateRecoveryAuthorization() {
        synchronized(this) {
            isRecoveryAuthorized = false
            recoveryAuthExpiry = 0L
            activeRecoveryMethod = null
        }
    }

    /**
     * Resets the Master PIN using native recovery authorization.
     * Authorizes PIN replacement ONLY: does not clear protected apps.
     * Rotates recovery key if key-based recovery was used.
     */
    fun resetPinAfterRecovery(context: Context, newPin: String): Pair<Boolean, String?> {
        synchronized(this) {
            if (!isRecoveryAuthorized()) {
                Log.w(TAG, "PIN reset rejected: recovery authorization missing or expired")
                return Pair(false, null)
            }
            val methodUsed = activeRecoveryMethod
            invalidateRecoveryAuthorization()

            val success = setMasterPin(context, newPin)
            if (!success) {
                return Pair(false, null)
            }

            var newRecoveryKey: String? = null
            if (methodUsed == RecoveryMethod.RECOVERY_KEY) {
                newRecoveryKey = generateRecoveryKey(context)
            }
            return Pair(true, newRecoveryKey)
        }
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
