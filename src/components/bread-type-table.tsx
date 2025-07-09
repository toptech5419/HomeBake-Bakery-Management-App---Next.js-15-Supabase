import React from 'react';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

  const isLoading = (breadTypeId: string, action: string) => {
    return loadingId === breadTypeId && loadingAction === action;
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Mobile Card Layout
  const MobileCard = ({ breadType }: { breadType: BreadType }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 truncate">
            {breadType.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">
              {breadType.size || 'No size'}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {formatPrice(breadType.unit_price)}
            </span>
          </div>
        </div>
        <Badge className={`text-xs ${getStatusColor(breadType.is_active !== false)}`}>
          {breadType.is_active === false ? 'Inactive' : 'Active'}
        </Badge>
      </div>
      
      {isOwner && (
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('edit', breadType)}
            disabled={!!loadingId}
            className="flex-1 hover:bg-blue-50 hover:border-blue-300"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('delete', breadType)}
            disabled={!!loadingId}
            className="flex-1 hover:bg-red-50 hover:border-red-300"
          >
            {isLoading(breadType.id, 'delete') ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Delete
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Mobile Cards - visible on small screens */}
      <div className="block md:hidden space-y-4">
        {breadTypes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No bread types found.</p>
          </div>
        ) : (
          breadTypes.map((breadType) => (
            <MobileCard key={breadType.id} breadType={breadType} />
          ))
        )}
      </div>

      {/* Desktop Table - visible on medium screens and up */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {isOwner && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {breadTypes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No bread types found.
                  </td>
                </tr>
              ) : (
                breadTypes.map((breadType) => (
                  <tr key={breadType.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {breadType.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {breadType.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {breadType.size || 'No size'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(breadType.unit_price)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`${getStatusColor(breadType.is_active !== false)}`}>
                        {breadType.is_active === false ? 'Inactive' : 'Active'}
                      </Badge>
                    </td>
                    {isOwner && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction('edit', breadType)}
                            disabled={!!loadingId}
                            className="hover:bg-blue-50 hover:border-blue-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction('delete', breadType)}
                            disabled={!!loadingId}
                            className="hover:bg-red-50 hover:border-red-300"
                          >
                            {isLoading(breadType.id, 'delete') ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 