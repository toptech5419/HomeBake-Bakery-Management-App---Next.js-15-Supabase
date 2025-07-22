import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: {
    value: string;
    type: 'increase' | 'decrease';
  };
  className?: string;
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
}

export const MetricCard = ({
  title,
  value,
  icon,
  change,
  className,
  color = 'default',
  onClick,
}: MetricCardProps) => {
  const colorClasses = {
    default: 'text-slate-900',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    info: 'text-blue-600',
  };

  return (
    <div
      className={cn(
        'rounded-2xl bg-white p-6 shadow-md transition-all hover:shadow-lg',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={cn('text-2xl font-bold', colorClasses[color])}>
            {value}
          </p>
          {change && (
            <div className="mt-2 flex items-center">
              <span
                className={cn(
                  'text-xs font-medium',
                  change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                )}
              >
                {change.value}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
