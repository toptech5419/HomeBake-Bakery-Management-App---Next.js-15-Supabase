import { cn } from '@/lib/utils';
import React from 'react';

interface GridContainerProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    mobile?: 1 | 2 | 3 | 4;
    tablet?: 1 | 2 | 3 | 4;
    desktop?: 1 | 2 | 3 | 4;
  };
}

export const GridContainer = ({ 
  children, 
  className,
  cols = { mobile: 2, tablet: 3, desktop: 4 }
}: GridContainerProps) => {
  const getGridClass = (cols: 1 | 2 | 3 | 4 = 2) => {
    const classes = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
    };
    return classes[cols];
  };

  return (
    <div
      className={cn(
        'grid gap-4',
        getGridClass(cols.mobile),
        `md:${getGridClass(cols.tablet)}`,
        `lg:${getGridClass(cols.desktop)}`,
        className
      )}
    >
      {children}
    </div>
  );
};
