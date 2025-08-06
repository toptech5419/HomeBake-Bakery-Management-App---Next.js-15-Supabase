'use client';

import React, { useState, useEffect } from 'react';
import { Bell, TrendingUp, Users, Settings, X, ChevronRight, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { OwnerHeader } from '@/components/layout/owner-header';
import { OwnerSidebar } from '@/components/layout/owner-sidebar';
import { useOwnerDashboard } from '@/hooks/use-owner-dashboard';
import { useReportCounters } from '@/hooks/use-report-counters';
import { pushNotifications } from '@/lib/push-notifications';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { OwnerReportsModal } from '@/components/modals/OwnerReportsModal';
import { PerformanceShiftSelectorModal } from '@/components/modals/PerformanceShiftSelectorModal';

interface OwnerDashboardClientProps {
  user: { id: string; email?: string };
  displayName: string;
}

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

export default function OwnerDashboardClient({ displayName }: OwnerDashboardClientProps) {
  const router = useRouter();
  const { stats, isLoading, error, refetch } = useOwnerDashboard();
  const { totalCount, isLoading: countersLoading, error: countersError } = useReportCounters();
  
  const [notifications, setNotifications] = useState<OwnerNotification[]>([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [performanceModalOpen, setPerformanceModalOpen] = useState(false);

  // Initialize push notifications
  useEffect(() => {
    pushNotifications.initialize();
    setPushNotificationsEnabled(pushNotifications.isEnabled());
  }, []);

  // Load notifications from localStorage
  useEffect(() => {
    const loadNotifications = () => {
      try {
        const stored = localStorage.getItem('owner_notifications');
        if (stored) {
          const parsedNotifications = JSON.parse(stored);
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          
          const validNotifications = parsedNotifications.filter((notif: OwnerNotification) => 
            new Date(notif.timestamp) > threeDaysAgo
          );
          
          setNotifications(validNotifications);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();
  }, []);

  const handlePushNotificationToggle = () => {
    const newState = pushNotifications.toggleNotifications();
    setPushNotificationsEnabled(newState);
  };

  const handleAddStaffMember = () => {
    router.push('/dashboard/users/invite');
  };

  const handleCheckReports = () => {
    setReportsModalOpen(true);
  };

  const handlePerformanceCheck = () => {
    setPerformanceModalOpen(true);
  };

  const NotificationCard = ({ notification, isPreview = false }: { notification: OwnerNotification; isPreview?: boolean }) => {
    const getGradientClass = () => {
      switch (notification.action) {
        case 'sale':
          return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
        case 'batch':
          return 'bg-gradient-to-r from-blue-50 to-blue-50 border-blue-200';
        case 'report':
          return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
        case 'login':
          return 'bg-gradient-to-r from-purple-50 to-purple-50 border-purple-200';
        case 'end_shift':
          return 'bg-gradient-to-r from-red-50 to-red-50 border-red-200';
        case 'created':
          return 'bg-gradient-to-r from-indigo-50 to-indigo-50 border-indigo-200';
        default:
          return 'bg-gradient-to-r from-gray-50 to-gray-50 border-gray-200';
      }
    };

    const getBadgeClass = () => {
      switch (notification.action) {
        case 'sale':
          return 'bg-green-100 text-green-700';
        case 'batch':
          return 'bg-blue-100 text-blue-700';
        case 'report':
          return 'bg-yellow-100 text-yellow-700';
        case 'login':
          return 'bg-purple-100 text-purple-700';
        case 'end_shift':
          return 'bg-red-100 text-red-700';
        case 'created':
          return 'bg-indigo-100 text-indigo-700';
        default:
          return 'bg-gray-100 text-gray-700';
      }
    };

    const getActionLabel = () => {
      switch (notification.action) {
        case 'sale':
          return 'Sale';
        case 'batch':
          return 'Batch';
        case 'report':
          return 'Report';
        case 'login':
          return 'Login';
        case 'end_shift':
          return 'End Shift';
        case 'created':
          return 'Created';
        default:
          return 'Activity';
      }
    };

    const shiftBadgeClass = notification.shift === 'morning'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-purple-100 text-purple-700';

    return (
      <div className={`${getGradientClass()} border rounded-xl p-3 ${isPreview ? 'mb-2' : 'mb-3'} transition-all duration-300 hover:shadow-md`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex gap-2">
            <span className={`${getBadgeClass()} px-2 py-1 rounded-full text-xs font-medium`}>
              {getActionLabel()}
            </span>
            <span className={`${shiftBadgeClass} px-2 py-1 rounded-full text-xs font-medium`}>
              {notification.shift}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-sm text-gray-700 font-medium mb-1">{notification.message}</p>
        <p className="text-xs text-gray-500">by {notification.user}</p>
      </div>
    );
  };

  const AllNotificationsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">All Notifications</h2>
          <button 
            onClick={() => setShowAllNotifications(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-96">
          {notifications.map(notification => (
            <NotificationCard key={notification.id} notification={notification} />
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Bell size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <OwnerSidebar 
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        displayName={displayName}
      />
      
      {/* Header */}
      <OwnerHeader
        onMobileMenuToggle={() => setSidebarOpen(true)}
        isMobileMenuOpen={sidebarOpen}
      />

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
              {/* Welcome Section */}
              <div className="text-center py-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back! 👋</h2>
                <p className="text-gray-600">Here&apos;s your bakery overview</p>
                {error && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    {error}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrencyNGN(stats.todayRevenue)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Today&apos;s Revenue</div>
                </div>
                <div className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-lg font-bold text-blue-600">{stats.todayBatches}</div>
                  <div className="text-xs text-gray-500 mt-1">Today Batches</div>
                </div>
                <div className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-lg font-bold text-gray-900">
                    {stats.staffOnline}/{stats.staffTotal}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Staff Online</div>
                </div>
                <div className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-lg font-bold text-red-600">{stats.lowStockCount}</div>
                  <div className="text-xs text-gray-500 mt-1">Low Stock</div>
                </div>
              </div>

              {/* Priority Action */}
              <div className="space-y-3">
                <button 
                  onClick={handleAddStaffMember}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-4 flex items-center justify-between group hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <UserPlus size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Add Staff Member</div>
                      <div className="text-sm opacity-90">Invite new team member</div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Management Actions */}
              <div className="space-y-3">
                <button 
                  onClick={handleCheckReports}
                  className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between group hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <TrendingUp size={20} className="text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Check Reports</div>
                      <div className="text-sm text-gray-500">View analytics & insights</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {totalCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium animate-pulse">
                        {totalCount}
                      </span>
                    )}
                    <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                <button 
                  onClick={handlePerformanceCheck}
                  className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between group hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Users size={20} className="text-green-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Performance Check</div>
                      <div className="text-sm text-gray-500">Monitor team efficiency</div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Live Notifications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Live Activity
                  </h3>
                </div>
                
                <div className="space-y-2">
                  {notifications.slice(0, 3).map(notification => (
                    <NotificationCard key={notification.id} notification={notification} isPreview={true} />
                  ))}
                  
                  {notifications.length === 0 && (
                    <div className="bg-white rounded-xl p-6 text-center text-gray-500 border border-gray-200">
                      <Bell size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="font-medium">No recent activity</p>
                      <p className="text-sm mt-1">Activity will appear here as staff work</p>
                    </div>
                  )}
                  
                  {notifications.length > 3 && (
                    <button 
                      onClick={() => setShowAllNotifications(true)}
                      className="w-full text-center py-3 text-orange-600 font-medium hover:bg-orange-50 rounded-xl transition-colors border border-orange-200 shadow-sm hover:shadow-md"
                    >
                      View All Notifications ({notifications.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Push Notification Toggle */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Settings size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Push Notifications</div>
                      <div className="text-sm text-gray-500">Get real-time alerts</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={pushNotificationsEnabled}
                      onChange={handlePushNotificationToggle}
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              </div>

              {/* Refresh Button */}
              <div className="text-center pt-4">
                <button
                  onClick={refetch}
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                >
                  Refresh Data
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Last updated: {new Date(stats.lastUpdate).toLocaleTimeString()}
                </p>
              </div>
            </div>

      {/* All Notifications Modal */}
      {showAllNotifications && <AllNotificationsModal />}
      
      {/* Reports Modal */}
      <OwnerReportsModal 
        isOpen={reportsModalOpen} 
        onClose={() => setReportsModalOpen(false)} 
      />
      
      {/* Performance Modal */}
      <PerformanceShiftSelectorModal 
        isOpen={performanceModalOpen} 
        onClose={() => setPerformanceModalOpen(false)} 
      />
    </div>
  );
}