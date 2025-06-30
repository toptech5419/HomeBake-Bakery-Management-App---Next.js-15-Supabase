"use client";
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useCallback } from 'react';

interface BreadType {
  id: string;
  name: string;
}

export default function ProductionHistoryFilters({ breadTypes }: { breadTypes: BreadType[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const handleFilterChange = useCallback((key: string, value: string) => {
    const newParams = new URLSearchParams(params.toString());
    if (value && value !== 'all') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    router.replace(`/dashboard/production/history?${newParams.toString()}`);
  }, [params, router]);

  return (
    <Card className="mb-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1 w-full">
          <Label htmlFor="bread-type">Bread Type</Label>
          <Select defaultValue={params.get('bread_type_id') || 'all'} onValueChange={v => handleFilterChange('bread_type_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder="All bread types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All bread types</SelectItem>
              {breadTypes.map((bread) => (
                <SelectItem key={bread.id} value={bread.id}>
                  {bread.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 w-full">
          <Label htmlFor="shift">Shift</Label>
          <Select defaultValue={params.get('shift') || 'all'} onValueChange={v => handleFilterChange('shift', v)}>
            <SelectTrigger>
              <SelectValue placeholder="All shifts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All shifts</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="night">Night</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 w-full">
          <Label htmlFor="date">Date</Label>
          <Input 
            type="date" 
            defaultValue={params.get('date') || ''}
            className="w-full"
            onChange={e => handleFilterChange('date', e.target.value)}
          />
        </div>
      </div>
    </Card>
  );
} 