'use client';

import React from 'react';
import { OwnerDashboard } from './owner/OwnerDashboard';
import { ManagerDashboard } from './manager/ManagerDashboard';
import { SalesRepDashboard } from './sales/SalesRepDashboard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Shield, UserCheck, BarChart3 } from 'lucide-react';

interface DashboardRouterProps {
  userId: string;
  userRole: 'owner' | 'manager' | 'sales_rep';
  userData: {
    name: string;
    email: string;
    role: string;
  };
  breadTypes: Array<{ id: string; name: string; unit_price: number }>;
}

export function DashboardRouter({ userId, userRole, userData, breadTypes }: DashboardRouterProps) {
  // Access control check
  if (!userId || !userRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            Unable to verify your role. Please contact your administrator.
          </p>
        </Card>
      </div>
    );
  }

  // Role-based dashboard rendering
  switch (userRole) {
    case 'owner':
      return (
        <div className="dashboard-container">
          <div className="sr-only">Owner Dashboard - Complete business oversight</div>
          <OwnerDashboard 
            userId={userId} 
            userData={userData} 
          />
        </div>
      );

    case 'manager':
      return (
        <div className="dashboard-container">
          <div className="sr-only">Manager Dashboard - Production focused</div>
          <ManagerDashboard 
            userId={userId} 
            userData={userData} 
            breadTypes={breadTypes}
          />
        </div>
      );

    case 'sales_rep':
      return (
        <div className="dashboard-container">
          <div className="sr-only">Sales Rep Dashboard - Sales focused</div>
          <SalesRepDashboard 
            userId={userId} 
            userData={userData} 
            breadTypes={breadTypes}
          />
        </div>
      );

    default:
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="p-8 max-w-md text-center">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-yellow-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Invalid Role
            </h2>
            <p className="text-gray-600 mb-4">
              Your role "{userRole}" is not recognized. Available roles:
            </p>
            <div className="space-y-2">
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Owner
              </Badge>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                Manager
              </Badge>
              <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Sales Rep
              </Badge>
            </div>
          </Card>
        </div>
      );
  }
}

// Helper function to get role-specific metadata
export function getRoleDashboardMetadata(role: string) {
  switch (role) {
    case 'owner':
      return {
        title: 'Owner Dashboard',
        description: 'Complete business oversight and management',
        color: 'purple',
        icon: Shield,
        features: [
          'Complete business analytics',
          'Financial overview',
          'Staff management',
          'Performance monitoring',
          'Report generation'
        ]
      };
    
    case 'manager':
      return {
        title: 'Manager Dashboard',
        description: 'Production management and quality control',
        color: 'blue',
        icon: UserCheck,
        features: [
          'Production batch tracking',
          'Quality control metrics',
          'Shift management',
          'Production reporting',
          'Equipment monitoring'
        ]
      };
    
    case 'sales_rep':
      return {
        title: 'Sales Rep Dashboard',
        description: 'Sales performance and transaction management',
        color: 'green',
        icon: BarChart3,
        features: [
          'Sales transaction logging',
          'Performance tracking',
          'Target monitoring',
          'Customer interaction',
          'Payment processing'
        ]
      };
    
    default:
      return {
        title: 'Unknown Role',
        description: 'Role not recognized',
        color: 'gray',
        icon: AlertCircle,
        features: []
      };
  }
}