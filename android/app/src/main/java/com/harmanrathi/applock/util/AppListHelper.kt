package com.harmanrathi.applock.util

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import org.json.JSONArray
import org.json.JSONObject

data class InstalledApp(
    val packageName: String,
    val name: String,
    val isSystemApp: Boolean,
    val category: String
)

object AppListHelper {

    fun getInstalledLaunchableApps(context: Context): List<Map<String, Any>> {
        val pm = context.packageManager
        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }

        val resolveInfos = pm.queryIntentActivities(mainIntent, 0)
        val appList = mutableListOf<Map<String, Any>>()
        val seenPackages = mutableSetOf<String>()

        for (ri in resolveInfos) {
            val pkg = ri.activityInfo.packageName
            // Do not include HRTA App Lock itself in protectable list
            if (pkg == context.packageName || seenPackages.contains(pkg)) {
                continue
            }
            seenPackages.add(pkg)

            val name = ri.loadLabel(pm).toString()
            val isSystem = (ri.activityInfo.applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
            val category = resolveCategory(pkg, name)

            appList.add(
                mapOf(
                    "packageName" to pkg,
                    "name" to name,
                    "systemApp" to isSystem,
                    "category" to category
                )
            )
        }

        return appList.sortedBy { it["name"].toString().lowercase() }
    }

    private fun resolveCategory(pkg: String, name: String): String {
        val lower = pkg.toLowerCase() + " " + name.toLowerCase()
        return when {
            lower.contains("whatsapp") || lower.contains("telegram") || lower.contains("message") || lower.contains("chat") || lower.contains("mail") -> "Communication"
            lower.contains("youtube") || lower.contains("netflix") || lower.contains("spotify") || lower.contains("music") || lower.contains("video") || lower.contains("photo") -> "Media"
            lower.contains("instagram") || lower.contains("facebook") || lower.contains("twitter") || lower.contains("snapchat") || lower.contains("reddit") || lower.contains("tiktok") -> "Social"
            lower.contains("bank") || lower.contains("pay") || lower.contains("wallet") || lower.contains("crypto") || lower.contains("finance") -> "Finance"
            lower.contains("setting") || lower.contains("system") || lower.contains("camera") || lower.contains("file") -> "System"
            else -> "Other"
        }
    }
}
