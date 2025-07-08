'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle, Wifi, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function ConnectionDiagnostics() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    
    const diagnosticResults: DiagnosticResult[] = [];

    // Test 1: Environment Variables
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        diagnosticResults.push({
          test: 'Environment Configuration',
          status: 'success',
          message: 'Supabase URL and API key are configured',
          details: `URL: ${supabaseUrl.substring(0, 30)}...`
        });
      } else {
        diagnosticResults.push({
          test: 'Environment Configuration',
          status: 'error',
          message: 'Missing Supabase environment variables',
          details: `URL: ${!!supabaseUrl}, Key: ${!!supabaseKey}`
        });
      }
    } catch (err) {
      diagnosticResults.push({
        test: 'Environment Configuration',
        status: 'error',
        message: 'Failed to check environment variables',
        details: err instanceof Error ? err.message : String(err)
      });
    }

    // Test 2: Network Connectivity
    try {
      const response = await fetch('https://httpbin.org/get', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        diagnosticResults.push({
          test: 'Internet Connection',
          status: 'success',
          message: 'Internet connectivity is working'
        });
      } else {
        diagnosticResults.push({
          test: 'Internet Connection',
          status: 'warning',
          message: 'Internet connection may have issues',
          details: `HTTP ${response.status}`
        });
      }
    } catch (err) {
      diagnosticResults.push({
        test: 'Internet Connection',
        status: 'error',
        message: 'No internet connection or network blocked',
        details: err instanceof Error ? err.message : String(err)
      });
    }

    // Test 3: Supabase Connection
    try {
      const { data, error } = await supabase
        .from('bread_types')
        .select('count')
        .limit(1);
      
      if (error) {
        diagnosticResults.push({
          test: 'Supabase Database',
          status: 'error',
          message: 'Database connection failed',
          details: error.message
        });
      } else {
        diagnosticResults.push({
          test: 'Supabase Database',
          status: 'success',
          message: 'Database connection successful'
        });
      }
    } catch (err) {
      diagnosticResults.push({
        test: 'Supabase Database',
        status: 'error',
        message: 'Cannot connect to Supabase',
        details: err instanceof Error ? err.message : String(err)
      });
    }

    // Test 4: Supabase Auth
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        diagnosticResults.push({
          test: 'Authentication',
          status: 'warning',
          message: 'Auth service has issues',
          details: error.message
        });
      } else if (session) {
        diagnosticResults.push({
          test: 'Authentication',
          status: 'success',
          message: 'User is authenticated',
          details: `User: ${session.user.email}`
        });
      } else {
        diagnosticResults.push({
          test: 'Authentication',
          status: 'warning',
          message: 'No active session',
          details: 'User may need to log in'
        });
      }
    } catch (err) {
      diagnosticResults.push({
        test: 'Authentication',
        status: 'error',
        message: 'Auth check failed',
        details: err instanceof Error ? err.message : String(err)
      });
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Connection Diagnostics</h3>
        </div>
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          size="sm"
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            'Run Tests'
          )}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="font-medium">{result.test}</div>
                  <div className="text-sm mt-1">{result.message}</div>
                  {result.details && (
                    <div className="text-xs mt-2 font-mono bg-white/50 p-2 rounded">
                      {result.details}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !isRunning && (
        <div className="text-center py-8 text-gray-500">
          Click "Run Tests" to diagnose connection issues
        </div>
      )}
    </Card>
  );
}