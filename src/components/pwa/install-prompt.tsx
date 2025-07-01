'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Download, 
  X, 
  CheckCircle,
  Zap,
  Wifi,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallPromptProps {
  className?: string;
  variant?: 'banner' | 'card' | 'floating';
  autoShow?: boolean;
}

export function InstallPrompt({ 
  className, 
  variant = 'floating',
  autoShow = true 
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  // Check if app is already installed
  useEffect(() => {
    const checkInstalled = () => {
      // Check if running in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://');
      
      setIsInstalled(isStandalone);
      return isStandalone;
    };

    if (checkInstalled()) {
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      setCanInstall(true);
      
      if (autoShow) {
        // Show prompt after a short delay to avoid being intrusive
        setTimeout(() => setIsVisible(true), 2000);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [autoShow]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false);
        setCanInstall(false);
        // Don't set installed here, wait for appinstalled event
      }
    } catch (error) {
      console.error('Install prompt failed:', error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Don't show again for this session
    sessionStorage.setItem('install-prompt-dismissed', 'true');
  };

  // Don't render if already installed or can't install
  if (isInstalled || !canInstall || !isVisible) {
    return null;
  }

  // Check if user already dismissed this session
  if (sessionStorage.getItem('install-prompt-dismissed')) {
    return null;
  }

  const features = [
    { icon: <Wifi className="h-4 w-4" />, text: 'Works offline' },
    { icon: <Zap className="h-4 w-4" />, text: 'Fast & reliable' },
    { icon: <Bell className="h-4 w-4" />, text: 'Push notifications' }
  ];

  if (variant === 'banner') {
    return (
      <div className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 shadow-lg',
        'transform transition-transform duration-300',
        className
      )}>
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Install HomeBake</p>
              <p className="text-xs text-orange-100">Get the app for the best experience</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstall}
              disabled={isInstalling}
              className="bg-white text-orange-600 hover:bg-orange-50 border-orange-200"
            >
              {isInstalling ? 'Installing...' : 'Install'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-white hover:bg-orange-600/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={cn('p-6 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100', className)}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Install HomeBake</h3>
              <p className="text-sm text-gray-600">Get the full app experience</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
              <div className="text-orange-600">
                {feature.icon}
              </div>
              {feature.text}
            </div>
          ))}
        </div>

        <Button
          onClick={handleInstall}
          disabled={isInstalling}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          {isInstalling ? 'Installing...' : 'Install App'}
        </Button>
      </Card>
    );
  }

  // Default floating variant
  return (
    <div className={cn(
      'fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-4 md:w-80',
      'transform transition-all duration-300 ease-out',
      className
    )}>
      <Card className="border-orange-200 bg-white shadow-lg">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Install HomeBake</h4>
                <p className="text-xs text-gray-600">Add to home screen</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {features.map((feature, index) => (
              <Badge key={index} className="text-xs bg-gray-100 text-gray-700">
                <span className="mr-1">{feature.icon}</span>
                {feature.text}
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="flex-1 text-gray-600"
            >
              Not now
            </Button>
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              size="sm"
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Download className="h-4 w-4 mr-1" />
              {isInstalling ? 'Installing...' : 'Install'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Hook for managing install prompt state
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
      return isStandalone;
    };

    if (checkInstalled()) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  };

  return {
    canInstall,
    isInstalled,
    promptInstall
  };
}

// Success component to show after installation
export function InstallSuccess() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <Card className="bg-green-50 border-green-200">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h4 className="font-semibold text-green-900">App Installed!</h4>
              <p className="text-sm text-green-700">HomeBake is now available on your home screen</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}