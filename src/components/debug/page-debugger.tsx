'use client';

import { useEffect, useRef } from 'react';

interface PageDebuggerProps {
  pageName: string;
  componentName?: string;
}

export function PageDebugger({ pageName, componentName }: PageDebuggerProps) {
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const currentTime = Date.now();
    const timeSinceMount = currentTime - mountTime.current;

    console.log(`[PageDebugger] ${pageName}${componentName ? ` - ${componentName}` : ''}:`, {
      renderCount: renderCount.current,
      timeSinceMount: `${timeSinceMount}ms`,
      timestamp: new Date().toISOString(),
    });

    // Warn if too many renders
    if (renderCount.current > 10) {
      console.warn(`[PageDebugger] WARNING: ${pageName} has rendered ${renderCount.current} times!`);
    }

    // Check for memory leaks
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memoryInfo = (performance as any).memory;
      if (memoryInfo) {
        console.log(`[PageDebugger] Memory usage for ${pageName}:`, {
          usedJSHeapSize: `${(memoryInfo.usedJSHeapSize / 1048576).toFixed(2)} MB`,
          totalJSHeapSize: `${(memoryInfo.totalJSHeapSize / 1048576).toFixed(2)} MB`,
          jsHeapSizeLimit: `${(memoryInfo.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
        });
      }
    }

    return () => {
      console.log(`[PageDebugger] ${pageName} unmounting after ${renderCount.current} renders`);
    };
  }, [pageName, componentName]);

  return null;
}