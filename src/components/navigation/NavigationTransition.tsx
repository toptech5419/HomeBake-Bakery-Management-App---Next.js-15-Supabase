'use client';

import React from 'react';
import { FileText, Plus, History, BarChart3 } from 'lucide-react';
import { NavigationTransition } from '@/hooks/use-seamless-navigation';

interface NavigationTransitionProps {
  transition: NavigationTransition;
}

const transitionConfig = {
  'shift-reports': {
    title: 'Generating Shift Reports',
    subtitle: 'Preparing your comprehensive shift analysis...',
    icon: FileText,
    gradient: 'from-green-500 to-emerald-500',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    spinnerColor: 'border-green-500'
  },
  'record-sale': {
    title: 'Recording Sale',
    subtitle: 'Loading sales recording interface...',
    icon: Plus,
    gradient: 'from-blue-500 to-cyan-500', 
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    spinnerColor: 'border-blue-500'
  },
  'all-sales': {
    title: 'Loading Sales History',
    subtitle: 'Fetching your sales records...',
    icon: History,
    gradient: 'from-purple-500 to-violet-500',
    iconBg: 'bg-purple-100', 
    iconColor: 'text-purple-600',
    spinnerColor: 'border-purple-500'
  },
  'reports-history': {
    title: 'Loading Reports',
    subtitle: 'Accessing your reports history...',
    icon: BarChart3,
    gradient: 'from-orange-500 to-red-500',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    spinnerColor: 'border-orange-500'
  },
  'general': {
    title: 'Loading',
    subtitle: 'Please wait...',
    icon: FileText,
    gradient: 'from-gray-500 to-gray-600',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    spinnerColor: 'border-gray-500'
  }
} as const;

export function NavigationTransitionOverlay({ transition }: NavigationTransitionProps) {
  if (!transition.isActive) return null;

  const config = transitionConfig[transition.transitionType];
  const IconComponent = config.icon;

  return (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/80 backdrop-blur-sm z-[70] pointer-events-auto"
      style={{ 
        touchAction: 'none',
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0
      }}
    >
      <div 
        className="bg-white flex flex-col"
        style={{
          width: '100vw',
          height: '100vh',
          minHeight: '100vh',
          maxHeight: '100vh'
        }}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${config.gradient} text-white px-3 sm:px-6 py-4 sm:py-6`}>
          <div className="flex items-center justify-center mb-3 sm:mb-6">
            <div className="bg-white/20 p-2 sm:p-3 md:p-4 rounded-full">
              <IconComponent className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" />
            </div>
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-center">{config.title}</h1>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center items-center px-3 sm:px-6 py-4">
          <div className="relative mb-4 sm:mb-6 md:mb-8">
            <div className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 border-4 ${config.spinnerColor} border-t-transparent rounded-full animate-spin`}></div>
            <div className={`absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 border-4 ${config.spinnerColor.replace('border-', 'border-').replace('-500', '-200')} rounded-full opacity-25`}></div>
          </div>
          <div className="text-center space-y-2 sm:space-y-3 md:space-y-4 max-w-lg px-4">
            <p className="text-gray-700 text-base sm:text-lg md:text-xl font-medium">
              {config.subtitle}
            </p>
            <div className={`${config.iconBg} border border-gray-200 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6`}>
              <p className={`${config.iconColor} text-xs sm:text-sm md:text-base`}>
                This will only take a moment. Please don't close or refresh the page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}