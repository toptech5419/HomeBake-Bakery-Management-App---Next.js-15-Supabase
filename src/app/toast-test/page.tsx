'use client';

import { useMobileNotifications, NotificationHelpers } from '@/components/ui/mobile-notifications-fixed';

export default function ToastTestPage() {
  const { showNotification } = useMobileNotifications();

  const testToasts = () => {
    showNotification(NotificationHelpers.success('Login Success', 'Welcome back to HomeBake!'));
    setTimeout(() => showNotification(NotificationHelpers.error('Test Error', 'This is a test error message')), 1000);
    setTimeout(() => showNotification(NotificationHelpers.warning('Warning', 'This is a test warning')), 2000);
    setTimeout(() => showNotification(NotificationHelpers.info('Info', 'This is a test info message')), 3000);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Toast System Test</h1>
      <button 
        onClick={testToasts}
        className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
      >
        Test All Toast Types
      </button>
    </div>
  );
}