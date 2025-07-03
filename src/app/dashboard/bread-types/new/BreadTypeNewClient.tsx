"use client";
import React, { useState } from 'react';
import { BreadTypeForm } from '@/components/bread-type-form';
import { useToast } from '@/components/ui/ToastProvider';
import { createBreadTypeAction, updateBreadTypeAction } from '../actions';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

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

  const handleSubmit = async (data: { name: string; size?: string; unit_price: number }) => {
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

  const handleGoBack = () => {
    router.push('/dashboard/bread-types');
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={handleGoBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mr-4"
          disabled={formLoading}
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold">{id ? 'Edit Bread Type' : 'Add Bread Type'}</h1>
      </div>
      <BreadTypeForm
        initialValues={initialValues || {}}
        onSubmit={handleSubmit}
        loading={formLoading}
      />
    </div>
  );
} 