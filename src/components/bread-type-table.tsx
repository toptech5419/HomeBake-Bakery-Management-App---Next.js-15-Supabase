import React from 'react';
import { HiPencil, HiTrash } from 'react-icons/hi';

interface BreadType {
  id: string;
  name: string;
  size?: string;
  unit_price: number;
  is_active?: boolean;
}

interface BreadTypeTableProps {
  breadTypes: BreadType[];
  onEdit: (breadType: BreadType) => void;
  onDelete: (breadType: BreadType) => Promise<void>;
  isOwner: boolean;
  loadingId?: string | null;
  loadingAction?: string | null;
}

export function BreadTypeTable({ breadTypes, onEdit, onDelete, isOwner, loadingId, loadingAction }: BreadTypeTableProps) {
  const handleAction = async (action: 'edit' | 'delete', breadType: BreadType) => {
    if (action === 'edit') onEdit(breadType);
    if (action === 'delete') await onDelete(breadType);
  };

  return (
    <div className="overflow-x-auto rounded bg-white shadow">
      <table className="min-w-full border text-sm">
        <thead>
          <tr>
            <th className="px-2 py-2 sm:px-4">Name</th>
            <th className="px-2 py-2 sm:px-4">Size</th>
            <th className="px-2 py-2 sm:px-4">Price</th>
            <th className="px-2 py-2 sm:px-4">Status</th>
            {isOwner && <th className="px-2 py-2 sm:px-4">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {breadTypes.map((bt, idx) => (
            <tr key={bt.id} className={"border-t" + (idx !== breadTypes.length - 1 ? " border-b border-gray-100" : "") }>
              <td className="px-2 py-2 sm:px-4 align-middle">{bt.name}</td>
              <td className="px-2 py-2 sm:px-4 align-middle">{bt.size || '-'}</td>
              <td className="px-2 py-2 sm:px-4 align-middle">₦{bt.unit_price ?? '-'}</td>
              <td className="px-2 py-2 sm:px-4 align-middle">{bt.is_active === false ? 'Inactive' : 'Active'}</td>
              {isOwner && (
                <td className="px-2 py-2 sm:px-4 align-middle">
                  <div className="flex flex-row gap-2 justify-center items-center">
                    <button
                      aria-label="Edit Bread Type"
                      onClick={() => handleAction('edit', bt)}
                      disabled={!!loadingId}
                      className="flex items-center gap-1 px-3 py-1.5 border border-blue-500 text-blue-600 bg-white rounded-md text-xs font-medium hover:bg-blue-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <HiPencil className="w-4 h-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      aria-label="Delete Bread Type"
                      onClick={() => handleAction('delete', bt)}
                      disabled={!!loadingId}
                      className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-600 bg-white rounded-md text-xs font-medium hover:bg-red-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loadingId === bt.id && loadingAction === 'delete' ? (
                        <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <HiTrash className="w-4 h-4" />
                          <span className="hidden sm:inline">Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 