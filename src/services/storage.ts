import { AppInfo, LockConfig, StoredPinVerifier } from '../types';

const STORAGE_KEYS = {
  PIN_VERIFIER: 'hrta_pin_verifier_v1',
  PROTECTED_PACKAGES: 'hrta_protected_packages_v1',
  LOCK_CONFIG: 'hrta_lock_config_v1',
  ONBOARDING_COMPLETED: 'hrta_onboarding_completed_v1',
};

const DEFAULT_CONFIG: LockConfig = {
  protectionActive: true,
  relockBehavior: 'IMMEDIATELY',
  hapticsEnabled: true,
  stealthMode: false,
  pinLength: 4,
};

// Default sample apps for web preview/simulation when native PackageManager is not connected
export const DEFAULT_MOCK_APPS: AppInfo[] = [
  { packageName: 'com.google.android.youtube', name: 'YouTube', isProtected: true, category: 'Media' },
  { packageName: 'com.whatsapp', name: 'WhatsApp', isProtected: true, category: 'Communication' },
  { packageName: 'com.instagram.android', name: 'Instagram', isProtected: false, category: 'Social' },
  { packageName: 'com.google.android.apps.photos', name: 'Google Photos', isProtected: true, category: 'Media' },
  { packageName: 'com.android.chrome', name: 'Chrome', isProtected: false, category: 'Other' },
  { packageName: 'com.android.settings', name: 'Settings', isProtected: true, category: 'System' },
  { packageName: 'com.google.android.gm', name: 'Gmail', isProtected: true, category: 'Communication' },
  { packageName: 'com.google.android.apps.messaging', name: 'Messages', isProtected: false, category: 'Communication' },
  { packageName: 'com.snapchat.android', name: 'Snapchat', isProtected: false, category: 'Social' },
  { packageName: 'com.google.android.apps.walletnfcrel', name: 'Google Wallet', isProtected: true, category: 'Finance' },
];

export class LocalStorageService {
  /**
   * Retrieves the stored PIN verifier (salt + hash only). Never plaintext.
   */
  static getPinVerifier(): StoredPinVerifier | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PIN_VERIFIER);
      if (!data) return null;
      const parsed = JSON.parse(data) as StoredPinVerifier;
      if (parsed.algorithm !== 'PBKDF2-HMAC-SHA256' || !parsed.saltHex || !parsed.hashHex) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Stores the cryptographic verifier.
   */
  static savePinVerifier(verifier: StoredPinVerifier): void {
    localStorage.setItem(STORAGE_KEYS.PIN_VERIFIER, JSON.stringify(verifier));
  }

  /**
   * Clears PIN verifier (e.g. during master reset).
   */
  static clearPinVerifier(): void {
    localStorage.removeItem(STORAGE_KEYS.PIN_VERIFIER);
  }

  /**
   * Checks whether a PIN has been configured.
   */
  static isPinSet(): boolean {
    return this.getPinVerifier() !== null;
  }

  /**
   * Retrieves list of protected package names.
   */
  static getProtectedPackages(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROTECTED_PACKAGES);
      if (!data) return ['com.google.android.youtube', 'com.whatsapp', 'com.android.settings'];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Saves list of protected package names.
   */
  static saveProtectedPackages(packages: string[]): void {
    localStorage.setItem(STORAGE_KEYS.PROTECTED_PACKAGES, JSON.stringify(packages));
  }

  /**
   * Retrieves lock configuration.
   */
  static getLockConfig(): LockConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOCK_CONFIG);
      if (!data) return DEFAULT_CONFIG;
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Saves lock configuration.
   */
  static saveLockConfig(config: LockConfig): void {
    localStorage.setItem(STORAGE_KEYS.LOCK_CONFIG, JSON.stringify(config));
  }

  /**
   * Checks if onboarding has been completed.
   */
  static isOnboardingCompleted(): boolean {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
  }

  /**
   * Sets onboarding completed state.
   */
  static setOnboardingCompleted(completed: boolean): void {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed ? 'true' : 'false');
  }

  /**
   * Resets all app lock state (local reset).
   */
  static resetAll(): void {
    localStorage.removeItem(STORAGE_KEYS.PIN_VERIFIER);
    localStorage.removeItem(STORAGE_KEYS.PROTECTED_PACKAGES);
    localStorage.removeItem(STORAGE_KEYS.LOCK_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
  }
}