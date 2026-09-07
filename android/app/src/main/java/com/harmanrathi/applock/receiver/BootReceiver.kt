package com.harmanrathi.applock.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.harmanrathi.applock.crypto.CryptoManager
import com.harmanrathi.applock.service.AppMonitorService
import com.harmanrathi.applock.util.PermissionHelper

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            val prefs = context.getSharedPreferences("hrta_app_lock_prefs", Context.MODE_PRIVATE)
            val protectionActive = prefs.getBoolean("protection_active", true)
            val isPinConfigured = CryptoManager.isPinConfigured(context)
            val hasUsage = PermissionHelper.hasUsageAccess(context)

            if (!protectionActive || !isPinConfigured || !hasUsage) {
                Log.d("HRTA_BootReceiver", "Boot detected, but protection is paused, unconfigured, or permissions missing. Skipping service start.")
                return
            }

            Log.d("HRTA_BootReceiver", "Boot detected and protection active. Restoring HRTA App Lock Service...")
            val serviceIntent = Intent(context, AppMonitorService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }
    }
}
