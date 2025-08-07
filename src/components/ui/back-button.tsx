"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getNavigationHistory } from '@/lib/utils/navigation-history';

interface BackButtonProps {
  userRole?: string;
  className?: string;
  fallbackPath?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BackButton({ 
  userRole, 
  className = '', 
  fallbackPath,
  showText = true,
  size = 'md'
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // For debugging - let's hardcode owner dashboard navigation
    if (userRole === 'owner') {
      console.log('BackButton: Owner detected, navigating to /owner-dashboard');
      router.push('/owner-dashboard');
      return;
    }
    
    const backPath = getNavigationHistory(userRole) || fallbackPath || '/dashboard';
    console.log('BackButton: userRole =', userRole);
    console.log('BackButton: fallbackPath =', fallbackPath);
    console.log('BackButton: backPath =', backPath);
    console.log('BackButton: navigating to =', backPath);
    router.push(backPath);
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-lg'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={handleBack}
      className={`
        flex items-center gap-2 
        ${sizeClasses[size]}
        bg-white/90 backdrop-blur-sm
        border border-orange-200 
        rounded-lg
        text-gray-700 
        hover:bg-orange-50 
        hover:border-orange-300
        hover:text-orange-700
        transition-all duration-200 
        shadow-sm hover:shadow-md
        focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50
        active:scale-95
        touch-manipulation
        min-h-[44px] min-w-[44px]
        ${className}
      `}
      aria-label="Go back to previous page"
    >
      <ArrowLeft className={iconSizes[size]} />
      {showText && <span className="font-medium">Back</span>}
    </button>
  );
}

export default BackButton;