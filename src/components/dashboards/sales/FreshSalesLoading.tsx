'use client';

import { useEffect, useState } from 'react';

// Bulletproof full-screen loading component that covers everything
export function FreshSalesLoading() {
  const [renderKey] = useState(() => `fresh-${Date.now()}-${Math.random()}`);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Prevent any scrolling and ensure full coverage
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      document.documentElement.style.height = '100vh';
      
      // Force reflow
      document.body.offsetHeight;
      
      // Cleanup
      return () => {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        document.body.style.height = '';
        document.documentElement.style.height = '';
      };
    }
  }, []);

  return (
    <>
      {/* Triple-layer coverage to ensure no content shows through */}
      
      {/* Layer 1: Base backdrop */}
      <div 
        className="fixed inset-0 bg-gradient-to-br from-orange-50 to-amber-50 z-[99998]"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          minHeight: '100vh',
          maxHeight: '100vh'
        }}
      />
      
      {/* Layer 2: Secondary coverage */}
      <div 
        className="fixed inset-0 bg-gradient-to-br from-orange-50 to-amber-50 z-[99999]"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          minHeight: '100vh'
        }}
      />
      
      {/* Layer 3: Main content layer */}
      <div 
        key={renderKey}
        className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-orange-50 to-amber-50 z-[100000] flex items-center justify-center"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          minHeight: '100vh',
          isolation: 'isolate'
        }}
      >
        {/* Content centered perfectly */}
        <div className="flex flex-col items-center justify-center text-center px-6 py-8">
          
          {/* Sales Rep Specific Header */}
          <div className="mb-12">
            <div className="w-28 h-28 bg-gradient-to-r from-green-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl transform hover:scale-105 transition-transform">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Sales Rep Dashboard</h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-3">Loading your sales workspace...</p>
            <p className="text-base text-gray-500">Please wait while we prepare your dashboard</p>
          </div>

          {/* Enhanced Loading Animation */}
          <div className="relative mb-10">
            <div className="w-24 h-24 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-r-green-300 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            <div className="absolute inset-2 w-20 h-20 border-2 border-green-100 border-b-green-400 rounded-full animate-spin" style={{animationDuration: '2s'}}></div>
          </div>

          {/* Loading Progress Bar */}
          <div className="w-96 max-w-[90vw] bg-gray-200 rounded-full h-3 mb-6 shadow-inner">
            <div 
              className="bg-gradient-to-r from-green-400 via-green-500 to-green-600 h-3 rounded-full animate-pulse transition-all duration-2000 shadow-sm" 
              style={{
                width: '78%',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            />
          </div>
          
          {/* Status Indicators */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              <span className="text-sm font-medium">Connecting to database...</span>
            </div>
            <div className="text-sm text-gray-500 font-mono opacity-75">
              🔄 Cache-free loading • {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}