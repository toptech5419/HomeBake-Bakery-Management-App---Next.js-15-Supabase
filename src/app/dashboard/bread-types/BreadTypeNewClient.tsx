"use client";
import React, { useState } from 'react';
import { BreadTypeForm } from '@/components/bread-type-form';
import { useMobileNotifications, NotificationHelpers } from '@/components/ui/mobile-notifications-fixed';
import { createBreadTypeAction, updateBreadTypeAction } from './actions';
import { useRouter, useSearchParams } from 'next/navigation';

interface BreadTypeFormData {
  name: string;
  size?: string;
  unit_price: number;
}

interface User {
  id: string;
  email?: string;
  role: string;
}

export default function BreadTypeNewClient({ initialValues, user }: { initialValues: Partial<BreadTypeFormData> | null; user: User }) {
  const [formLoading, setFormLoading] = useState(false);
  const { showNotification } = useMobileNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const handleSubmit = async (data: BreadTypeFormData) => {
    setFormLoading(true);
    try {
      if (id) {
        await updateBreadTypeAction(user, id, data);
        showNotification(NotificationHelpers.success('Success', 'Bread type updated!'));
      } else {
        await createBreadTypeAction(user, data);
        showNotification(NotificationHelpers.success('Success', 'Bread type created!'));
      }
      router.push('/dashboard/bread-types');
    } catch (err: unknown) {
      const error = err as Error;
      showNotification(NotificationHelpers.error('Error', error.message));
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