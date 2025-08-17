'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { simplePushNotifications } from '@/lib/push-notifications/simple';
import { useToast } from '@/hooks/use-toast';

interface SimplePushNotificationsProps {
  userId: string;
  className?: string;
}

export function SimplePushNotifications({ userId, className }: SimplePushNotificationsProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeNotifications();
  }, [userId]);

  const initializeNotifications = async () => {
    try {
      setIsLoading(true);
      await simplePushNotifications.initialize();
      await simplePushNotifications.loadPreferences(userId);
      setIsEnabled(simplePushNotifications.isEnabled());
    } catch (err) {
      console.warn('Push notification initialization failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const newState = await simplePushNotifications.toggle(!isEnabled, userId);
      setIsEnabled(newState);

      if (newState) {
        toast({
          title: "Notifications Enabled",
          description: "You'll receive push notifications about bakery activities.",
          duration: 3000,
        });
      } else {
        toast({
          title: "Notifications Disabled",
          description: "Push notifications have been turned off.",
          duration: 3000,
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle notifications';
      setError(errorMessage);
      
      toast({
        title: "Setup Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    setError(null);
    await initializeNotifications();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <span>Push Notifications</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleRetry}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
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
                {isEnabled ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-xs text-gray-500">
                {isEnabled 
                  ? 'Receiving real-time notifications'
                  : 'Turn on to get notified about activities'
                }
              </p>
            </div>
          </div>

          <Button
            onClick={handleToggle}
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
      </CardContent>
    </Card>
  );
}

export default SimplePushNotifications;