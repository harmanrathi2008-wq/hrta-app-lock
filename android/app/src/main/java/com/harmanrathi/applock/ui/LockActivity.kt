package com.harmanrathi.applock.ui

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.harmanrathi.applock.R
import com.harmanrathi.applock.crypto.CryptoManager
import com.harmanrathi.applock.service.AppMonitorService

class LockActivity : Activity() {

    private var targetPackage: String = ""
    private var targetAppName: String = "Application"
    private var enteredPin: StringBuilder = StringBuilder()
    private var pinLength: Int = 4
    private var isUnlocked: Boolean = false

    private lateinit var appNameText: TextView
    private lateinit var packageNameText: TextView
    private lateinit var errorText: TextView
    private lateinit var pinDotsContainer: LinearLayout

    companion object {
        const val EXTRA_PACKAGE_NAME = "extra_target_package"
        const val EXTRA_APP_NAME = "extra_target_app_name"

        fun createIntent(context: Context, packageName: String, appName: String): Intent {
            return Intent(context, LockActivity::class.java).apply {
                putExtra(EXTRA_PACKAGE_NAME, packageName)
                putExtra(EXTRA_APP_NAME, appName)
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION
                )
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Prevent screenshot, screen record, and task snapshot theft
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)

        // 2. Real-device wake and overlay flags
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }

        targetPackage = intent.getStringExtra(EXTRA_PACKAGE_NAME) ?: ""
        targetAppName = intent.getStringExtra(EXTRA_APP_NAME) ?: "Application"

        // Fail-closed if target package is absent
        if (targetPackage.isEmpty()) {
            exitToHome()
            return
        }

        // Dynamically load configured PIN length from hardware crypto store
        pinLength = CryptoManager.getStoredPinLength(this)
        if (pinLength != 4 && pinLength != 6) {
            pinLength = 4
        }

        setContentView(R.layout.activity_hrta_lock)

        appNameText = findViewById(R.id.tv_target_app_name)
        packageNameText = findViewById(R.id.tv_target_package)
        errorText = findViewById(R.id.tv_error_message)
        pinDotsContainer = findViewById(R.id.layout_pin_dots)

        appNameText.text = targetAppName
        packageNameText.text = targetPackage

        // Check if currently under cooldown lockout
        val remainingCooldown = CryptoManager.getRemainingLockoutSeconds(this)
        if (remainingCooldown > 0) {
            errorText.text = "Too many attempts. Locked for ${remainingCooldown}s."
            errorText.visibility = View.VISIBLE
        }

        setupKeypad()
        renderPinDots()
    }

    private fun setupKeypad() {
        val digitIds = intArrayOf(
            R.id.btn_num_0, R.id.btn_num_1, R.id.btn_num_2, R.id.btn_num_3,
            R.id.btn_num_4, R.id.btn_num_5, R.id.btn_num_6, R.id.btn_num_7,
            R.id.btn_num_8, R.id.btn_num_9
        )

        for (id in digitIds) {
            findViewById<Button>(id)?.setOnClickListener { v ->
                val digit = (v as Button).text.toString()
                handleDigit(digit)
            }
        }

        findViewById<View>(R.id.btn_backspace)?.setOnClickListener {
            handleBackspace()
        }
    }

    private fun isHapticsEnabled(): Boolean {
        val prefs = getSharedPreferences("hrta_app_lock_prefs", Context.MODE_PRIVATE)
        return prefs.getBoolean("haptics_enabled", true)
    }

    private fun triggerHaptic() {
        if (!isHapticsEnabled()) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator?.vibrate(VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            vibrator?.vibrate(20)
        }
    }

    private fun handleDigit(digit: String) {
        val remainingLockout = CryptoManager.getRemainingLockoutSeconds(this)
        if (remainingLockout > 0) {
            errorText.text = "Too many attempts. Locked for ${remainingLockout}s."
            errorText.visibility = View.VISIBLE
            return
        }

        if (enteredPin.length < pinLength) {
            triggerHaptic()
            enteredPin.append(digit)
            renderPinDots()
            errorText.visibility = View.GONE

            if (enteredPin.length == pinLength) {
                verifyPin()
            }
        }
    }

    private fun handleBackspace() {
        if (enteredPin.isNotEmpty()) {
            triggerHaptic()
            enteredPin.deleteCharAt(enteredPin.length - 1)
            renderPinDots()
            errorText.visibility = View.GONE
        }
    }

    private fun verifyPin() {
        val remainingLockout = CryptoManager.getRemainingLockoutSeconds(this)
        if (remainingLockout > 0) {
            errorText.text = "Too many attempts. Locked for ${remainingLockout}s."
            errorText.visibility = View.VISIBLE
            enteredPin.clear()
            renderPinDots()
            return
        }

        val pin = enteredPin.toString()
        val isValid = CryptoManager.verifyPin(this, pin)
        if (isValid) {
            isUnlocked = true
            CryptoManager.resetFailedAttempts(this)
            AppMonitorService.markPackageUnlocked(targetPackage)
            finish()
            overridePendingTransition(0, 0)
        } else {
            val failedCount = CryptoManager.recordFailedAttempt(this)
            val remainingAttempts = CryptoManager.MAX_ATTEMPTS - failedCount

            if (remainingAttempts <= 0) {
                val cooldownSec = CryptoManager.getRemainingLockoutSeconds(this)
                errorText.text = "Too many failed attempts. Locked for ${cooldownSec}s."
            } else {
                errorText.text = "Access Denied. Incorrect PIN ($remainingAttempts attempts left)."
            }
            errorText.visibility = View.VISIBLE
            enteredPin.clear()
            renderPinDots()

            // Error vibration pattern
            if (isHapticsEnabled() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 80, 50, 80), -1))
            }
        }
    }

    private fun renderPinDots() {
        pinDotsContainer.removeAllViews()
        val currentCount = enteredPin.length
        for (i in 0 until pinLength) {
            val dot = View(this).apply {
                val size = (14 * resources.displayMetrics.density).toInt()
                val margin = (6 * resources.displayMetrics.density).toInt()
                val params = LinearLayout.LayoutParams(size, size).apply {
                    setMargins(margin, 0, margin, 0)
                }
                layoutParams = params
                setBackgroundResource(
                    if (i < currentCount) R.drawable.pin_dot_filled else R.drawable.pin_dot_empty
                )
            }
            pinDotsContainer.addView(dot)
        }
    }

    private fun exitToHome() {
        val homeIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(homeIntent)
        finish()
    }

    override fun onBackPressed() {
        // Pressing back on lock screen exits to Android Home launcher rather than granting access
        exitToHome()
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        // If user triggers Home or Recents gesture while locked, bounce to Home launcher
        if (!isUnlocked) {
            exitToHome()
        }
    }

    override fun onStop() {
        super.onStop()
        if (!isUnlocked) {
            finish()
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            onBackPressed()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }
}
