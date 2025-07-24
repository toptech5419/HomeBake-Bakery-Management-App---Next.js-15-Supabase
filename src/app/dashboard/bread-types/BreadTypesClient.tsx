"use client";
import React, { useState, useCallback } from 'react';
import { BreadTypeTable } from '@/components/bread-type-table';
import { useToast } from '@/components/ui/ToastProvider';
import { deleteBreadTypeAction, refetchBreadTypesAction } from './actions';
import { useRouter } from 'next/navigation';
import { BreadType } from '@/types';

interface User {
  id: string;
  email?: string;
  role: string;
}

export default function BreadTypesClient({ breadTypes: initialBreadTypes, user }: { breadTypes: BreadType[]; user: User }) {
  const [breadTypes, setBreadTypes] = useState(initialBreadTypes);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  const refetchBreadTypes = async () => {
    try {
      setLoadingId('refetch');
      const updated = await refetchBreadTypesAction();
      setBreadTypes(updated);
    } catch {
      toast.error('Failed to refresh bread types');
    } finally {
      setLoadingId(null);
    }
  };

  const handleEdit = (breadType: BreadType) => {
    router.push(`/dashboard/bread-types/new?id=${breadType.id}`);
  };
  
  const handleDelete = async (breadType: BreadType) => {
    if (!window.confirm('Are you sure you want to delete this bread type? This action cannot be undone.')) return;
    setLoadingId(breadType.id);
    setLoadingAction('delete');
    try {
      const result = await deleteBreadTypeAction(user, breadType.id);
      if (result?.success) {
        toast.success('Bread type deleted successfully!');
        await refetchBreadTypes();
      } else {
        toast.error(result?.error || 'Failed to delete bread type.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'An unexpected error occurred.');
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };

  const handleAddBreadType = useCallback(() => {
    setLoadingId('add');
    router.push('/dashboard/bread-types/new');
  }, [router]);

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Bread Types</h1>
        <button
          onClick={handleAddBreadType}
          className="relative bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[160px] disabled:opacity-60 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
          disabled={!!loadingId}
        >
          {loadingId === 'add' ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
          ) : null}
          Add Bread Type
        </button>
      </div>
      <div className="bg-white rounded shadow p-2 sm:p-4 overflow-x-auto">
        <BreadTypeTable
          breadTypes={breadTypes}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isOwner={user.role === 'owner'}
          loadingId={loadingId}
          loadingAction={loadingAction}
        />
      </div>
    </div>
  );
} 