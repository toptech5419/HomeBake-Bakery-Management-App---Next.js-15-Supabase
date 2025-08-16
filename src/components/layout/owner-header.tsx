'use client';

import { Menu, X } from 'lucide-react';
import { useActivities } from '@/hooks/use-live-activities';
import { useNotificationCounter } from '@/hooks/use-notification-counter';
import { NotificationBell } from '@/components/ui/notification-bell';

interface OwnerHeaderProps {
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
  onNotificationClick?: () => void;
}

export function OwnerHeader({ onMobileMenuToggle, isMobileMenuOpen, onNotificationClick }: OwnerHeaderProps) {
  // Use existing live activities system
  const { activities, isLoading } = useActivities({
    pollingInterval: 30000, // 30 seconds
    enablePolling: true
  });

  // Use notification counter hook for unread logic
  const { unreadCount, markAllAsRead, hasNewActivities } = useNotificationCounter({
    activities,
    isLoading
  });

  const handleNotificationClick = () => {
    markAllAsRead();
    
    // Scroll to live activities section if callback is provided
    if (onNotificationClick) {
      onNotificationClick();
    }
    
    console.log('[OwnerHeader] Notifications marked as read, scrolling to live activities');
  };

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-30">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onMobileMenuToggle}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? (
                <X size={20} className="text-gray-600" />
              ) : (
                <Menu size={20} className="text-gray-600" />
              )}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">🍞</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">HomeBake</h1>
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full font-medium">Owner</span>
              </div>
            </div>
          </div>
          <NotificationBell
            unreadCount={unreadCount}
            hasNewActivities={hasNewActivities}
            isLoading={isLoading}
            onClick={handleNotificationClick}
          />
        </div>
      </div>
    </header>
  );
}