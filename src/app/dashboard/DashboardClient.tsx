'use client';

import { UserRole } from '@/types';

interface DashboardClientProps {
  userRole: UserRole;
  displayName: string;
}

export default function DashboardClient({ userRole, displayName }: DashboardClientProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {displayName}!
          </h1>
          <p className="text-gray-600">
            Manage your bakery operations efficiently
          </p>
        </div>

        {/* Simple Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">Sales</h3>
            <p className="text-gray-600 mb-4">Record sales and manage transactions</p>
            <a href="/dashboard/sales" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Go to Sales
            </a>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">Production</h3>
            <p className="text-gray-600 mb-4">Track production and manage inventory</p>
            <a href="/dashboard/production" className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Go to Production
            </a>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">Reports</h3>
            <p className="text-gray-600 mb-4">View reports and analytics</p>
            <a href="/dashboard/reports" className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
              View Reports
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Ready to start your day</span>
              </div>
              <span className="text-xs text-gray-500">Just now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}