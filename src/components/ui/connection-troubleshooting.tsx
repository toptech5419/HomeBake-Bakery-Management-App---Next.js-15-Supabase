'use client';

import React, { useState } from 'react';
import { AlertTriangle, Wifi, RefreshCw, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { checkConnection } from '@/lib/supabase/client';

interface ConnectionTroubleshootingProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectionTroubleshooting({ isOpen, onClose }: ConnectionTroubleshootingProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<{ connected: boolean; error?: string } | null>(null);

  const handleCheckConnection = async () => {
    setIsChecking(true);
    try {
      const result = await checkConnection();
      setLastCheckResult(result);
    } catch (error) {
      setLastCheckResult({ connected: false, error: 'Failed to check connection' });
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Connection Troubleshooting
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Common Solutions:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Check your internet connection</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Try refreshing the page</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Check if your firewall is blocking the connection</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Try using a different network (mobile hotspot)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Contact your IT administrator if the issue persists</span>
              </li>
            </ul>
          </div>

          <div className="border-t pt-4">
            <Button
              onClick={handleCheckConnection}
              disabled={isChecking}
              className="w-full"
              variant="outline"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking Connection...
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </div>

          {lastCheckResult && (
            <div className={`p-3 rounded-lg border ${
              lastCheckResult.connected 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {lastCheckResult.connected ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {lastCheckResult.connected ? 'Connection Successful' : 'Connection Failed'}
                </span>
              </div>
              {lastCheckResult.error && (
                <p className="text-sm mt-1 opacity-80">{lastCheckResult.error}</p>
              )}
            </div>
          )}

          <div className="text-xs text-gray-500 text-center">
            If problems persist, please contact your bakery administrator.
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 