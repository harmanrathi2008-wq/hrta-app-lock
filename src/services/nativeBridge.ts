import { registerPlugin, Capacitor } from '@capacitor/core';
import { AppInfo, PermissionStatus } from '../types';
import { LocalStorageService, DEFAULT_MOCK_APPS } from './storage';
import { createPinVerifier, verifyPin } from './crypto';

export interface HrtaAppLockPluginInterface {
  getPermissionStatus(): Promise<PermissionStatus>;
  openUsageSettings(): Promise<void>;
  openOverlaySettings(): Promise<void>;
  openBatteryOptimizationSettings(): Promise<void>;
  getInstalledApps(): Promise<{ apps: AppInfo[] }>;
  getProtectedApps(): Promise<{ packages: string[] }>;
  saveProtectedApps(options: { packages: string[] }): Promise<void>;
  isPinConfigured(): Promise<{ configured: boolean }>;
  setMasterPin(options: { pin: string }): Promise<{ success: boolean }>;
  verifyMasterPin(options: { pin: string }): Promise<{ success: boolean }>;
  startMonitoringService(): Promise<{ success: boolean }>;
  stopMonitoringService(): Promise<{ success: boolean }>;
  isServiceRunning(): Promise<{ running: boolean }>;
  requestUnlock(options: { packageName: string }): Promise<{ success: boolean }>;
}

export const HrtaAppLockPlugin = registerPlugin<HrtaAppLockPluginInterface>('HrtaAppLock');

/**
 * Universal Native Bridge with automatic Web simulation fallback.
 * Guarantees zero runtime crashes both inside Android WebView and browser preview.
 */
export class NativeBridgeService {
  private static mockMonitoringActive = true;
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
        console.warn('[HRTA Native Bridge] getPermissionStatus failed, returning fallback:', err);
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
    // Simulate user toggling permission in web preview
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
    // Simulate user toggling permission in web preview
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
        console.warn('[HRTA Native Bridge] getInstalledApps failed, using local list:', err);
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

  static async saveProtectedApps(packages: string[]): Promise<void> {
    LocalStorageService.saveProtectedPackages(packages);
    if (this.isNative()) {
      try {
        await HrtaAppLockPlugin.saveProtectedApps({ packages });
      } catch (err) {
        console.warn('[HRTA Native Bridge] saveProtectedApps failed:', err);
      }
    }
  }

  static async isPinConfigured(): Promise<boolean> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.isPinConfigured();
        return !!res.configured;
      } catch (err) {
        console.warn('[HRTA Native Bridge] isPinConfigured failed:', err);
      }
    }
    return LocalStorageService.isPinSet();
  }

  static async setMasterPin(pin: string): Promise<boolean> {
    // Generate secure PBKDF2 verifier
    const verifier = await createPinVerifier(pin);
    LocalStorageService.savePinVerifier(verifier);

    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.setMasterPin({ pin });
        return !!res.success;
      } catch (err) {
        console.warn('[HRTA Native Bridge] setMasterPin failed:', err);
      }
    }
    return true;
  }

  static async verifyMasterPin(pin: string): Promise<boolean> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.verifyMasterPin({ pin });
        return !!res.success;
      } catch (err) {
        console.warn('[HRTA Native Bridge] verifyMasterPin failed, falling back to local verifier:', err);
      }
    }
    const verifier = LocalStorageService.getPinVerifier();
    return verifyPin(pin, verifier);
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

  static async requestUnlock(packageName: string): Promise<boolean> {
    if (this.isNative()) {
      try {
        const res = await HrtaAppLockPlugin.requestUnlock({ packageName });
        return !!res.success;
      } catch (err) {
        console.warn('[HRTA Native Bridge] requestUnlock failed:', err);
      }
    }
    return true;
  }
}