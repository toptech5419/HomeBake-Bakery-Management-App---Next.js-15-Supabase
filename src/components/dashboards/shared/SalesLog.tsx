'use client';

import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from '@/components/ui/badge';

interface SalesTransaction {
  id: string;
  breadType: string;
  quantity: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'mobile' | 'transfer';
  timestamp: string;
}

interface SalesLogProps {
  transactions: SalesTransaction[];
  title?: string;
}

export const SalesLog = ({ transactions, title = 'Sales Log' }: SalesLogProps) => {
  const getPaymentMethodBadge = (method: string) => {
    const variants = {
      cash: 'bg-green-100 text-green-800',
      card: 'bg-blue-100 text-blue-800',
      mobile: 'bg-purple-100 text-purple-800',
      transfer: 'bg-orange-100 text-orange-800',
    };
    return variants[method as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">
              No transactions yet
            </p>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{transaction.breadType}</p>
                    <Badge variant="secondary" className="text-xs">
                      x{transaction.quantity}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <span>{new Date(transaction.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</span>
                    <span>•</span>
                    <Badge className={getPaymentMethodBadge(transaction.paymentMethod)}>
                      {transaction.paymentMethod}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(transaction.totalAmount)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
