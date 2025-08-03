'use client';

import { UserRole } from '@/types';
import Link from 'next/link';

interface DashboardClientProps {
  userRole: UserRole;
  displayName: string;
}

export default function DashboardClient({ displayName }: DashboardClientProps) {
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

        {/* Quick Actions for Sales Reps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Primary</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Record Sales</h3>
            <p className="text-gray-600 mb-4 text-sm">Log bread sales and leftover inventory</p>
            <Link href="/dashboard/sales-management" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
              Start Recording
            </Link>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">View Metrics</h3>
            <p className="text-gray-600 mb-4 text-sm">Check your sales performance</p>
            <Link href="/dashboard/sales/metrics" className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm">
              View Performance
            </Link>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Reports</h3>
            <p className="text-gray-600 mb-4 text-sm">View detailed sales reports</p>
            <Link href="/dashboard/reports" className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm">
              View Reports
            </Link>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Production</h3>
            <p className="text-gray-600 mb-4 text-sm">Track production and inventory</p>
            <Link href="/dashboard/production" className="inline-block bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 text-sm">
              View Production
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-600">Ready to record today&apos;s sales</span>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-600">Check your performance metrics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}