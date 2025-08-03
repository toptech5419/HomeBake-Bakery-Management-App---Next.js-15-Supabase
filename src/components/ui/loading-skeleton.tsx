'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
    />
  );
}

export function ProductionItemSkeleton() {
  return (
    <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="text-right">
        <Skeleton className="h-5 w-20 mb-1" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function ProductionTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
      <div className="bg-gray-50 px-4 py-4 border-b border-gray-200">
        <Skeleton className="h-5 w-64" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <ProductionItemSkeleton key={index} />
      ))}
    </div>
  );
}