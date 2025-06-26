'use client';

import Link from 'next/link';
import { useNavigationSpinner } from './NavigationSpinnerProvider';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavigationLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function NavigationLink({ href, children, className }: NavigationLinkProps) {
  const { show } = useNavigationSpinner();
  const pathname = usePathname();
  const isActive = pathname === href;

  const handleClick = () => {
    // Show spinner immediately on click
    show();
  };

  return (
    <Link 
      href={href} 
      className={cn(
        'text-sm font-medium transition-colors hover:text-primary',
        isActive ? 'text-black dark:text-white' : 'text-muted-foreground',
        className
      )} 
      onClick={handleClick}
    >
      {children}
    </Link>
  );
} 