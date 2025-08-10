'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { usePushNotifications } from '@/hooks/use-push-notifications';

interface DebugInfo {
  browserSupport: boolean;
  permission: NotificationPermission;
  serviceWorkerRegistered: boolean;
  vapidConfigured: boolean;
  userAuthenticated: boolean;
  userId?: string;
  userRole?: string;
  pushPreferences?: any;
  subscriptionActive?: boolean;
}

export default function PushNotificationDebugger() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    browserSupport: false,
    permission: 'default',
    serviceWorkerRegistered: false,
    vapidConfigured: false,
    userAuthenticated: false,
  });

  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pushNotifications = usePushNotifications();

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Gather debug information
  useEffect(() => {
    const gatherDebugInfo = async () => {
      const info: DebugInfo = {
        browserSupport: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
        permission: 'Notification' in window ? Notification.permission : 'denied',
        serviceWorkerRegistered: false,
        vapidConfigured: !!process.env.NEXT_PUBLIC_VAPID_KEY,
        userAuthenticated: false,
      };

      // Check service worker
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        info.serviceWorkerRegistered = registrations.length > 0;
      } catch (error) {
        console.error('Error checking service worker:', error);
      }

      // Check user authentication
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user && !error) {
          info.userAuthenticated = true;
          info.userId = user.id;
          info.userRole = user.user_metadata?.role;

          // Check push preferences
          const { data: preferences, error: prefsError } = await supabase
            .from('push_notification_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (preferences && !prefsError) {
            info.pushPreferences = preferences;
            info.subscriptionActive = !!(preferences.endpoint && preferences.enabled);
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      }

      setDebugInfo(info);
    };

    gatherDebugInfo();
  }, []);

  const requestPermission = async () => {
    setLoading(true);
    addTestResult('Requesting notification permission...');
    
    try {
      const permission = await Notification.requestPermission();
      addTestResult(`Permission result: ${permission}`);
      setDebugInfo(prev => ({ ...prev, permission }));
    } catch (error: any) {
      addTestResult(`Permission request failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testServiceWorker = async () => {
    setLoading(true);
    addTestResult('Testing service worker registration...');
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      addTestResult('Service worker registered successfully');
      addTestResult(`SW scope: ${registration.scope}`);
      
      const ready = await navigator.serviceWorker.ready;
      addTestResult(`Service worker is ready: ${ready.active?.scriptURL}`);
      
      setDebugInfo(prev => ({ ...prev, serviceWorkerRegistered: true }));
    } catch (error: any) {
      addTestResult(`Service worker registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testPushSubscription = async () => {
    setLoading(true);
    addTestResult('Testing push subscription...');
    
    try {
      if (!debugInfo.userAuthenticated) {
        addTestResult('Error: User not authenticated');
        return;
      }

      const result = await pushNotifications.toggleNotifications(debugInfo.userId);
      addTestResult(`Push notifications toggled: ${result}`);
      
      // Refresh debug info
      const { data: preferences } = await supabase
        .from('push_notification_preferences')
        .select('*')
        .eq('user_id', debugInfo.userId!)
        .single();

      if (preferences) {
        setDebugInfo(prev => ({ 
          ...prev, 
          pushPreferences: preferences,
          subscriptionActive: !!(preferences.endpoint && preferences.enabled)
        }));
        addTestResult('Subscription data updated');
      }
    } catch (error: any) {
      addTestResult(`Push subscription test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setLoading(true);
    addTestResult('Sending test notification...');
    
    try {
      await pushNotifications.sendTestNotification();
      addTestResult('Test notification sent successfully');
    } catch (error: any) {
      addTestResult(`Test notification failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testServerEndpoint = async () => {
    setLoading(true);
    addTestResult('Testing server push notification endpoint...');
    
    try {
      const response = await fetch('/api/test-push', { method: 'POST' });
      const result = await response.json();
      
      if (response.ok) {
        addTestResult('Server endpoint test successful');
        addTestResult(`Server response: ${result.message}`);
      } else {
        addTestResult(`Server endpoint test failed: ${result.error}`);
      }
    } catch (error: any) {
      addTestResult(`Server endpoint test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Debug Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className={`flex items-center ${debugInfo.browserSupport ? 'text-green-600' : 'text-red-600'}`}>
              <span className="mr-2">{debugInfo.browserSupport ? '✅' : '❌'}</span>
              Browser Support
            </div>
            <div className={`flex items-center ${debugInfo.serviceWorkerRegistered ? 'text-green-600' : 'text-red-600'}`}>
              <span className="mr-2">{debugInfo.serviceWorkerRegistered ? '✅' : '❌'}</span>
              Service Worker Registered
            </div>
            <div className={`flex items-center ${debugInfo.vapidConfigured ? 'text-green-600' : 'text-red-600'}`}>
              <span className="mr-2">{debugInfo.vapidConfigured ? '✅' : '❌'}</span>
              VAPID Key Configured
            </div>
            <div className={`flex items-center ${debugInfo.permission === 'granted' ? 'text-green-600' : 'text-yellow-600'}`}>
              <span className="mr-2">{debugInfo.permission === 'granted' ? '✅' : '⚠️'}</span>
              Permission: {debugInfo.permission}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className={`flex items-center ${debugInfo.userAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
              <span className="mr-2">{debugInfo.userAuthenticated ? '✅' : '❌'}</span>
              User Authenticated
            </div>
            <div className={`flex items-center ${debugInfo.subscriptionActive ? 'text-green-600' : 'text-yellow-600'}`}>
              <span className="mr-2">{debugInfo.subscriptionActive ? '✅' : '⚠️'}</span>
              Push Subscription Active
            </div>
            <div className={`flex items-center ${pushNotifications.isEnabled ? 'text-green-600' : 'text-yellow-600'}`}>
              <span className="mr-2">{pushNotifications.isEnabled ? '✅' : '⚠️'}</span>
              Push Notifications Enabled
            </div>
            <div className={`flex items-center ${pushNotifications.isSupported ? 'text-green-600' : 'text-red-600'}`}>
              <span className="mr-2">{pushNotifications.isSupported ? '✅' : '❌'}</span>
              Push Service Supported
            </div>
          </div>
        </div>

        {debugInfo.userAuthenticated && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <p><strong>User ID:</strong> {debugInfo.userId}</p>
            <p><strong>Role:</strong> {debugInfo.userRole}</p>
            {debugInfo.pushPreferences && (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">Push Preferences</summary>
                <pre className="text-xs mt-2 overflow-x-auto">
                  {JSON.stringify(debugInfo.pushPreferences, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={requestPermission}
            disabled={loading || debugInfo.permission === 'granted'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            Request Permission
          </button>
          
          <button
            onClick={testServiceWorker}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            Test Service Worker
          </button>
          
          <button
            onClick={testPushSubscription}
            disabled={loading || !debugInfo.userAuthenticated}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
          >
            Toggle Subscription
          </button>
          
          <button
            onClick={sendTestNotification}
            disabled={loading || !pushNotifications.isEnabled}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400"
          >
            Send Test Notification
          </button>
          
          <button
            onClick={testServerEndpoint}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
          >
            Test Server Endpoint
          </button>
          
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Results
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Test Results</h2>
        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="text-gray-500">No tests run yet...</div>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="mb-1">{result}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}