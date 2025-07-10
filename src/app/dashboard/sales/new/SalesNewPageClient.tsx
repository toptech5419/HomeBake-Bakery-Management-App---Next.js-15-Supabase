"use client";
import { useShift } from '@/hooks/use-shift';
import SalesNewClient from './SalesNewClient';

export default function SalesNewPageClient(props: any) {
  const { shift } = useShift();
  return <SalesNewClient {...props} shift={shift} />;
} 