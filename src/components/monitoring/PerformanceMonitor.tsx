'use client';

import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '@/lib/monitoring/performance';
import { Activity, Clock, Database, Zap } from 'lucide-react';

/**
 * Development Performance Monitor Component
 * Shows real-time performance metrics in development mode
 */
export function PerformanceMonitorWidget() {
  const [isVisible, setIsVisible] = useState(false);
  const [summary, setSummary] = useState({
    averageResponseTime: 0,
    totalMetrics: 0,
    recentActions: []
  });

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    const interval = setInterval(() => {
      setSummary(performanceMonitor.getPerformanceSummary());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Don't render in production
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Performance Monitor"
        aria-label="Toggle performance monitor"
      >
        <Activity className="h-5 w-5" />
      </button>

      {/* Performance Panel */}
      {isVisible && (
        <div className="fixed bottom-20 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              Performance Monitor
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close performance monitor"
            >
              ×
            </button>
          </div>

          {/* Metrics Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Avg Response Time
              </span>
              <span className="text-sm font-medium">
                {Math.round(summary.averageResponseTime)}ms
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Database className="h-3 w-3" />
                Total Metrics
              </span>
              <span className="text-sm font-medium">
                {summary.totalMetrics}
              </span>
            </div>

            {/* Performance Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                summary.averageResponseTime < 100 
                  ? 'bg-green-100 text-green-800' 
                  : summary.averageResponseTime < 300
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {summary.averageResponseTime < 100 ? 'Excellent' : 
                 summary.averageResponseTime < 300 ? 'Good' : 'Needs Attention'}
              </span>
            </div>
          </div>

          {/* Recent Actions */}
          {summary.recentActions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Recent Actions</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {summary.recentActions.slice(0, 5).map((action, index) => (
                  <div key={index} className="text-xs text-gray-600 flex justify-between">
                    <span className="truncate">{action.action}</span>
                    <span className="text-gray-400">
                      {action.duration ? `${Math.round(action.duration)}ms` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}