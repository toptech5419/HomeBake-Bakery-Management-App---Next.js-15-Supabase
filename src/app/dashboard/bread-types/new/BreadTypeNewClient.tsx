"use client";
import React, { useState } from 'react';
import { BreadTypeForm } from '@/components/bread-type-form';
import { useToast } from '@/components/ui/ToastProvider';
import { createBreadTypeAction, updateBreadTypeAction } from '../actions';
import { useRouter, useSearchParams } from 'next/navigation';

interface BreadType {
  id: string;
  name: string;
  size?: string;
  unit_price: number;
}

interface User {
  id: string;
  email?: string;
  role: string;
}

export default function BreadTypeNewClient({ initialValues, user }: { initialValues: BreadType | null; user: User }) {
  const [formLoading, setFormLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const handleSubmit = async (data: BreadType) => {
    setFormLoading(true);
    try {
      let result;
      if (id) {
        result = await updateBreadTypeAction(user, id, data);
        if (result?.success) {
          toast.success('Bread type updated!');
        } else {
          toast.error(result?.error || 'Failed to update bread type.');
        }
      } else {
        result = await createBreadTypeAction(user, data);
        if (result?.success) {
          toast.success('Bread type created!');
        } else {
          toast.error(result?.error || 'Failed to create bread type.');
        }
      }
      if (result?.success) router.push('/dashboard/bread-types');
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'An unexpected error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">{id ? 'Edit Bread Type' : 'Add Bread Type'}</h1>
      <BreadTypeForm
        initialValues={initialValues || {}}
        onSubmit={handleSubmit}
        loading={formLoading}
      />
    </div>
  );
} 