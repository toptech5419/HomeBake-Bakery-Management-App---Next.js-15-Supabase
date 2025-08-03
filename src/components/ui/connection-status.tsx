'use client'

import { useState, useEffect } from 'react'
import { checkConnection } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Wifi, WifiOff } from 'lucide-react'

interface ConnectionStatusProps {
  showDetails?: boolean
  className?: string
}

export function ConnectionStatus({ showDetails = false, className = '' }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkConnectionStatus = async () => {
    setIsChecking(true)
    try {
      const connected = await checkConnection()
      setIsConnected(connected)
      setLastChecked(new Date())
    } catch {
      setIsConnected(false)
      setLastChecked(new Date())
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkConnectionStatus()
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnectionStatus, 30000)
    
    return () => clearInterval(interval)
  }, [])

  if (isConnected === null && !isChecking) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          Checking...
        </Badge>
      </div>
    )
  }

  if (isChecking) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Wifi className="h-3 w-3 animate-pulse" />
          Checking...
        </Badge>
      </div>
    )
  }

  if (isConnected) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="default" className="flex items-center gap-1 bg-green-500 hover:bg-green-600">
          <CheckCircle className="h-3 w-3" />
          Connected
        </Badge>
        {showDetails && lastChecked && (
          <span className="text-xs text-muted-foreground">
            Last checked: {lastChecked.toLocaleTimeString()}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="destructive" className="flex items-center gap-1">
        <WifiOff className="h-3 w-3" />
        Disconnected
      </Badge>
      {showDetails && (
        <button
          onClick={checkConnectionStatus}
          className="text-xs text-blue-500 hover:text-blue-600 underline"
        >
          Retry
        </button>
      )}
    </div>
  )
}