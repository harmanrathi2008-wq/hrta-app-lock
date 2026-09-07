package com.harmanrathi.applock.plugin

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
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

    @PluginMethod
    fun saveProtectedApps(call: PluginCall) {
        val packagesArray = call.getArray("packages")
        val set = mutableSetOf<String>()
        if (packagesArray != null) {
            for (i in 0 until packagesArray.length()) {
                set.add(packagesArray.getString(i))
            }
        }
        getPrefs().edit().putStringSet("protected_packages", set).apply()
        call.resolve()
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
        val ret = JSObject().apply {
            put("success", success)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun saveLockConfig(call: PluginCall) {
        val protectionActive = call.getBoolean("protectionActive") ?: true
        val relockBehavior = call.getString("relockBehavior") ?: "TIMEOUT_1_MIN"
        val hapticsEnabled = call.getBoolean("hapticsEnabled") ?: true
        val stealthMode = call.getBoolean("stealthMode") ?: false

        getPrefs().edit()
            .putBoolean("protection_active", protectionActive)
            .putString("relock_behavior", relockBehavior)
            .putBoolean("haptics_enabled", hapticsEnabled)
            .putBoolean("stealth_mode", stealthMode)
            .apply()

        call.resolve(JSObject().apply { put("success", true) })
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
        try {
            // 1. Clear cryptographic PIN from secure hardware store
            CryptoManager.clearPin(context)
            // 2. Clear native preferences & protected package list
            getPrefs().edit().clear().apply()
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
        val intent = Intent(context, AppMonitorService::class.java)
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
        val intent = Intent(context, AppMonitorService::class.java)
        context.stopService(intent)
        val ret = JSObject().apply {
            put("success", true)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun isServiceRunning(call: PluginCall) {
        val ret = JSObject().apply {
            put("running", AppMonitorService.isRunning)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun requestUnlock(call: PluginCall) {
        val pkg = call.getString("packageName") ?: ""
        if (pkg.isNotEmpty()) {
            AppMonitorService.markPackageUnlocked(pkg)
        }
        val ret = JSObject().apply {
            put("success", true)
        }
        call.resolve(ret)
    }
}
