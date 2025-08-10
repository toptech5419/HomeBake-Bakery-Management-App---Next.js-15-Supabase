import PushNotificationDebugger from './PushNotificationDebugger';

export default function DebugPushPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-8 text-center">Push Notification Debugger</h1>
        <PushNotificationDebugger />
      </div>
    </div>
  );
}