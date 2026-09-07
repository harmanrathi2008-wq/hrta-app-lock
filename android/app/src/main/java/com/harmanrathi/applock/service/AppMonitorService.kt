package com.harmanrathi.applock.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.harmanrathi.applock.MainActivity
import com.harmanrathi.applock.R
import com.harmanrathi.applock.ui.LockActivity
import com.harmanrathi.applock.util.PermissionHelper
import java.util.concurrent.ConcurrentHashMap

class AppMonitorService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private var isMonitoring = false
    private var lastForegroundPackage: String? = null

    private lateinit var screenReceiver: BroadcastReceiver

    companion object {
        private const val TAG = "HRTA_AppMonitorService"
        private const val NOTIFICATION_CHANNEL_ID = "hrta_lock_service_channel"
        private const val NOTIFICATION_ID = 8801
        private const val POLL_INTERVAL_MS = 250L

        private val unlockedSessions = ConcurrentHashMap<String, Long>()

        fun markPackageUnlocked(packageName: String) {
            unlockedSessions[packageName] = System.currentTimeMillis()
        }

        fun clearUnlockedSessions() {
            unlockedSessions.clear()
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Initializing HRTA App Lock Background Engine")
        startForegroundNotification()
        registerScreenReceiver()
        startMonitoringLoop()
    }

    private fun startForegroundNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "HRTA App Lock Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps HRTA security shield active locally"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }

        val openAppIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )

        val notification: Notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("HRTA SECURE SYSTEM")
            .setContentText("Protection Active • Developed by Harman Rathi")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    private fun registerScreenReceiver() {
        screenReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == Intent.ACTION_SCREEN_OFF) {
                    Log.d(TAG, "Screen off: clearing temporary unlocked sessions")
                    clearUnlockedSessions()
                }
            }
        }
        val filter = IntentFilter(Intent.ACTION_SCREEN_OFF)
        registerReceiver(screenReceiver, filter)
    }

    private fun startMonitoringLoop() {
        isMonitoring = true
        handler.post(object : Runnable {
            override fun run() {
                if (!isMonitoring) return

                try {
                    checkForegroundApp()
                } catch (e: Exception) {
                    Log.e(TAG, "Monitoring loop tick error", e)
                }

                handler.postDelayed(this, POLL_INTERVAL_MS)
            }
        })
    }

    private fun checkForegroundApp() {
        if (!PermissionHelper.hasUsageAccess(this)) return

        val currentApp = getTopPackageName() ?: return
        if (currentApp == packageName) return // Ignore HRTA App Lock itself

        if (currentApp != lastForegroundPackage) {
            lastForegroundPackage = currentApp
            handleAppSwitch(currentApp)
        }
    }

    private fun handleAppSwitch(packageName: String) {
        val protectedPkgs = getProtectedPackages()
        if (protectedPkgs.contains(packageName)) {
            val unlockTimestamp = unlockedSessions[packageName]
            val isUnlocked = unlockTimestamp != null && (System.currentTimeMillis() - unlockTimestamp < 60000)

            if (!isUnlocked) {
                showLockScreen(packageName)
            }
        }
    }

    private fun showLockScreen(packageName: String) {
        val appName = try {
            val pm = packageManager
            val info = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(info).toString()
        } catch (e: Exception) {
            packageName
        }

        val lockIntent = LockActivity.createIntent(this, packageName, appName)
        startActivity(lockIntent)
    }

    private fun getTopPackageName(): String? {
        val usm = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
        val time = System.currentTimeMillis()
        val usageEvents = usm.queryEvents(time - 1000 * 5, time)
        val event = UsageEvents.Event()

        var lastEventPackage: String? = null
        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED ||
                event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND
            ) {
                lastEventPackage = event.packageName
            }
        }
        return lastEventPackage
    }

    private fun getProtectedPackages(): Set<String> {
        val prefs: SharedPreferences = getSharedPreferences("hrta_app_lock_prefs", Context.MODE_PRIVATE)
        return prefs.getStringSet("protected_packages", emptySet()) ?: emptySet()
    }

    override fun onDestroy() {
        isMonitoring = false
        handler.removeCallbacksAndMessages(null)
        try {
            unregisterReceiver(screenReceiver)
        } catch (ignored: Exception) {}
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
