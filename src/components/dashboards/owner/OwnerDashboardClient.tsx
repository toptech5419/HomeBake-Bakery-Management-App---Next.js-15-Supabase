'use client';

import React, { useState } from 'react';
import { TrendingUp, Users, Settings, ChevronRight, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { OwnerHeader } from '@/components/layout/owner-header';
import { OwnerSidebar } from '@/components/layout/owner-sidebar';
import { useOwnerDashboard } from '@/hooks/use-owner-dashboard';
import { useReportCounters } from '@/hooks/use-report-counters';
import { useActivities } from '@/hooks/use-live-activities';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { OwnerReportsModal } from '@/components/modals/OwnerReportsModal';
import { PerformanceShiftSelectorModal } from '@/components/modals/PerformanceShiftSelectorModal';
import ActivityNotifications from '@/components/notifications/ActivityNotifications';
import AllNotificationsModal from '@/components/notifications/AllNotificationsModal';
import { usePushNotifications } from '@/hooks/use-push-notifications';

interface OwnerDashboardClientProps {
  user: { id: string; email?: string };
  displayName: string;
}


export default function OwnerDashboardClient({ displayName, user }: OwnerDashboardClientProps) {
  const router = useRouter();
  const { stats, isLoading, error, refetch } = useOwnerDashboard();
  const { totalCount } = useReportCounters();
  const { activities, isLoading: activitiesLoading, refetch: refetchActivities } = useActivities({
    pollingInterval: 30000, // Poll every 30 seconds
    enablePolling: true
  });
  
  // Use the new push notifications hook
  const {
    isEnabled: pushNotificationsEnabled,
    isSupported: pushNotificationsSupported,
    isLoading: pushNotificationsLoading,
    toggleNotifications: handlePushNotificationToggle,
    sendTestNotification
  } = usePushNotifications(user.id);
  
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [performanceModalOpen, setPerformanceModalOpen] = useState(false);


  const handleAddStaffMember = () => {
    router.push('/dashboard/users/invite');
  };

  const handleCheckReports = () => {
    setReportsModalOpen(true);
  };

  const handlePerformanceCheck = () => {
    setPerformanceModalOpen(true);
  };


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

              {/* Live Activity Notifications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Live Activity
                    {activitiesLoading && (
                      <div className="w-4 h-4 border border-orange-300 border-t-orange-600 rounded-full animate-spin"></div>
                    )}
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <ActivityNotifications 
                    activities={activities.slice(0, 3)} 
                    isPreview={true}
                  />
                  
                  {activities.length > 3 && (
                    <button 
                      onClick={() => setShowAllNotifications(true)}
                      className="w-full text-center py-3 text-orange-600 font-medium hover:bg-orange-50 rounded-xl transition-colors border border-orange-200 shadow-sm hover:shadow-md"
                    >
                      View All Notifications ({activities.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Push Notification Toggle */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Settings size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Push Notifications</div>
                        <div className="text-sm text-gray-500">
                          {!pushNotificationsSupported ? 'Not supported in this browser' : 
                           pushNotificationsLoading ? 'Loading...' :
                           'Get real-time alerts'}
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={pushNotificationsEnabled}
                        disabled={!pushNotificationsSupported || pushNotificationsLoading}
                        onChange={() => handlePushNotificationToggle(user.id)}
                      />
                      <div className={`relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${pushNotificationsEnabled ? 'peer-checked:bg-orange-500' : ''} ${(!pushNotificationsSupported || pushNotificationsLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                    </label>
                  </div>
                  
                  {/* Test Notification Button */}
                  {pushNotificationsEnabled && (
                    <button
                      onClick={sendTestNotification}
                      className="w-full py-2 px-4 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors text-sm font-medium border border-orange-200"
                    >
                      🧪 Send Test Notification
                    </button>
                  )}
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
      <AllNotificationsModal
        isOpen={showAllNotifications}
        onClose={() => setShowAllNotifications(false)}
        activities={activities}
        onRefresh={refetchActivities}
        isRefreshing={activitiesLoading}
      />
      
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