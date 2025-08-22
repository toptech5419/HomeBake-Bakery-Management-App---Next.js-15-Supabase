'use client';

import React from 'react';
import { Bell, BellOff, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { motion, AnimatePresence } from 'framer-motion';
import Switch from 'react-switch';

interface PushNotificationToggleProps {
  userId: string;
  className?: string;
}

export function PushNotificationToggle({ 
  userId, 
  className = ''
}: PushNotificationToggleProps) {
  const {
    isSupported,
    permission,
    isEnabled,
    isLoading,
    error,
    enable,
    disable,
    clearError
  } = usePushNotifications(userId);

  // Get detailed support information
  const supportDetails = isSupported ? null : {
    isSupported: false,
    reason: 'Push notifications are not supported in this browser',
    browserType: 'unknown',
    browserVersion: 'unknown',
    isSecureContext: typeof window !== 'undefined' ? 
      ('isSecureContext' in window ? window.isSecureContext : location.protocol === 'https:') : false,
    hasServiceWorker: typeof window !== 'undefined' ? 'serviceWorker' in navigator : false,
    hasPushManager: typeof window !== 'undefined' ? 'PushManager' in window : false,
    hasNotification: typeof window !== 'undefined' ? 'Notification' in window : false
  };

  // Show not supported message with detailed info
  if (!isSupported) {
    const getHelpText = () => {
      if (!supportDetails?.isSecureContext) {
        return 'This site must be accessed via HTTPS for push notifications to work.';
      }
      if (!supportDetails?.hasServiceWorker) {
        return 'Your browser doesn\'t support Service Workers, which are required for push notifications.';
      }
      if (!supportDetails?.hasPushManager) {
        return 'Your browser doesn\'t support the Push API.';
      }
      if (!supportDetails?.hasNotification) {
        return 'Your browser doesn\'t support the Notifications API.';
      }
      return 'Push notifications aren\'t available in this browser version. Please update to a newer version.';
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 ${className}`}
      >
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-red-50 rounded-xl flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Push Notifications Not Available</h3>
            <p className="text-sm text-gray-600 mb-3">
              {getHelpText()}
            </p>
            
            {/* Technical details for debugging */}
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">Technical Details</summary>
              <div className="mt-2 space-y-1 font-mono">
                <div>HTTPS: {supportDetails?.isSecureContext ? '✅' : '❌'}</div>
                <div>Service Worker: {supportDetails?.hasServiceWorker ? '✅' : '❌'}</div>
                <div>Push Manager: {supportDetails?.hasPushManager ? '✅' : '❌'}</div>
                <div>Notifications: {supportDetails?.hasNotification ? '✅' : '❌'}</div>
                <div>User Agent: {typeof window !== 'undefined' ? window.navigator.userAgent.substring(0, 50) + '...' : 'N/A'}</div>
              </div>
            </details>
            
            {!supportDetails?.isSecureContext && (
              <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  💡 <strong>Tip:</strong> Try accessing this page using <code className="bg-blue-100 px-1 rounded">https://</code> instead of <code className="bg-blue-100 px-1 rounded">http://</code>
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  const handleToggle = async () => {
    if (isEnabled) {
      await disable();
    } else {
      await enable();
    }
  };

  const getStatusText = () => {
    if (permission === 'denied') return 'Permission denied';
    if (isLoading) return isEnabled ? 'Disabling...' : 'Enabling...';
    if (error) return 'Error occurred';
    return isEnabled ? 'Active & Ready' : 'Tap to Enable';
  };

  const getStatusColor = () => {
    if (permission === 'denied') return 'text-red-600';
    if (error) return 'text-orange-600';
    if (isEnabled) return 'text-green-600';
    return 'text-gray-500';
  };
  
  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (permission === 'denied') return <X className="h-4 w-4" />;
    if (error) return <AlertCircle className="h-4 w-4" />;
    if (isEnabled) return <CheckCircle className="h-4 w-4" />;
    return null;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Toggle Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300"
      >
        <div className="flex items-center justify-between">
          {/* Left Side - Icon and Info */}
          <div className="flex items-center space-x-4">
            <motion.div 
              animate={{ 
                backgroundColor: isEnabled ? '#f0fdf4' : '#f9fafb',
                scale: isLoading ? 0.95 : 1
              }}
              className="p-3 rounded-xl transition-all duration-300"
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
              ) : isEnabled ? (
                <Bell className="h-6 w-6 text-green-600" />
              ) : (
                <BellOff className="h-6 w-6 text-gray-400" />
              )}
            </motion.div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">
                Push Notifications
              </h3>
              <div className="flex items-center space-x-2">
                <p className={`text-sm font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </p>
                {getStatusIcon() && (
                  <span className={getStatusColor()}>
                    {getStatusIcon()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Toggle Switch */}
          <Switch
            checked={isEnabled}
            onChange={handleToggle}
            disabled={isLoading || permission === 'denied'}
            onColor="#22c55e"
            offColor="#e5e7eb"
            checkedIcon={false}
            uncheckedIcon={false}
            height={32}
            width={56}
            handleDiameter={24}
            className="react-switch"
            activeBoxShadow="0 0 2px 3px rgba(251, 146, 60, 0.3)"
            boxShadow="0 1px 3px rgba(0, 0, 0, 0.2)"
          />
        </div>
      </motion.div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission Denied Help */}
      <AnimatePresence>
        {permission === 'denied' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Permission Required</p>
                <p className="text-sm text-amber-700 mt-1">
                  Click the bell icon in your browser's address bar and select "Allow"
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {isEnabled && !error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4"
          >
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Notifications Active</p>
                <p className="text-sm text-green-700">
                  You'll receive updates for sales, batches, and important alerts
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}