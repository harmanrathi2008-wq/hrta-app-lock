import { registerPlugin, Capacitor } from '@capacitor/core';
import { AppInfo, PermissionStatus, LockConfig } from '../types';
import { LocalStorageService, DEFAULT_MOCK_APPS } from './storage';
import { createPinVerifier, verifyPin } from './crypto';

export interface HrtaAppLockPluginInterface {
  getPermissionStatus(): Promise<PermissionStatus>;
  openUsageSettings(): Promise<void>;
  openOverlaySettings(): Promise<void>;
  openBatteryOptimizationSettings(): Promise<void>;
  getInstalledApps(): Promise<{ apps: AppInfo[] }>;
  getProtectedApps(): Promise<{ packages: string[] }>;
  saveProtectedApps(options: { packages: string[]; pin?: string }): Promise<{ success: boolean; count?: number; error?: string }>;
  isPinConfigured(): Promise<{ configured: boolean }>;
  setMasterPin(options: { pin: string; currentPin?: string }): Promise<{ success: boolean; error?: string }>;
  getPinLength(): Promise<{ pinLength: number }>;
  verifyMasterPin(options: { pin: string }): Promise<{ success: boolean; lockoutSeconds?: number }>;
  saveLockConfig(options: Partial<LockConfig> & { pin?: string }): Promise<{ success: boolean; error?: string }>;
  getLockConfig(): Promise<Partial<LockConfig>>;
  resetAllData(options?: { pin?: string }): Promise<{ success: boolean; error?: string }>;
  startMonitoringService(): Promise<{ success: boolean }>;
  stopMonitoringService(): Promise<{ success: boolean }>;
  isServiceRunning(): Promise<{ running: boolean; protectionActive?: boolean }>;
  requestUnlock(options: { packageName: string; pin?: string }): Promise<{ success: boolean; error?: string }>;

  // 100% Local Recovery Methods
  isBiometricAvailable(): Promise<{ available: boolean; enrolled: boolean; canAuthenticate: boolean }>;
  authenticateBiometric(): Promise<{ success: boolean; error?: string; errorCode?: number }>;
  isRecoveryKeyConfigured(): Promise<{ configured: boolean }>;
  generateRecoveryKey(): Promise<{ success: boolean; key?: string; error?: string }>;
  verifyRecoveryKey(options: { key: string }): Promise<{ success: boolean; lockoutSeconds?: number }>;
  resetPinAfterRecovery(options: { newPin: string }): Promise<{ success: boolean; newRecoveryKey?: string }>;
}

export const HrtaAppLockPlugin = registerPlugin<HrtaAppLockPluginInterface>('HrtaAppLock');

/**
 * Universal Native Bridge with automatic Web simulation fallback.
 * Guarantees single-source-of-truth:
 * - In Native Android: Native Keystore is authoritative. PIN verifiers are NEVER saved in localStorage.
 * - In Browser Preview: Uses mock verification to allow full visual testing.
 */
export class NativeBridgeService {
  private static mockMonitoringActive = true;
  private static mockRecoveryKey: string | null = null;
  private static mockRecoveryAuthorized = false;
  private static mockPermissions: PermissionStatus = {
    usageAccess: false,
    overlay: false,
    batteryOptimizationIgnored: false,
  };

  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  static async getPermissionStatus(): Promise<PermissionStatus> {
    if (this.isNative()) {
      try {
        return await HrtaAppLockPlugin.getPermissionStatus();
      } catch (err) {
        console.warn('[HRTA Native Bridge] getPermissionStatus failed:', err);
      }
    }
    return this.mockPermissions;
  }

  static async openUsageSettings(): Promise<void> {
    if (this.isNative()) {
      try {
        await HrtaAppLockPlugin.openUsageSettings();
        return;
      } catch (err) {
        console.warn('[HRTA Native Bridge] openUsageSettings failed:', err);
      }
    }
    this.mockPermissions.usageAccess = true;
  }

  static async openOverlaySettings(): Promise<void> {
    if (this.isNative()) {
      try {
        await HrtaAppLockPlugin.openOverlaySettings();
        return;
      } catch (err) {
        console.warn('[HRTA Native Bridge] openOverlaySettings failed:', err);
      }
    }
    this.mockPermissions.overlay = true;
  }

  static async openBatteryOptimizationSettings(): Promise<void> {
    if (this.isNative()) {
      try {
        await HrtaAppLockPlugin.openBatteryOptimizationSettings();
        return;
      } catch (err) {
        console.warn('[HRTA Native Bridge] openBatteryOptimizationSettings failed:', err);
      }
    }
    this.mockPermissions.batteryOptimizationIgnored = true;
  }

  static async getInstalledApps(): Promise<AppInfo[]> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.getInstalledApps();
        if (res && Array.isArray(res.apps)) {
          const protectedPkgs = new Set(LocalStorageService.getProtectedPackages());
          return res.apps.map(app => ({
            ...app,
            isProtected: protectedPkgs.has(app.packageName),
          }));
        }
      } catch (err) {
        console.warn('[HRTA Native Bridge] getInstalledApps failed:', err);
      }
    }
    const protectedPkgs = new Set(LocalStorageService.getProtectedPackages());
    return DEFAULT_MOCK_APPS.map(app => ({
      ...app,
      isProtected: protectedPkgs.has(app.packageName),
    }));
  }

  static async getProtectedApps(): Promise<string[]> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.getProtectedApps();
        if (res && Array.isArray(res.packages)) {
          return res.packages;
        }
      } catch (err) {
        console.warn('[HRTA Native Bridge] getProtectedApps failed:', err);
      }
    }
    return LocalStorageService.getProtectedPackages();
  }

  static async saveProtectedApps(packages: string[], pin?: string): Promise<boolean> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.saveProtectedApps({ packages, pin });
        if (res && res.success) {
          LocalStorageService.saveProtectedPackages(packages);
          return true;
        }
        console.error('[HRTA Native Bridge] saveProtectedApps native rejected:', res?.error);
        return false;
      } catch (err) {
        console.error('[HRTA Native Bridge] saveProtectedApps failed:', err);
        return false;
      }
    }
    LocalStorageService.saveProtectedPackages(packages);
    return true;
  }

  static async isPinConfigured(): Promise<boolean> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.isPinConfigured();
        return !!res.configured;
      } catch (err) {
        console.error('[HRTA Native Bridge] isPinConfigured failed:', err);
        return false;
      }
    }
    return LocalStorageService.isPinSet();
  }

  static async setMasterPin(pin: string, currentPin?: string): Promise<boolean> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.setMasterPin({ pin, currentPin });
        if (res && res.success) {
          // STRICT SECURITY: Do NOT store PIN verifier in web localStorage on native builds!
          return true;
        }
        console.error('[HRTA Native Bridge] Native setMasterPin rejected:', res?.error);
        return false;
      } catch (err) {
        console.error('[HRTA Native Bridge] Native setMasterPin threw error:', err);
        return false;
      }
    }

    // Web Simulation Mode only:
    try {
      const verifier = await createPinVerifier(pin);
      LocalStorageService.savePinVerifier(verifier);
      return true;
    } catch (e) {
      console.error('[HRTA Native Bridge] Web verifier creation failed:', e);
      return false;
    }
  }

  static async getPinLength(): Promise<number> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.getPinLength();
        if (res && res.pinLength) return res.pinLength;
      } catch (err) {
        console.warn('[HRTA Native Bridge] getPinLength failed:', err);
      }
    }
    const verifier = LocalStorageService.getPinVerifier();
    return verifier?.pinLength || 4;
  }

  static async verifyMasterPin(pin: string): Promise<boolean> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.verifyMasterPin({ pin });
        return !!res?.success;
      } catch (err) {
        console.error('[HRTA Native Bridge] Native verification failed - failing closed:', err);
        return false;
      }
    }
    const verifier = LocalStorageService.getPinVerifier();
    return verifyPin(pin, verifier);
  }

  // ==========================================
  // 100% LOCAL-FIRST RECOVERY BRIDGE METHODS
  // ==========================================

  static async isBiometricAvailable(): Promise<{ available: boolean; enrolled: boolean; canAuthenticate: boolean }> {
    if (this.isNative()) {
      try {
        return await HrtaAppLockPlugin.isBiometricAvailable();
      } catch (err) {
        console.warn('[HRTA Native Bridge] isBiometricAvailable failed:', err);
      }
    }
    return { available: false, enrolled: false, canAuthenticate: false };
  }

  static async authenticateBiometric(): Promise<{ success: boolean; error?: string }> {
    if (this.isNative()) {
      try {
        return await HrtaAppLockPlugin.authenticateBiometric();
      } catch (err) {
        console.error('[HRTA Native Bridge] authenticateBiometric failed:', err);
        return { success: false, error: 'Biometric authentication failed' };
      }
    }
    // Web Preview Simulation
    this.mockRecoveryAuthorized = true;
    return { success: true };
  }

  static async isRecoveryKeyConfigured(): Promise<boolean> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.isRecoveryKeyConfigured();
        return !!res.configured;
      } catch (err) {
        console.warn('[HRTA Native Bridge] isRecoveryKeyConfigured failed:', err);
        return false;
      }
    }
    return !!this.mockRecoveryKey;
  }

  static async generateRecoveryKey(): Promise<{ success: boolean; key?: string }> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.generateRecoveryKey();
        return { success: !!res.success, key: res.key };
      } catch (err) {
        console.error('[HRTA Native Bridge] generateRecoveryKey failed:', err);
        return { success: false };
      }
    }
    // Web Preview Simulation: Generate >= 80 bits entropy formatted key
    const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    let raw = '';
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
      for (let i = 0; i < 16; i++) {
        raw += alphabet[bytes[i] % alphabet.length];
      }
    } else {
      for (let i = 0; i < 16; i++) {
        raw += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
    const mockKey = `HRTA-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
    this.mockRecoveryKey = mockKey;
    return { success: true, key: mockKey };
  }

  static async verifyRecoveryKey(key: string): Promise<{ success: boolean; lockoutSeconds?: number }> {
    if (this.isNative()) {
      try {
        return await HrtaAppLockPlugin.verifyRecoveryKey({ key });
      } catch (err) {
        console.error('[HRTA Native Bridge] verifyRecoveryKey failed:', err);
        return { success: false };
      }
    }
    // Web Preview Simulation
    const normInput = key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^HRTA/, '');
    const normStored = (this.mockRecoveryKey || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^HRTA/, '');
    const valid = normInput.length === 16 && normInput === normStored;
    if (valid) {
      this.mockRecoveryAuthorized = true;
    }
    return { success: valid };
  }

  static async resetPinAfterRecovery(newPin: string): Promise<{ success: boolean; newRecoveryKey?: string }> {
    if (this.isNative()) {
      try {
        return await HrtaAppLockPlugin.resetPinAfterRecovery({ newPin });
      } catch (err) {
        console.error('[HRTA Native Bridge] resetPinAfterRecovery failed:', err);
        return { success: false };
      }
    }
    // Web Preview Simulation
    if (!this.mockRecoveryAuthorized) return { success: false };
    this.mockRecoveryAuthorized = false;
    await this.setMasterPin(newPin);
    const newKeyRes = await this.generateRecoveryKey();
    return { success: true, newRecoveryKey: newKeyRes.key };
  }

  // ==========================================
  // SETTINGS & SERVICE CONTROLS
  // ==========================================

  static async saveLockConfig(config: LockConfig, pin?: string): Promise<boolean> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.saveLockConfig({ ...config, pin });
        if (res && res.success) {
          LocalStorageService.saveLockConfig(config);
          return true;
        }
        console.error('[HRTA Native Bridge] saveLockConfig native returned failure');
        return false;
      } catch (err) {
        console.error('[HRTA Native Bridge] saveLockConfig failed:', err);
        return false;
      }
    }
    LocalStorageService.saveLockConfig(config);
    return true;
  }

  static async resetAllData(pin?: string): Promise<boolean> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.resetAllData({ pin });
        if (res && res.success) {
          LocalStorageService.resetAll();
          return true;
        }
        console.error('[HRTA Native Bridge] resetAllData native returned failure:', res?.error);
        return false;
      } catch (err) {
        console.error('[HRTA Native Bridge] resetAllData failed:', err);
        return false;
      }
    }
    LocalStorageService.resetAll();
    this.mockRecoveryKey = null;
    return true;
  }

  static async startMonitoringService(): Promise<boolean> {
    this.mockMonitoringActive = true;
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.startMonitoringService();
        return !!res.success;
      } catch (err) {
        console.warn('[HRTA Native Bridge] startMonitoringService failed:', err);
      }
    }
    return true;
  }

  static async stopMonitoringService(): Promise<boolean> {
    this.mockMonitoringActive = false;
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.stopMonitoringService();
        return !!res.success;
      } catch (err) {
        console.warn('[HRTA Native Bridge] stopMonitoringService failed:', err);
      }
    }
    return true;
  }

  static async isServiceRunning(): Promise<boolean> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.isServiceRunning();
        return !!res.running;
      } catch (err) {
        console.warn('[HRTA Native Bridge] isServiceRunning failed:', err);
      }
    }
    return this.mockMonitoringActive;
  }

  static async requestUnlock(packageName: string, pin?: string): Promise<boolean> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.requestUnlock({ packageName, pin });
        return !!res.success;
      } catch (err) {
        console.warn('[HRTA Native Bridge] requestUnlock failed:', err);
        return false;
      }
    }
    return true;
  }
}