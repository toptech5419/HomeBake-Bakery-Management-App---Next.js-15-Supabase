'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Home, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {/* 404 Icon */}
        <div className="mx-auto w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
          <Search className="h-12 w-12 text-orange-600" />
        </div>

        {/* Error Message */}
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved, deleted, or you entered the wrong URL.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button asChild className="w-full bg-orange-600 hover:bg-orange-700">
            <Link href="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          
          <Button variant="outline" onClick={() => window.history.back()} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Help Links */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">Need help?</p>
          <div className="flex flex-col sm:flex-row gap-2 text-sm">
            <Link href="/dashboard/production" className="text-orange-600 hover:text-orange-700">
              Production
            </Link>
            <span className="hidden sm:inline text-gray-300">•</span>
            <Link href="/dashboard/sales" className="text-orange-600 hover:text-orange-700">
              Sales
            </Link>
            <span className="hidden sm:inline text-gray-300">•</span>
            <Link href="/dashboard/inventory" className="text-orange-600 hover:text-orange-700">
              Inventory
            </Link>
            <span className="hidden sm:inline text-gray-300">•</span>
            <Link href="/dashboard/reports" className="text-orange-600 hover:text-orange-700">
              Reports
            </Link>
          </div>
        </div>

        {/* HomeBake Branding */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">HomeBake v1.0</p>
        </div>
      </Card>
    </div>
  );
}