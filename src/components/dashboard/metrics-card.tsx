import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  isLoading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string;
  };
  className?: string;
  subtitle?: string;
  onClick?: () => void;
  clickable?: boolean;
}

export function MetricsCard({ 
  title, 
  value, 
  icon: Icon, 
  isLoading = false, 
  trend,
  className = '',
  subtitle,
  onClick,
  clickable = false
}: MetricsCardProps) {
  const handleClick = () => {
    if (clickable && onClick && !isLoading) {
      onClick();
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("p-6 relative overflow-hidden", className)}>
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2"></div>
            {subtitle && (
              <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3"></div>
            )}
          </div>
          {Icon && (
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "p-6 transition-all duration-200",
        clickable && "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <span className={cn(
                "text-xs font-medium flex items-center",
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.isPositive ? '↗' : '↘'} {trend.value}%
              </span>
              <span className="text-xs text-gray-500 ml-1">
                vs {trend.period || 'last period'}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "h-8 w-8 text-gray-400 transition-colors",
            clickable && "group-hover:text-gray-600"
          )}>
            <Icon className="h-full w-full" />
          </div>
        )}
      </div>
    </Card>
  );
}
