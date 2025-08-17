'use client';

import React, { useState, useEffect } from 'react';

interface ProductionPushNotificationsProps {
  userId: string;
  className?: string;
}

export function ProductionPushNotifications({ userId, className = '' }: ProductionPushNotificationsProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    initializeNotifications();
  }, [userId]);

  const initializeNotifications = async () => {
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        setStatus('error');
        setMessage('Notifications not supported in this browser');
        return;
      }

      // Check current permission status
      const permission = Notification.permission;
      if (permission === 'granted') {
        setIsEnabled(true);
        setStatus('success');
        setMessage('Receiving real-time notifications');
      } else if (permission === 'denied') {
        setIsEnabled(false);
        setStatus('error');
        setMessage('Notifications blocked. Click for help with browser settings');
      } else {
        setIsEnabled(false);
        setStatus('idle');
        setMessage('Turn on to get notified about bakery activities');
      }
    } catch (error) {
      console.warn('Failed to initialize notifications:', error);
      // Don't show error state on initialization failure
      setIsEnabled(false);
      setStatus('idle');
      setMessage('Turn on to get notified about bakery activities');
    }
  };

  const handleToggle = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setMessage('');

      if (!isEnabled) {
        // Enabling notifications
        if (!('Notification' in window)) {
          setStatus('error');
          setMessage('Notifications not supported in this browser');
          return;
        }

        // Request permission
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          // Set success state FIRST before any potentially failing operations
          setIsEnabled(true);
          setStatus('success');
          setMessage('✅ Notifications enabled! You\'ll receive real-time updates');
          
          // Register service worker if available (don't let this fail the whole process)
          if ('serviceWorker' in navigator) {
            try {
              await navigator.serviceWorker.register('/service-worker.js');
            } catch (swError) {
              console.warn('Service worker registration failed:', swError);
              // Don't fail the whole process for this
            }
          }
          
          // Show test notification (don't let this fail the whole process)
          try {
            new Notification('HomeBake', {
              body: 'Push notifications are now enabled!',
              icon: '/icons/icon-192x192.png'
            });
          } catch (notifError) {
            console.warn('Test notification failed:', notifError);
            // Notifications are still enabled, just the test failed
          }
          
        } else if (permission === 'denied') {
          setStatus('error');
          setMessage('❌ Permission denied. Please enable notifications in your browser settings');
        } else {
          setStatus('error');
          setMessage('❌ Permission required. Please allow notifications to continue');
        }
      } else {
        // Disabling notifications
        setIsEnabled(false);
        setStatus('idle');
        setMessage('Notifications disabled');
      }
    } catch (error) {
      // Only show error if we actually failed (not if just test notification failed)
      if (!isEnabled) {
        setStatus('error');
        setMessage('❌ Failed to enable notifications. Please try again');
        console.error('Toggle failed:', error);
      }
      // If isEnabled is true, we succeeded despite the error
    } finally {
      setIsLoading(false);
    }
  };

  const openBrowserSettings = () => {
    setMessage('💡 Go to browser settings → Privacy & Security → Notifications → Allow for this site');
  };

  return (
    <div className={`bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V12a1 1 0 00-1-1H9a1 1 0 00-1 1v5l-5 5 5-5h5z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Push Notifications</h3>
          <p className="text-sm text-gray-500">Real-time bakery updates</p>
        </div>
      </div>

      {/* Toggle Switch */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
            isEnabled ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {isEnabled ? (
              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-xs text-gray-500">
              {isEnabled ? 'Receiving updates' : 'No notifications'}
            </p>
          </div>
        </div>

        {/* iOS Style Toggle Switch */}
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 ${
            isEnabled ? 'bg-orange-500' : 'bg-gray-300'
          }`}
          style={{
            boxShadow: isEnabled ? '0 2px 4px rgba(249, 115, 22, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
              isEnabled ? 'translate-x-7' : 'translate-x-1'
            } ${isLoading ? 'animate-pulse' : ''}`}
          />
        </button>
      </div>

      {/* Status Message */}
      <div className={`p-3 rounded-lg text-sm ${
        status === 'success' ? 'bg-green-50 border border-green-200' :
        status === 'error' ? 'bg-red-50 border border-red-200' :
        'bg-gray-50 border border-gray-200'
      }`}>
        <p className={`${
          status === 'success' ? 'text-green-700' :
          status === 'error' ? 'text-red-700' :
          'text-gray-700'
        }`}>
          {isLoading ? '⏳ Updating...' : message}
        </p>
        
        {/* Error Actions */}
        {status === 'error' && (message.includes('Permission denied') || message.includes('blocked')) && (
          <button
            onClick={openBrowserSettings}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            How to enable in browser settings →
          </button>
        )}
        
        {status === 'error' && !message.includes('not supported') && !message.includes('blocked') && (
          <button
            onClick={() => {
              setStatus('idle');
              setMessage('Turn on to get notified about bakery activities');
              handleToggle();
            }}
            disabled={isLoading}
            className="mt-2 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors disabled:opacity-50"
          >
            Try Again
          </button>
        )}
      </div>

      {/* Success Additional Info */}
      {status === 'success' && isEnabled && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 You'll receive notifications for new sales, production updates, and important bakery activities.
          </p>
        </div>
      )}
    </div>
  );
}

export default ProductionPushNotifications;