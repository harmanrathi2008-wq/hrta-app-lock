export type RelockBehavior = 'IMMEDIATELY' | 'SCREEN_OFF' | 'TIMEOUT_1_MIN' | 'TIMEOUT_5_MIN';

export interface AppInfo {
  packageName: string;
  name: string;
  isProtected: boolean;
  systemApp?: boolean;
  category?: 'Social' | 'Finance' | 'Communication' | 'Media' | 'System' | 'Other';
  lastUsedTimestamp?: number;
}

export interface PermissionStatus {
  usageAccess: boolean;
  overlay: boolean;
  batteryOptimizationIgnored?: boolean;
}

export interface LockConfig {
  protectionActive: boolean;
  relockBehavior: RelockBehavior;
  hapticsEnabled: boolean;
  stealthMode: boolean;
  pinLength: number;
}

export type AppScreen = 
  | 'ONBOARDING_WELCOME'
  | 'ONBOARDING_PIN'
  | 'ONBOARDING_PERMISSIONS'
  | 'ONBOARDING_APPS'
  | 'DASHBOARD'
  | 'MANAGE_APPS'
  | 'CHANGE_PIN'
  | 'LOCK_SCREEN'
  | 'SETTINGS'
  | 'SECURITY_PRIVACY'
  | 'OEM_GUIDE';

export interface PinVerificationResult {
  success: boolean;
  attemptsRemaining: number;
  cooldownSeconds?: number;
  error?: string;
}

export interface StoredPinVerifier {
  algorithm: 'PBKDF2-HMAC-SHA256';
  iterations: number;
  saltHex: string;
  hashHex: string;
  pinLength: number;
  createdAt: number;
}
