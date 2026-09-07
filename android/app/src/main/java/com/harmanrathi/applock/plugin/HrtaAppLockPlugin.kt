package com.harmanrathi.applock.plugin

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.harmanrathi.applock.crypto.CryptoManager
import com.harmanrathi.applock.service.AppMonitorService
import com.harmanrathi.applock.util.AppListHelper
import com.harmanrathi.applock.util.PermissionHelper

@CapacitorPlugin(name = "HrtaAppLock")
class HrtaAppLockPlugin : Plugin() {

    private fun getPrefs(): SharedPreferences {
        return context.getSharedPreferences("hrta_app_lock_prefs", Context.MODE_PRIVATE)
    }

    @PluginMethod
    fun getPermissionStatus(call: PluginCall) {
        val usage = PermissionHelper.hasUsageAccess(context)
        val overlay = PermissionHelper.hasOverlayPermission(context)
        val battery = PermissionHelper.isBatteryOptimizationIgnored(context)

        val ret = JSObject().apply {
            put("usageAccess", usage)
            put("overlay", overlay)
            put("batteryOptimizationIgnored", battery)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun openUsageSettings(call: PluginCall) {
        PermissionHelper.openUsageSettings(context)
        call.resolve()
    }

    @PluginMethod
    fun openOverlaySettings(call: PluginCall) {
        PermissionHelper.openOverlaySettings(context)
        call.resolve()
    }

    @PluginMethod
    fun openBatteryOptimizationSettings(call: PluginCall) {
        PermissionHelper.openBatteryOptimizationSettings(context)
        call.resolve()
    }

    @PluginMethod
    fun getInstalledApps(call: PluginCall) {
        val apps = AppListHelper.getInstalledLaunchableApps(context)
        val jsonArray = JSArray()
        for (app in apps) {
            val item = JSObject().apply {
                put("packageName", app["packageName"])
                put("name", app["name"])
                put("systemApp", app["systemApp"])
                put("category", app["category"])
            }
            jsonArray.put(item)
        }
        val ret = JSObject().apply {
            put("apps", jsonArray)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun getProtectedApps(call: PluginCall) {
        val set = getPrefs().getStringSet("protected_packages", emptySet()) ?: emptySet()
        val jsonArray = JSArray()
        for (pkg in set) {
            jsonArray.put(pkg)
        }
        val ret = JSObject().apply {
            put("packages", jsonArray)
        }
        call.resolve(ret)
    }

    /**
     * Saves protected packages. If a PIN is configured, requires native PIN
     * verification before executing. Synchronously commits to storage and verifies read-back.
     */
    @PluginMethod
    fun saveProtectedApps(call: PluginCall) {
        val pin = call.getString("pin")
        if (CryptoManager.isPinConfigured(context) && pin != null) {
            val isValid = CryptoManager.verifyPin(context, pin)
            if (!isValid) {
                val errObj = JSObject().apply {
                    put("success", false)
                    put("error", "Invalid authorization PIN")
                }
                call.resolve(errObj)
                return
            }
        }

        val packagesArray = call.getArray("packages")
        val set = mutableSetOf<String>()
        if (packagesArray != null) {
            for (i in 0 until packagesArray.length()) {
                set.add(packagesArray.getString(i))
            }
        }

        val committed = getPrefs().edit().putStringSet("protected_packages", set).commit()
        val readBack = getPrefs().getStringSet("protected_packages", emptySet()) ?: emptySet()
        val verified = committed && (readBack == set)

        val ret = JSObject().apply {
            put("success", verified)
            put("count", readBack.size)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun isPinConfigured(call: PluginCall) {
        val configured = CryptoManager.isPinConfigured(context)
        val ret = JSObject().apply {
            put("configured", configured)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun setMasterPin(call: PluginCall) {
        val pin = call.getString("pin") ?: ""
        val currentPin = call.getString("currentPin")

        // If a PIN is already configured and currentPin is provided, verify it first
        if (CryptoManager.isPinConfigured(context) && currentPin != null) {
            if (!CryptoManager.verifyPin(context, currentPin)) {
                call.resolve(JSObject().apply {
                    put("success", false)
                    put("error", "Invalid current PIN")
                })
                return
            }
        }

        val success = CryptoManager.setMasterPin(context, pin)
        val ret = JSObject().apply {
            put("success", success)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun getPinLength(call: PluginCall) {
        val length = CryptoManager.getStoredPinLength(context)
        val ret = JSObject().apply {
            put("pinLength", length)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun verifyMasterPin(call: PluginCall) {
        val pin = call.getString("pin") ?: ""
        val success = CryptoManager.verifyPin(context, pin)
        val remainingLockout = CryptoManager.getRemainingLockoutSeconds(context)
        val ret = JSObject().apply {
            put("success", success)
            put("lockoutSeconds", remainingLockout)
        }
        call.resolve(ret)
    }

    // ==========================================
    // 100% LOCAL-FIRST RECOVERY PLUGIN METHODS
    // ==========================================

    @PluginMethod
    fun isBiometricAvailable(call: PluginCall) {
        val bm = BiometricManager.from(context)
        val canAuth = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.BIOMETRIC_WEAK)
        val isAvailable = canAuth == BiometricManager.BIOMETRIC_SUCCESS
        val isEnrolled = canAuth != BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED && canAuth != BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE

        val ret = JSObject().apply {
            put("available", isAvailable)
            put("enrolled", isEnrolled)
            put("canAuthenticate", isAvailable)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun authenticateBiometric(call: PluginCall) {
        val activity = this.activity
        if (activity !is FragmentActivity) {
            call.resolve(JSObject().apply {
                put("success", false)
                put("error", "Host activity does not support BiometricPrompt")
            })
            return
        }

        activity.runOnUiThread {
            try {
                val executor = ContextCompat.getMainExecutor(context)
                val prompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        super.onAuthenticationSucceeded(result)
                        // NATIVE IN-MEMORY AUTHORIZATION (Zero JS token leakage)
                        CryptoManager.authorizeRecovery(CryptoManager.RecoveryMethod.BIOMETRIC)
                        call.resolve(JSObject().apply { put("success", true) })
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        super.onAuthenticationError(errorCode, errString)
                        call.resolve(JSObject().apply {
                            put("success", false)
                            put("error", errString.toString())
                            put("errorCode", errorCode)
                        })
                    }

                    override fun onAuthenticationFailed() {
                        super.onAuthenticationFailed()
                        // Biometric system handles prompt retries natively
                    }
                })

                val promptInfo = BiometricPrompt.PromptInfo.Builder()
                    .setTitle("HRTA SECURE SYSTEM")
                    .setSubtitle("Verify identity to authorize Master PIN reset")
                    .setNegativeButtonText("Cancel")
                    .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.BIOMETRIC_WEAK)
                    .build()

                prompt.authenticate(promptInfo)
            } catch (e: Exception) {
                call.resolve(JSObject().apply {
                    put("success", false)
                    put("error", e.message ?: "Biometric prompt exception")
                })
            }
        }
    }

    @PluginMethod
    fun isRecoveryKeyConfigured(call: PluginCall) {
        val configured = CryptoManager.isRecoveryKeyConfigured(context)
        call.resolve(JSObject().apply { put("configured", configured) })
    }

    @PluginMethod
    fun generateRecoveryKey(call: PluginCall) {
        val key = CryptoManager.generateRecoveryKey(context)
        if (key != null) {
            call.resolve(JSObject().apply {
                put("success", true)
                put("key", key)
            })
        } else {
            call.resolve(JSObject().apply {
                put("success", false)
                put("error", "Secure storage unavailable: could not generate recovery key")
            })
        }
    }

    @PluginMethod
    fun verifyRecoveryKey(call: PluginCall) {
        val key = call.getString("key") ?: ""
        val isValid = CryptoManager.verifyRecoveryKey(context, key)
        val remainingLockout = CryptoManager.getRemainingRecoveryLockoutSeconds(context)

        call.resolve(JSObject().apply {
            put("success", isValid)
            put("lockoutSeconds", remainingLockout)
        })
    }

    @PluginMethod
    fun resetPinAfterRecovery(call: PluginCall) {
        val newPin = call.getString("newPin") ?: ""
        val (success, newKey) = CryptoManager.resetPinAfterRecovery(context, newPin)

        val ret = JSObject().apply {
            put("success", success)
            if (newKey != null) {
                put("newRecoveryKey", newKey)
            }
        }
        call.resolve(ret)
    }

    // ==========================================
    // CONFIGURATION & SERVICE CONTROLS
    // ==========================================

    @PluginMethod
    fun saveLockConfig(call: PluginCall) {
        val pin = call.getString("pin")
        if (CryptoManager.isPinConfigured(context) && pin != null) {
            if (!CryptoManager.verifyPin(context, pin)) {
                call.resolve(JSObject().apply {
                    put("success", false)
                    put("error", "Invalid authorization PIN")
                })
                return
            }
        }

        val protectionActive = call.getBoolean("protectionActive") ?: true
        val relockBehavior = call.getString("relockBehavior") ?: "TIMEOUT_1_MIN"
        val hapticsEnabled = call.getBoolean("hapticsEnabled") ?: true
        val stealthMode = call.getBoolean("stealthMode") ?: false

        val committed = getPrefs().edit()
            .putBoolean("protection_active", protectionActive)
            .putString("relock_behavior", relockBehavior)
            .putBoolean("haptics_enabled", hapticsEnabled)
            .putBoolean("stealth_mode", stealthMode)
            .commit()

        call.resolve(JSObject().apply { put("success", committed) })
    }

    @PluginMethod
    fun getLockConfig(call: PluginCall) {
        val prefs = getPrefs()
        val ret = JSObject().apply {
            put("protectionActive", prefs.getBoolean("protection_active", true))
            put("relockBehavior", prefs.getString("relock_behavior", "TIMEOUT_1_MIN"))
            put("hapticsEnabled", prefs.getBoolean("haptics_enabled", true))
            put("stealthMode", prefs.getBoolean("stealth_mode", false))
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun resetAllData(call: PluginCall) {
        val pin = call.getString("pin") ?: ""
        // Strict Authorization: If a PIN is configured, verify before wiping credentials
        if (CryptoManager.isPinConfigured(context)) {
            val valid = CryptoManager.verifyPin(context, pin)
            if (!valid) {
                call.resolve(JSObject().apply {
                    put("success", false)
                    put("error", "Authentication required: Invalid Master PIN")
                })
                return
            }
        }

        try {
            // 1. Clear cryptographic PIN & recovery credentials from secure hardware store
            CryptoManager.clearPin(context)
            // 2. Clear native preferences & protected package list
            getPrefs().edit().clear().commit()
            // 3. Stop background monitor service
            val intent = Intent(context, AppMonitorService::class.java)
            context.stopService(intent)
            // 4. Clear unlocked session cache
            AppMonitorService.clearUnlockedSessions()

            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.resolve(JSObject().apply {
                put("success", false)
                put("error", e.message)
            })
        }
    }

    @PluginMethod
    fun startMonitoringService(call: PluginCall) {
        getPrefs().edit().putBoolean("protection_active", true).commit()
        val intent = Intent(context, AppMonitorService::class.java).apply {
            action = AppMonitorService.ACTION_UPDATE_STATUS
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
        val ret = JSObject().apply {
            put("success", true)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun stopMonitoringService(call: PluginCall) {
        getPrefs().edit().putBoolean("protection_active", false).commit()
        val intent = Intent(context, AppMonitorService::class.java)
        context.stopService(intent)
        val ret = JSObject().apply {
            put("success", true)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun isServiceRunning(call: PluginCall) {
        val isProtectedActive = getPrefs().getBoolean("protection_active", true)
        val ret = JSObject().apply {
            put("running", AppMonitorService.isRunning && isProtectedActive)
            put("protectionActive", isProtectedActive)
        }
        call.resolve(ret)
    }

    /**
     * Authorizes package unlock.
     * STRICT REQUIREMENT: Web layer CANNOT arbitrarily unlock packages.
     * If a PIN is configured, it must be verified natively before unlocking.
     */
    @PluginMethod
    fun requestUnlock(call: PluginCall) {
        val pkg = call.getString("packageName") ?: ""
        val pin = call.getString("pin") ?: ""

        if (pkg.isEmpty()) {
            call.resolve(JSObject().apply {
                put("success", false)
                put("error", "Package name required")
            })
            return
        }

        if (CryptoManager.isPinConfigured(context)) {
            val valid = CryptoManager.verifyPin(context, pin)
            if (!valid) {
                call.resolve(JSObject().apply {
                    put("success", false)
                    put("error", "Invalid authorization PIN")
                })
                return
            }
        }

        AppMonitorService.markPackageUnlocked(pkg)
        call.resolve(JSObject().apply { put("success", true) })
    }
}
