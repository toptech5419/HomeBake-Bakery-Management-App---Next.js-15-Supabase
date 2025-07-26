'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { checkConnection, withRetry } from '@/lib/supabase/client'

export function ConnectionTroubleshooting() {
  const [isTesting, setIsTesting] = useState(false)
  const [testResults, setTestResults] = useState<{
    basicConnectivity: boolean | null
    supabaseConnection: boolean | null
    error: string | null
  }>({
    basicConnectivity: null,
    supabaseConnection: null,
    error: null
  })

  const runConnectionTests = async () => {
    setIsTesting(true)
    setTestResults({
      basicConnectivity: null,
      supabaseConnection: null,
      error: null
    })

    try {
      // Test 1: Basic connectivity to Supabase URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured')
      }

      const basicTest = await fetch(supabaseUrl, {
        method: 'HEAD',
        mode: 'no-cors'
      }).then(() => true).catch(() => false)

      // Test 2: Supabase database connection
      const supabaseTest = await withRetry(
        async () => {
          const connected = await checkConnection()
          return connected
        },
        2,
        2000
      )

      setTestResults({
        basicConnectivity: basicTest,
        supabaseConnection: supabaseTest,
        error: null
      })
    } catch (error) {
      setTestResults({
        basicConnectivity: false,
        supabaseConnection: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <RefreshCw className="h-4 w-4 animate-spin" />
    if (status) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <AlertCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = (status: boolean | null, label: string) => {
    if (status === null) {
      return <Badge variant="secondary">{label}: Testing...</Badge>
    }
    if (status) {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">{label}: OK</Badge>
    }
    return <Badge variant="destructive">{label}: Failed</Badge>
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Connection Diagnostics
        </CardTitle>
        <CardDescription>
          Test your connection to the database and identify issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Basic Connectivity</span>
            {getStatusIcon(testResults.basicConnectivity)}
          </div>
          {getStatusBadge(testResults.basicConnectivity, 'Network')}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Database Connection</span>
            {getStatusIcon(testResults.supabaseConnection)}
          </div>
          {getStatusBadge(testResults.supabaseConnection, 'Database')}
        </div>

        {testResults.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{testResults.error}</p>
          </div>
        )}

        <Button 
          onClick={runConnectionTests} 
          disabled={isTesting}
          className="w-full"
        >
          {isTesting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Testing...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 mr-2" />
              Run Tests
            </>
          )}
        </Button>

        {(testResults.basicConnectivity === false || testResults.supabaseConnection === false) && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="font-medium text-yellow-800 mb-2">Troubleshooting Tips:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Check your internet connection</li>
              <li>• Verify your Supabase project is active</li>
              <li>• Try refreshing the page</li>
              <li>• Contact support if issues persist</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 