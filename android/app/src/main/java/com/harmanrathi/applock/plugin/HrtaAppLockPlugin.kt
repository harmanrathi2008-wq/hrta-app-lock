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
import org.json.JSONArray

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
    fun verifyMasterPin(call: PluginCall) {
        val pin = call.getString("pin") ?: ""
        val success = CryptoManager.verifyPin(context, pin)
        val ret = JSObject().apply {
            put("success", success)
        }
        call.resolve(ret)
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
            put("running", true)
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
