'use client';

import { cn } from '@/lib/utils';
import { ReactNode, ElementType } from 'react';

interface TransitionProps {
  children: ReactNode;
  className?: string;
  show?: boolean;
  as?: ElementType;
}

export function FadeIn({ children, className, show = true, as: Component = 'div' }: TransitionProps) {
  return (
    <Component
      className={cn(
        'transition-all duration-300 ease-in-out',
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        className
      )}
    >
      {children}
    </Component>
  );
}

export function SlideIn({ children, className, show = true, as: Component = 'div' }: TransitionProps) {
  return (
    <Component
      className={cn(
        'transition-all duration-300 ease-in-out',
        show ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0',
        className
      )}
    >
      {children}
    </Component>
  );
}

export function ScaleIn({ children, className, show = true, as: Component = 'div' }: TransitionProps) {
  return (
    <Component
      className={cn(
        'transition-all duration-200 ease-in-out',
        show ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        className
      )}
    >
      {children}
    </Component>
  );
}

export function HoverLift({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      'transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg',
      className
    )}>
      {children}
    </div>
  );
}

export function ButtonPressEffect({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      'transition-all duration-100 ease-in-out active:scale-95',
      className
    )}>
      {children}
    </div>
  );
}

// Staggered animation for lists
export function StaggeredList({ 
  children, 
  className,
  delay = 50 
}: { 
  children: ReactNode[]; 
  className?: string;
  delay?: number;
}) {
  return (
    <div className={className}>
      {Array.isArray(children) ? children.map((child, index) => (
        <div
          key={index}
          className="transition-all duration-300 ease-in-out"
          style={{
            animationDelay: `${index * delay}ms`,
            animationFillMode: 'both',
            animationName: 'fadeInUp'
          }}
        >
          {child}
        </div>
      )) : children}
    </div>
  );
}

// Loading shimmer effect
export function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn(
      'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]',
      'animate-[shimmer_1.5s_ease-in-out_infinite]',
      className
    )} />
  );
}

// Smooth page transitions
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      'transition-all duration-300 ease-in-out',
      'animate-in fade-in slide-in-from-bottom-4',
      className
    )}>
      {children}
    </div>
  );
}