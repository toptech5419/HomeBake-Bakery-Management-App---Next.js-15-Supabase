import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps {
  children: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function LoadingButton({
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
}: LoadingButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <Button
      onClick={onClick}
      disabled={isDisabled}
      variant={variant}
      size={size}
      type={type}
      className={cn(
        "relative transition-all duration-200",
        isLoading && "cursor-not-allowed",
        className
      )}
      {...props}
    >
      {isLoading && (
        <LoadingSpinner />
      )}
      <div className={cn(
        "flex items-center space-x-2",
        isLoading && "opacity-0"
      )}>
        {Icon && <Icon className="w-4 h-4" />}
        <span>{isLoading && loadingText ? loadingText : children}</span>
      </div>
    </Button>
  );
}
