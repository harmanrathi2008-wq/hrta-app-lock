import React, { useState, useEffect } from 'react';
import { AppScreen } from './types';
import { LocalStorageService } from './services/storage';
import { NativeBridgeService } from './services/nativeBridge';
import { WelcomeScreen } from './pages/onboarding/WelcomeScreen';
import { PinCreationScreen } from './pages/onboarding/PinCreationScreen';
import { PermissionScreen } from './pages/onboarding/PermissionScreen';
import { AppSelectionScreen } from './pages/onboarding/AppSelectionScreen';
import { DashboardScreen } from './pages/dashboard/DashboardScreen';
import { LockScreen } from './pages/lockscreen/LockScreen';
import { SettingsScreen } from './pages/settings/SettingsScreen';
import { SecurityPrivacyScreen } from './pages/settings/SecurityPrivacyScreen';
import { OemGuideScreen } from './pages/settings/OemGuideScreen';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('ONBOARDING_WELCOME');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lockTargetApp, setLockTargetApp] = useState<{ name: string; pkg: string }>({
    name: 'YouTube',
    pkg: 'com.google.android.youtube',
  });
  const [isStandaloneLock, setIsStandaloneLock] = useState<boolean>(false);

  useEffect(() => {
    const initializeApp = async () => {
      // Check if URL parameters request a direct lock screen (e.g. from Android native overlay/intent)
      const params = new URLSearchParams(window.location.search);
      const requestedPkg = params.get('lockPackage');
      const requestedName = params.get('appName');

      if (requestedPkg) {
        setLockTargetApp({
          pkg: requestedPkg,
          name: requestedName || requestedPkg,
        });
        setIsStandaloneLock(true);
        setCurrentScreen('LOCK_SCREEN');
        setIsLoading(false);
        return;
      }

      // Check onboarding & PIN status
      const pinConfigured = LocalStorageService.isPinSet();
      const onboardingCompleted = LocalStorageService.isOnboardingCompleted();

      if (!pinConfigured) {
        setCurrentScreen('ONBOARDING_WELCOME');
      } else if (!onboardingCompleted) {
        setCurrentScreen('ONBOARDING_PERMISSIONS');
      } else {
        // Normal startup: check if permissions are intact
        const perms = await NativeBridgeService.getPermissionStatus();
        if (!perms.usageAccess || !perms.overlay) {
          setCurrentScreen('ONBOARDING_PERMISSIONS');
        } else {
          setCurrentScreen('DASHBOARD');
        }
      }
      setIsLoading(false);
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070A10] flex flex-col items-center justify-center select-none">
        <div className="relative w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-[#00F0FF] via-[#0066FF] to-transparent shadow-glow-cyan mb-4 animate-pulse">
          <img
            src="/assets/hrta_logo.png"
            alt="HRTA Logo"
            className="w-full h-full object-contain rounded-full bg-[#070A10] p-0.5"
          />
        </div>
        <p className="text-xs font-mono font-bold tracking-widest text-[#00F0FF] uppercase">
          HRTA SECURE SYSTEM
        </p>
        <p className="text-[10px] font-mono text-[#64748B] mt-1">
          INITIALIZING SECURITY ENGINE...
        </p>
      </div>
    );
  }

  // 1. Onboarding: Welcome
  if (currentScreen === 'ONBOARDING_WELCOME') {
    return <WelcomeScreen onStart={() => setCurrentScreen('ONBOARDING_PIN')} />;
  }

  // 2. Onboarding / Change PIN
  if (currentScreen === 'ONBOARDING_PIN' || currentScreen === 'CHANGE_PIN') {
    return (
      <PinCreationScreen
        isChangePinMode={currentScreen === 'CHANGE_PIN'}
        onPinCreated={() => {
          if (currentScreen === 'CHANGE_PIN') {
            setCurrentScreen('DASHBOARD');
          } else {
            setCurrentScreen('ONBOARDING_PERMISSIONS');
          }
        }}
        onCancel={currentScreen === 'CHANGE_PIN' ? () => setCurrentScreen('DASHBOARD') : undefined}
      />
    );
  }

  // 3. Onboarding: Permissions
  if (currentScreen === 'ONBOARDING_PERMISSIONS') {
    return (
      <PermissionScreen
        onComplete={() => {
          if (LocalStorageService.isOnboardingCompleted()) {
            setCurrentScreen('DASHBOARD');
          } else {
            setCurrentScreen('ONBOARDING_APPS');
          }
        }}
      />
    );
  }

  // 4. Onboarding: Select Apps / Manage Apps
  if (currentScreen === 'ONBOARDING_APPS' || currentScreen === 'MANAGE_APPS') {
    return (
      <AppSelectionScreen
        isManageMode={currentScreen === 'MANAGE_APPS'}
        onSaved={() => {
          LocalStorageService.setOnboardingCompleted(true);
          setCurrentScreen('DASHBOARD');
        }}
        onBack={currentScreen === 'MANAGE_APPS' ? () => setCurrentScreen('DASHBOARD') : undefined}
      />
    );
  }

  // 5. Dynamic Lock Screen
  if (currentScreen === 'LOCK_SCREEN') {
    return (
      <LockScreen
        targetAppName={lockTargetApp.name}
        targetPackageName={lockTargetApp.pkg}
        isStandaloneOverlay={isStandaloneLock}
        onUnlockSuccess={() => {
          if (isStandaloneLock) {
            // If running as overlay activity, finish/exit
            if (typeof window !== 'undefined' && (window as any).AndroidLockInterface) {
              (window as any).AndroidLockInterface.dismissLock();
            }
          }
          setCurrentScreen('DASHBOARD');
        }}
        onEmergencyExit={() => {
          setCurrentScreen('DASHBOARD');
        }}
      />
    );
  }

  // 6. Settings Screen
  if (currentScreen === 'SETTINGS') {
    return (
      <SettingsScreen
        onBack={() => setCurrentScreen('DASHBOARD')}
        onResetApp={() => setCurrentScreen('ONBOARDING_WELCOME')}
      />
    );
  }

  // 7. Security & Privacy Audit Screen
  if (currentScreen === 'SECURITY_PRIVACY') {
    return <SecurityPrivacyScreen onBack={() => setCurrentScreen('DASHBOARD')} />;
  }

  // 8. OEM / Samsung Guide Screen
  if (currentScreen === 'OEM_GUIDE') {
    return <OemGuideScreen onBack={() => setCurrentScreen('DASHBOARD')} />;
  }

  // 9. Main Dashboard Screen
  return (
    <DashboardScreen
      onManageApps={() => setCurrentScreen('MANAGE_APPS')}
      onChangePin={() => setCurrentScreen('CHANGE_PIN')}
      onOpenSettings={() => setCurrentScreen('SETTINGS')}
      onOpenSecurityPrivacy={() => setCurrentScreen('SECURITY_PRIVACY')}
      onOpenOemGuide={() => setCurrentScreen('OEM_GUIDE')}
      onSimulateLock={(name, pkg) => {
        setLockTargetApp({ name, pkg });
        setIsStandaloneLock(false);
        setCurrentScreen('LOCK_SCREEN');
      }}
    />
  );
};