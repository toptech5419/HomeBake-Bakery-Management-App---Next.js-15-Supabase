'use client';

import { useEffect, useState } from 'react';
import { useOfflineStatus } from '@/hooks/use-offline';
import { OfflineSync } from '@/lib/offline/sync';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export function OfflineSyncIndicator() {
  const { isOnline } = useOfflineStatus();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [pendingActions, setPendingActions] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Listen to sync status changes
    const unsubscribe = OfflineSync.onStatusChange((status) => {
      if (status.isActive) {
        setSyncStatus('syncing');
        setMessage(`Syncing ${status.progress.completed}/${status.progress.total} items...`);
      } else if (status.progress.failed > 0) {
        setSyncStatus('error');
        setMessage(`${status.progress.failed} items failed to sync`);
      } else if (status.progress.completed > 0) {
        setSyncStatus('success');
        setMessage(`Synced ${status.progress.completed} items successfully`);
        // Reset to idle after 3 seconds
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    });

    // Check pending actions periodically
    const checkPending = async () => {
      const pending = await OfflineSync.isSyncNeeded();
      setPendingActions(pending ? 1 : 0); // Simplified for now
    };

    checkPending();
    const interval = setInterval(checkPending, 10000); // Check every 10 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Don't show anything if online and no pending actions
  if (isOnline && syncStatus === 'idle' && pendingActions === 0) {
    return null;
  }

  const getIcon = () => {
    if (!isOnline) return <CloudOff className="h-4 w-4" />;
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Cloud className="h-4 w-4" />;
    }
  };

  const getColor = () => {
    if (!isOnline) return 'bg-gray-500';
    switch (syncStatus) {
      case 'syncing':
        return 'bg-blue-500';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getMessage = () => {
    if (!isOnline) return 'Offline - Changes will sync when reconnected';
    if (message) return message;
    if (pendingActions > 0) return `${pendingActions} changes pending sync`;
    return 'All changes synced';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-16 right-4 z-50"
      >
        <div className={`${getColor()} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2`}>
          {getIcon()}
          <span className="text-sm font-medium">{getMessage()}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}