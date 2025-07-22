'use client';

import React, { createContext, useContext, useCallback, ReactNode, useState } from 'react';

interface ReportData {
  salesRecords: Array<{
    breadType: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    timestamp: string;
  }>;
  remainingBreads: Array<{
    breadType: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  totalRevenue: number;
  totalItemsSold: number;
  totalRemaining: number;
  feedback?: string | null;
  shift?: string;
  timeOfSales?: string;
  userId?: string;
}

interface EndShiftContextType {
  onEndShift: () => void;
  setEndShiftHandler: (handler: () => void) => void;
  finalReportData: ReportData | null;
  setFinalReportData: (data: ReportData | null) => void;
}

const EndShiftContext = createContext<EndShiftContextType | undefined>(undefined);

interface EndShiftProviderProps {
  children: ReactNode;
}

export function EndShiftProvider({ children }: EndShiftProviderProps) {
  const [handler, setHandler] = useState<(() => void) | null>(null);
  const [finalReportData, setFinalReportData] = useState<ReportData | null>(null);

  const onEndShift = useCallback(() => {
    if (handler) {
      handler();
    }
  }, [handler]);

  const setEndShiftHandler = useCallback((newHandler: () => void) => {
    setHandler(() => newHandler);
  }, []);

  return (
    <EndShiftContext.Provider value={{ onEndShift, setEndShiftHandler, finalReportData, setFinalReportData }}>
      {children}
    </EndShiftContext.Provider>
  );
}

export function useEndShiftContext() {
  const context = useContext(EndShiftContext);
  if (!context) {
    throw new Error('useEndShiftContext must be used within EndShiftProvider');
  }
  return context;
}
