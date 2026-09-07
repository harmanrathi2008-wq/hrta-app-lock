# HRTA App Lock

<div align="center">
  <img src="public/assets/hrta_logo.png" alt="HRTA Logo" width="128" height="128" />
  <h3>HRTA SECURE SYSTEM</h3>
  <p><strong>DEVELOPED BY HARMAN RATHI</strong></p>
  <p><em>Harman Rathi Testing Agency</em></p>
</div>

---

## Overview

**HRTA App Lock** is a privacy-first, 100% local-first Android application lock built with **Capacitor**, **React 18**, **TypeScript**, and **Native Android Kotlin**.

The application is engineered to prevent unauthorized access to selected applications on your device using a single, unified, dynamic HRTA-branded security shield.

```
+-------------------------------------+
|              [ HRTA LOGO ]          |
|          HRTA SECURE SYSTEM         |
|        ---------------------        |
|          403 FORBIDDEN              |
|       ACCESS DENIED                 |
|       UNTIL CORRECT PIN ENTERED     |
|       +---------------------+       |
|       |      YouTube        |       |
|       | SECURED BY HRTA     |       |
|       +---------------------+       |
|          ENTER YOUR PIN             |
|          *  *  *  *  o  o          |
|       +----+ +----+ +----+         |
|       | 1  | | 2  | | 3  |         |
|       | 4  | | 5  | | 6  |         |
|       | 7  | | 8  | | 9  |         |
|       | <- | | 0  | | OK |         |
|       +----+ +----+ +----+         |
|       SYSTEM STATUS: PROTECTED      |
|       DEVELOPED BY HARMAN RATHI     |
+-------------------------------------+
```

---

## Key Principles & Architecture

### 1. 100% Local-First & Privacy-First
- **Zero Cloud Infrastructure**: No backend, no Supabase, no Firebase, no Render, no Railway, and no external APIs.
- **Zero Telemetry**: No analytics SDKs, trackers, third-party loggers, or crash beacons.
- **Offline Functionality**: Functions fully when the device is completely disconnected from the Internet or in Airplane Mode.

### 2. Cryptographic PIN Security
- **Never Plaintext**: The master PIN is **never** stored in plain text anywhere (neither in React `localStorage` nor native files).
- **PBKDF2-HMAC-SHA256**: Key derivation uses OWASP-recommended **100,000 iterations** with a 128-bit cryptographically secure random salt (`SecureRandom`).
- **Hardware Keystore with Cryptographic Fallback**: When hardware Keystore support is available on the device, credential verifiers are encrypted with AES-256-GCM via Android Keystore-backed `EncryptedSharedPreferences`. On devices without hardware TEE/StrongBox support, the engine safely falls back to private, sandboxed `SharedPreferences` storing salted PBKDF2-HMAC-SHA256 verifiers (100,000 iterations).
- **Constant-Time Comparison**: Verification utilizes constant-time byte comparisons (`MessageDigest.isEqual`) to prevent timing side-channel attacks.

### 3. Native Android Engine
- **Active App Detection**: Continuously monitors the active foreground task using Android `UsageStatsManager` (`UsageEvents`).
- **Full-Screen Activity Shield**: Displays the HRTA security shield directly over the target application using an optimized full-screen `LockActivity` launched with `FLAG_ACTIVITY_NEW_TASK`, `FLAG_ACTIVITY_NO_ANIMATION`, `FLAG_SECURE`, and `SYSTEM_ALERT_WINDOW` permission (allowing background start over apps on Android 10+ and OEM skins like Samsung One UI).
- **Persistent Service**: Employs an Android Foreground Service with `specialUse` subtype (Android 14+ / API 34 compliance) that pauses polling when protection is deactivated to conserve battery.
- **Boot Recovery**: Restores protection automatically upon device restart via `RECEIVE_BOOT_COMPLETED` broadcast receiver if protection was active.

---

## Required Android Permissions

HRTA App Lock requests **only** the permissions genuinely required for application locking. It does **not** request contacts, SMS, microphone, camera, location, or storage.

| Permission | Purpose | Why It Is Required |
| :--- | :--- | :--- |
| **Usage Access** (`PACKAGE_USAGE_STATS`) | Foreground App Detection | Allows the local monitor to identify when a protected app is brought to the front. |
| **Display over other apps** (`SYSTEM_ALERT_WINDOW`) | Background Launch Authority | Grants HRTA authority to immediately surface the lock activity over target applications from background service. |
| **Foreground Service** (`FOREGROUND_SERVICE`) | Process Keep-Alive | Ensures the security monitor remains active in the background. |
| **Special Use** (`FOREGROUND_SERVICE_SPECIAL_USE`) | Android 14+ Compliance | Declares `App Lock security monitor` subtype in accordance with Android 14 policies. |
| **Post Notifications** (`POST_NOTIFICATIONS`) | Service Notification | Required on Android 13+ to show the persistent "Protection Active" notification. |
| **Run at Startup** (`RECEIVE_BOOT_COMPLETED`) | Boot Recovery | Restores lock monitoring automatically when the device boots up. |
| **Vibrate** (`VIBRATE`) | Tactile Feedback | Provides subtle haptic feedback during PIN keypad entry. |

> **Note on Battery Optimization**:
> Battery optimization exemption is **completely optional**. HRTA works with standard Android foreground services. For aggressive OEM task killers (such as Samsung One UI or Xiaomi MIUI), an in-app guide is provided for setting battery usage to "Unrestricted" if desired.

---

## Limitations of Third-Party Android App Locking

In adherence to security honesty and platform transparency:
1. **OS-Level Boundary**: As a third-party application, HRTA operates within standard Android security boundaries and cannot modify the Linux kernel or system firmware.
2. **Permission Revocation**: If a user has full device administrative control, they can manually revoke Usage Access in system settings or uninstall the app.
3. **Realistic Security Language**: HRTA App Lock is designed to prevent unauthorized access to selected applications. We do not claim the system is "100% unhackable."

---

## Project Structure

```
hrta-app-lock/
├── android/                             # Android native project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml      # Security permissions & service declarations
│   │   │   ├── java/com/harmanrathi/applock/
│   │   │   │   ├── MainActivity.java    # Capacitor bridge host
│   │   │   │   ├── crypto/              # PBKDF2 & Keystore cryptography
│   │   │   │   ├── service/             # AppMonitorService (Foreground Service)
│   │   │   │   ├── receiver/            # BootReceiver
│   │   │   │   ├── ui/                  # Native LockActivity
│   │   │   │   ├── plugin/              # HrtaAppLockPlugin (Capacitor bridge)
│   │   │   │   └── util/                # PermissionHelper & AppListHelper
│   │   │   └── res/                     # Layouts, drawables, launcher icons
│   │   └── build.gradle                 # Kotlin & security-crypto dependencies
├── src/                                 # Local-first React Web UI
│   ├── components/common/               # Header, Footer, Keypad, PinDots
│   ├── pages/
│   │   ├── onboarding/                  # Welcome, PIN Creation, Permissions, App Selection
│   │   ├── dashboard/                   # Control center & status overview
│   │   ├── lockscreen/                  # Unified dynamic lock screen
│   │   └── settings/                    # Relock delays, OEM guide, Security audit
│   ├── services/                        # LocalStorage & NativeBridge IPC
│   ├── types/                           # Strict TypeScript types
│   └── styles/                          # Tailwind CSS & dark security theme
├── tests/                               # Automated Vitest test suite
├── capacitor.config.ts                  # Offline Capacitor configuration
└── package.json
```

---

## Building & Installation

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- Java JDK 17+
- Android SDK (API 34)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Cryptographic Tests
```bash
npm test
```

### 3. Build Web Assets
```bash
npm run build
```

### 4. Sync with Android
```bash
npx cap sync
```

### 5. Build Android APK
Using the Gradle wrapper inside the `android` directory:
```bash
cd android
./gradlew assembleDebug
```
The generated APK will be available at:
`android/app/build/outputs/apk/debug/app-debug.apk`

To build a release APK:
```bash
./gradlew assembleRelease
```

---

## License & Attribution

Copyright © 2026 **Harman Rathi**. All rights reserved.
Developed by **Harman Rathi** under the **HRTA SECURE SYSTEM** brand.
