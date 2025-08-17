'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, AlertCircle, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pushNotifications } from '@/lib/push-notifications';
import { useToast } from '@/hooks/use-toast';

interface EnhancedPushNotificationsProps {
  userId: string;
  className?: string;
}

interface BrowserSupport {
  isSupported: boolean;
  browserName: string;
  supportLevel: 'full' | 'partial' | 'none' | 'fallback';
  reason?: string;
  fallbackMethods: string[];
  recommendedBrowsers: string[];
}

export function EnhancedPushNotifications({ userId, className }: EnhancedPushNotificationsProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [browserSupport, setBrowserSupport] = useState<BrowserSupport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    initializeNotifications();
  }, [userId]);

  const initializeNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize the push notification service
      const initialized = await pushNotifications.initialize();
      setIsInitialized(true);

      // Get browser support information
      const support = pushNotifications.getBrowserSupport();
      setBrowserSupport(support);

      // Check if notifications are currently enabled
      const enabled = pushNotifications.isEnabled();
      setIsEnabled(enabled);

      console.log('📱 Push notifications initialized:', {
        initialized,
        support,
        enabled
      });

    } catch (err) {
      console.error('Failed to initialize push notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!browserSupport) {
      await initializeNotifications();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const newState = await pushNotifications.toggle(!isEnabled, userId);
      setIsEnabled(newState);

      if (newState) {
        toast({
          title: "Notifications Enabled",
          description: getBrowserSpecificMessage('enabled'),
          duration: 5000,
        });
      } else {
        toast({
          title: "Notifications Disabled",
          description: "You won't receive push notifications anymore.",
          duration: 3000,
        });
      }

    } catch (err) {
      console.error('Failed to toggle notifications:', err);
      const errorInfo = pushNotifications.getDetailedErrorInfo(err as Error);
      
      setError(errorInfo.message);
      toast({
        title: "Notification Setup Failed",
        description: errorInfo.solution,
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetrySetup = async () => {
    setRetryCount(prev => prev + 1);
    await initializeNotifications();
  };

  const getBrowserSpecificMessage = (action: 'enabled' | 'disabled'): string => {
    if (!browserSupport) return '';

    if (action === 'enabled') {
      switch (browserSupport.supportLevel) {
        case 'full':
          return `Push notifications are fully enabled in ${browserSupport.browserName}.`;
        case 'partial':
          return `Notifications enabled with fallback methods in ${browserSupport.browserName}.`;
        case 'fallback':
          return `Using alternative notification methods in ${browserSupport.browserName}.`;
        default:
          return 'Alternative notification methods are active.';
      }
    }

    return 'Push notifications have been disabled.';
  };

  const openInRecommendedBrowser = () => {
    const currentUrl = window.location.href;
    const intentUrl = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;end`;
    
    // Try to open in Chrome on Android
    if (navigator.userAgent.includes('Android')) {
      window.open(intentUrl, '_blank');
    } else {
      // For other platforms, show instructions
      toast({
        title: "Open in Supported Browser",
        description: "Please copy this URL and open it in Chrome, Firefox, or Edge for better notification support.",
        duration: 10000,
      });
    }
  };

  const renderSupportLevel = () => {
    if (!browserSupport) return null;

    const { supportLevel, browserName, reason, fallbackMethods, recommendedBrowsers } = browserSupport;

    const getSupportIcon = () => {
      switch (supportLevel) {
        case 'full':
          return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'partial':
        case 'fallback':
          return <AlertCircle className="h-5 w-5 text-yellow-500" />;
        default:
          return <AlertCircle className="h-5 w-5 text-red-500" />;
      }
    };

    const getSupportColor = () => {
      switch (supportLevel) {
        case 'full':
          return 'text-green-700 bg-green-50 border-green-200';
        case 'partial':
        case 'fallback':
          return 'text-yellow-700 bg-yellow-50 border-yellow-200';
        default:
          return 'text-red-700 bg-red-50 border-red-200';
      }
    };

    return (
      <div className={`p-4 rounded-lg border ${getSupportColor()}`}>
        <div className="flex items-start space-x-3">
          {getSupportIcon()}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium">
              {browserName} - {supportLevel.charAt(0).toUpperCase() + supportLevel.slice(1)} Support
            </h4>
            <p className="text-sm mt-1">{reason}</p>
            
            {fallbackMethods.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium">Available alternatives:</p>
                <ul className="text-xs mt-1 space-y-1">
                  {fallbackMethods.map((method, index) => (
                    <li key={index} className="flex items-center space-x-1">
                      <span>•</span>
                      <span>{method}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recommendedBrowsers.length > 0 && supportLevel !== 'full' && (
              <div className="mt-3">
                <p className="text-xs font-medium">For best experience, try:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {recommendedBrowsers.map((browser, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-white border"
                    >
                      {browser}
                    </span>
                  ))}
                </div>
                
                {(supportLevel === 'none' || supportLevel === 'fallback') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={openInRecommendedBrowser}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open in Supported Browser
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isInitialized && isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Checking browser compatibility...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <span>Push Notifications</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderSupportLevel()}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleRetrySetup}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Retry Setup {retryCount > 0 && `(${retryCount})`}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isEnabled ? (
              <Bell className="h-5 w-5 text-green-500" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isEnabled ? 'Notifications Enabled' : 'Notifications Disabled'}
              </p>
              <p className="text-xs text-gray-500">
                {isEnabled 
                  ? 'You\'ll receive real-time updates about bakery activities'
                  : 'Enable to get notified about important bakery activities'
                }
              </p>
            </div>
          </div>

          <Button
            onClick={handleToggleNotifications}
            disabled={isLoading}
            variant={isEnabled ? "outline" : "default"}
            size="sm"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : isEnabled ? (
              <BellOff className="h-4 w-4 mr-2" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            {isEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>

        {browserSupport?.supportLevel === 'fallback' && isEnabled && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 <strong>Alternative notifications active:</strong> You'll see in-app notifications 
              and updates will refresh automatically every 30 seconds.
            </p>
          </div>
        )}

        {browserSupport?.supportLevel === 'none' && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-700">
              ⚠️ <strong>Limited notification support:</strong> For the best experience with 
              real-time notifications, please use Chrome, Firefox, or Edge.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EnhancedPushNotifications;