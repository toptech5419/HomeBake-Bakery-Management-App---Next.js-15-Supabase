import { useState } from 'react';
import { ProductionEntry } from '@/lib/validations/production';

export function useProduction() {
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [filters, setFilters] = useState<{ 
    bread_type_id?: string; 
    shift?: 'morning' | 'night';
    date?: string;
  }>({});

  const addEntry = (entry: ProductionEntry) => {
    setEntries(prev => [...prev, entry]);
  };

  const removeEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const clearEntries = () => {
    setEntries([]);
  };

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return {
    entries,
    addEntry,
    removeEntry,
    clearEntries,
    filters,
    updateFilters,
    setFilters,
  };
} 