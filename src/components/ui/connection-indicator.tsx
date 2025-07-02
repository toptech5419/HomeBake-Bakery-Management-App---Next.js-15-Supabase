'use client';

import { useConnectionStatus } from '@/hooks/use-realtime-data';
import { Wifi, WifiOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface ConnectionIndicatorProps {
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ConnectionIndicator({ 
  connectionStatus = 'connected', 
  showLabel = true,
  size = 'md',
  className = ''
}: ConnectionIndicatorProps) {
  const isOnline = useConnectionStatus();
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineMessage(true);
      const timer = setTimeout(() => setShowOfflineMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        color: 'text-red-500',
        bg: 'bg-red-50',
        border: 'border-red-200',
        label: 'Offline',
        pulse: false
      };
    }

    switch (connectionStatus) {
      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-yellow-500',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          label: 'Connecting...',
          pulse: true
        };
      case 'connected':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bg: 'bg-green-50',
          border: 'border-green-200',
          label: 'Connected',
          pulse: false
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-orange-500',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          label: 'Disconnected',
          pulse: true
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bg: 'bg-red-50',
          border: 'border-red-200',
          label: 'Error',
          pulse: true
        };
      default:
        return {
          icon: Wifi,
          color: 'text-gray-500',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          label: 'Unknown',
          pulse: false
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'h-6 px-2',
          icon: 'w-3 h-3',
          text: 'text-xs'
        };
      case 'lg':
        return {
          container: 'h-10 px-4',
          icon: 'w-5 h-5',
          text: 'text-sm'
        };
      default:
        return {
          container: 'h-8 px-3',
          icon: 'w-4 h-4',
          text: 'text-xs'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const sizeClasses = getSizeClasses();
  const Icon = statusInfo.icon;

  return (
    <>
      <motion.div
        className={`
          inline-flex items-center gap-2 rounded-full border transition-all duration-200
          ${statusInfo.bg} ${statusInfo.border} ${sizeClasses.container} ${className}
        `}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          <Icon 
            className={`
              ${statusInfo.color} ${sizeClasses.icon}
              ${statusInfo.pulse ? 'animate-pulse' : ''}
              ${connectionStatus === 'connecting' ? 'animate-spin' : ''}
            `}
          />
          
          {connectionStatus === 'connected' && (
            <motion.div
              className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            />
          )}
        </div>

        {showLabel && (
          <span className={`font-medium ${statusInfo.color} ${sizeClasses.text}`}>
            {statusInfo.label}
          </span>
        )}
      </motion.div>

      {/* Offline Toast Message */}
      <AnimatePresence>
        {showOfflineMessage && (
          <motion.div
            className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
          >
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">You're offline</span>
            </div>
            <p className="text-xs mt-1 opacity-90">
              Some features may not work until you reconnect
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Compact version for mobile
export function MobileConnectionIndicator({ connectionStatus }: { connectionStatus?: string }) {
  const isOnline = useConnectionStatus();
  
  if (!isOnline || connectionStatus === 'disconnected' || connectionStatus === 'error') {
    return (
      <motion.div
        className="flex items-center gap-1 px-2 py-1 bg-red-100 border border-red-200 rounded-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <WifiOff className="w-3 h-3 text-red-500" />
        <span className="text-xs text-red-600 font-medium">
          {!isOnline ? 'Offline' : 'Disconnected'}
        </span>
      </motion.div>
    );
  }

  if (connectionStatus === 'connecting') {
    return (
      <motion.div
        className="flex items-center gap-1 px-2 py-1 bg-yellow-100 border border-yellow-200 rounded-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
        <span className="text-xs text-yellow-600 font-medium">Syncing</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex items-center gap-1 px-2 py-1 bg-green-100 border border-green-200 rounded-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      <span className="text-xs text-green-600 font-medium">Live</span>
    </motion.div>
  );
}

// Hook for components that need connection status
export function useConnectionIndicator() {
  const isOnline = useConnectionStatus();
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);

  useEffect(() => {
    if (!isOnline && !lastOnlineTime) {
      setLastOnlineTime(new Date());
    } else if (isOnline && lastOnlineTime) {
      setLastOnlineTime(null);
    }
  }, [isOnline, lastOnlineTime]);

  return {
    isOnline,
    offlineDuration: lastOnlineTime ? Date.now() - lastOnlineTime.getTime() : 0,
    showOfflineWarning: !isOnline && lastOnlineTime && (Date.now() - lastOnlineTime.getTime()) > 30000 // 30 seconds
  };
}