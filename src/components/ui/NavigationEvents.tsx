'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useNavigationSpinner } from './NavigationSpinnerProvider';

export default function NavigationEvents() {
  const pathname = usePathname();
  const { hide } = useNavigationSpinner();

  useEffect(() => {
    hide();
  }, [pathname, hide]);

  return null;
} 