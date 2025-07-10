"use client";

import { useState } from 'react';
import type { ProductionEntry } from '@/types';

export function useProduction() {
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [filters, setFilters] = useState<{
    breadType?: string;
    shift?: string;
    date?: string;
  }>({});

  return {
    entries,
    setEntries,
    filters,
    setFilters,
  };
} 