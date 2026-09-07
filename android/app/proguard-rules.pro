# HRTA App Lock - ProGuard / R8 Rules
# Keep Capacitor Native Bridge and Plugins
-keep class com.getcapacitor.** { *; }
-keep class com.harmanrathi.applock.plugin.** { *; }
-keep class com.harmanrathi.applock.crypto.** { *; }
-keep class com.harmanrathi.applock.service.** { *; }
-keep class com.harmanrathi.applock.receiver.** { *; }
-keep class com.harmanrathi.applock.ui.** { *; }
-keep class com.harmanrathi.applock.util.** { *; }

# Keep Android Security Crypto & Biometrics
-keep class androidx.security.crypto.** { *; }
-keep class androidx.biometric.** { *; }

# Obfuscate internal implementation while preserving security methods
-repackageclasses
-allowaccessmodification
