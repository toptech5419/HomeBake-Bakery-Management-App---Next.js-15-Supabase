'use client';

import { cn } from '@/lib/utils';
import { Loader2, Cookie } from 'lucide-react';
import { motion } from 'framer-motion';

interface PageLoaderProps {
  message?: string;
  variant?: 'default' | 'minimal' | 'bakery';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

export function PageLoader({
  message = 'Loading...',
  variant = 'default',
  size = 'md',
  className,
  fullScreen = true
}: PageLoaderProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const containerClasses = cn(
    "flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100",
    fullScreen ? "fixed inset-0 w-screen h-screen min-h-screen z-50" : "p-8",
    className
  );

  const renderSpinner = () => {
    switch (variant) {
      case 'minimal':
        return (
          <Loader2 className={cn("animate-spin text-orange-500", sizeClasses[size])} />
        );
      
      case 'bakery':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="relative"
          >
            <Cookie className={cn("text-orange-500", sizeClasses[size])} />
          </motion.div>
        );
      
      default:
        return (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <div className={cn(
              "relative flex items-center justify-center",
              "bg-white rounded-full shadow-lg p-4 border border-orange-200"
            )}>
              <Loader2 className={cn("animate-spin text-orange-500", sizeClasses[size])} />
            </div>
            
            {/* Pulsing ring effect */}
            <motion.div
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-orange-300"
            />
          </motion.div>
        );
    }
  };

  return (
    <div className={containerClasses} role="status" aria-live="polite">
      {renderSpinner()}
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="mt-4 text-center"
      >
        <p className="text-orange-600 font-medium text-base sm:text-lg">
          {message}
        </p>
        
        {variant === 'default' && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.5, duration: 2, repeat: Infinity }}
            className="mt-3 h-1 bg-orange-200 rounded-full overflow-hidden max-w-48 mx-auto"
          >
            <div className="h-full bg-orange-500 rounded-full" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// Specialized loading components for different contexts
export function DashboardLoader({ message = "Loading Dashboard..." }: { message?: string }) {
  return <PageLoader message={message} variant="default" size="md" />;
}

export function ModalLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <PageLoader 
      message={message} 
      variant="default" 
      size="md" 
      fullScreen={true}
      className="bg-gradient-to-br from-orange-50 to-amber-50"
    />
  );
}

export function FormLoader({ message = "Processing..." }: { message?: string }) {
  return (
    <PageLoader 
      message={message} 
      variant="default" 
      size="md" 
      fullScreen={true}
      className="bg-gradient-to-br from-green-50 to-emerald-50"
    />
  );
}

export function BakeryLoader({ message = "Preparing fresh data..." }: { message?: string }) {
  return <PageLoader message={message} variant="bakery" size="lg" />;
}

// Inline loader for smaller spaces
export function InlineLoader({ 
  message = "Loading...", 
  size = "sm" 
}: { 
  message?: string; 
  size?: 'sm' | 'md' 
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Loader2 className={cn("animate-spin text-orange-500", {
        "w-4 h-4": size === "sm",
        "w-6 h-6": size === "md"
      })} />
      <span className="text-orange-600 font-medium text-sm">
        {message}
      </span>
    </div>
  );
}

// Skeleton loader for cards and lists
export function SkeletonLoader({ 
  type = "card",
  count = 1 
}: { 
  type?: "card" | "list" | "table";
  count?: number;
}) {
  const renderSkeleton = () => {
    switch (type) {
      case "list":
        return (
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        );
      
      case "table":
        return (
          <div className="space-y-2">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        );
      
      default: // card
        return (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="p-6 bg-white rounded-lg border shadow-sm animate-pulse">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="animate-in fade-in-50 duration-300">
      {renderSkeleton()}
    </div>
  );
}

export default PageLoader;