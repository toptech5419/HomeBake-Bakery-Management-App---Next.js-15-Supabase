'use client';

import { Button } from '@/components/ui/button';
import { LucideIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(({
  children,
  isLoading = false,
  loadingText,
  icon: Icon,
  onClick,
  disabled,
  variant = 'default',
  size = 'default',
  className,
  type = 'button',
  ...props
}, ref) => {
  const isDisabled = disabled || isLoading;

  return (
    <Button
      ref={ref}
      onClick={isLoading ? undefined : onClick}
      disabled={isDisabled}
      variant={variant}
      size={size}
      type={type}
      className={cn(
        "relative transition-all duration-200 min-h-[44px] touch-manipulation",
        isLoading && "cursor-not-allowed",
        className
      )}
      {...props}
    >
      <div className={cn(
        "flex items-center justify-center gap-2 transition-opacity duration-200",
        isLoading && "opacity-0"
      )}>
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
        <span className="font-medium">{children}</span>
      </div>
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            <span className="font-medium text-sm">
              {loadingText || 'Loading...'}
            </span>
          </div>
        </div>
      )}
    </Button>
  );
});

LoadingButton.displayName = 'LoadingButton';
