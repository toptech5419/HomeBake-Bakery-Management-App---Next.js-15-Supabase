'use client';

import { useState, useEffect } from 'react';
import { Bell, Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface OwnerNotification {
  id: string;
  type: 'sales_rep' | 'manager';
  action: 'sale' | 'batch' | 'report' | 'login' | 'end_shift' | 'created';
  shift: 'morning' | 'night';
  message: string;
  user: string;
  timestamp: string;
  metadata?: { bread_type?: string; quantity?: number };
}

interface OwnerHeaderProps {
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function OwnerHeader({ onMobileMenuToggle, isMobileMenuOpen }: OwnerHeaderProps) {
  const [, setNotifications] = useState<OwnerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const loadNotifications = () => {
      try {
        const stored = localStorage.getItem('owner_notifications');
        const lastViewed = localStorage.getItem('owner_notifications_last_viewed');
        
        if (stored) {
          const parsedNotifications = JSON.parse(stored);
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          
          // Filter out notifications older than 3 days
          const validNotifications = parsedNotifications.filter((notif: OwnerNotification) => 
            new Date(notif.timestamp) > threeDaysAgo
          );
          
          setNotifications(validNotifications);
          
          // Calculate unread count
          if (lastViewed) {
            const lastViewedTime = new Date(lastViewed);
            const unread = validNotifications.filter((notif: OwnerNotification) => 
              new Date(notif.timestamp) > lastViewedTime
            ).length;
            setUnreadCount(unread);
          } else {
            setUnreadCount(validNotifications.length);
          }
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    // Sales logs subscription
    const salesSubscription = supabase
      .channel('owner_sales_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales_logs'
        },
        async (payload) => {
          // Get user and bread type info
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', payload.new.recorded_by)
            .single();

          const { data: breadData } = await supabase
            .from('bread_types')
            .select('name')
            .eq('id', payload.new.bread_type_id)
            .single();

          const newNotification: OwnerNotification = {
            id: `sale_${payload.new.id}`,
            type: 'sales_rep',
            action: 'sale',
            shift: payload.new.shift,
            message: `Sold ${payload.new.quantity} ${breadData?.name || 'items'}`,
            user: userData?.name || 'Sales Rep',
            timestamp: new Date().toISOString(),
            metadata: {
              bread_type: breadData?.name,
              quantity: payload.new.quantity
            }
          };

          addNotification(newNotification);
        }
      )
      .subscribe();

    // Batches subscription
    const batchesSubscription = supabase
      .channel('owner_batch_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'batches'
        },
        async (payload) => {
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', payload.new.created_by)
            .single();

          const { data: breadData } = await supabase
            .from('bread_types')
            .select('name')
            .eq('id', payload.new.bread_type_id)
            .single();

          const newNotification: OwnerNotification = {
            id: `batch_${payload.new.id}`,
            type: 'manager',
            action: 'batch',
            shift: payload.new.shift,
            message: `Started batch: ${payload.new.actual_quantity} ${breadData?.name || 'items'}`,
            user: userData?.name || 'Manager',
            timestamp: new Date().toISOString(),
            metadata: {
              bread_type: breadData?.name,
              quantity: payload.new.actual_quantity
            }
          };

          addNotification(newNotification);
        }
      )
      .subscribe();

    // Shift reports subscription
    const reportsSubscription = supabase
      .channel('owner_report_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shift_reports'
        },
        async (payload) => {
          const { data: userData } = await supabase
            .from('users')
            .select('name, role')
            .eq('id', payload.new.user_id)
            .single();

          const newNotification: OwnerNotification = {
            id: `report_${payload.new.id}`,
            type: userData?.role === 'manager' ? 'manager' : 'sales_rep',
            action: 'report',
            shift: payload.new.shift,
            message: `Generated ${payload.new.shift} shift report`,
            user: userData?.name || 'Staff',
            timestamp: new Date().toISOString()
          };

          addNotification(newNotification);
        }
      )
      .subscribe();

    return () => {
      salesSubscription.unsubscribe();
      batchesSubscription.unsubscribe();
      reportsSubscription.unsubscribe();
    };
  }, []);

  const addNotification = (notification: OwnerNotification) => {
    setNotifications(prev => {
      const updated = [notification, ...prev];
      
      // Keep only last 3 days and max 50 notifications
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const filtered = updated
        .filter(notif => new Date(notif.timestamp) > threeDaysAgo)
        .slice(0, 50);
      
      // Save to localStorage
      localStorage.setItem('owner_notifications', JSON.stringify(filtered));
      
      return filtered;
    });
    
    setUnreadCount(prev => prev + 1);
  };

  const handleNotificationClick = () => {
    // Mark all as read
    setUnreadCount(0);
    localStorage.setItem('owner_notifications_last_viewed', new Date().toISOString());
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
          <div className="relative">
            <button 
              onClick={handleNotificationClick}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
            >
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}