"use client";
import React, { useState, useEffect } from 'react';
import { BreadTypeForm } from '@/components/bread-type-form';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/button';
import { createBreadTypeAction, updateBreadTypeAction } from '../actions';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { createUserMessages, withRetry } from '@/lib/utils/error-handling';

interface BreadType {
  id: string;
  name: string;
  size?: string;
  unit_price: number;
}

interface User {
  id: string;
  email?: string;
  role: string;
}

export default function BreadTypeNewClient({ initialValues, user }: { initialValues: BreadType | null; user: User }) {
  const [formLoading, setFormLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const message = createUserMessages.network.connectionRestored();
      toast.success(message.message, message.title, message.duration);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      const message = createUserMessages.network.connectionLost();
      toast.warning(message.message, message.title, message.duration);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const handleSubmit = async (data: { name: string; size?: string; unit_price: number }) => {
    if (!isOnline) {
      const message = createUserMessages.network.connectionLost();
      toast.warning(message.message, message.title, message.duration);
      return;
    }

    setFormLoading(true);
    try {
      let result;
      const breadTypeName = data.name;
      
      if (id) {
        // Update existing bread type
        result = await withRetry(async () => {
          return await updateBreadTypeAction(user, id, data);
        }, 2, 1500);
        
        if (result?.success) {
          const message = createUserMessages.breadTypes.updateSuccess(breadTypeName);
          toast.success(message.message, message.title, message.duration);
          router.push('/dashboard/bread-types');
        } else {
          const message = createUserMessages.breadTypes.updateError(breadTypeName, result?.error);
          toast.error(message.message, message.title, message.duration);
        }
      } else {
        // Create new bread type
        result = await withRetry(async () => {
          return await createBreadTypeAction(user, data);
        }, 2, 1500);
        
        if (result?.success) {
          const message = createUserMessages.breadTypes.createSuccess(breadTypeName);
          toast.success(message.message, message.title, message.duration);
          router.push('/dashboard/bread-types');
        } else {
          const message = createUserMessages.breadTypes.createError(breadTypeName, result?.error);
          toast.error(message.message, message.title, message.duration);
        }
      }
    } catch (error) {
      const breadTypeName = data.name;
      if (id) {
        const message = createUserMessages.breadTypes.updateError(breadTypeName, error);
        toast.error(message.message, message.title, message.duration);
      } else {
        const message = createUserMessages.breadTypes.createError(breadTypeName, error);
        toast.error(message.message, message.title, message.duration);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleGoBack = () => {
    router.push('/dashboard/bread-types');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Back Button - Positioned at the top */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex items-start"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="outline"
              onClick={handleGoBack}
              disabled={formLoading}
              className="bg-white/80 backdrop-blur-sm border-white/30 hover:bg-white/90 shadow-lg transition-all duration-300 min-w-[44px] h-[44px] px-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Bread Types
            </Button>
          </motion.div>
        </motion.div>

        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="text-center">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {id ? 'Edit Bread Type' : 'Add New Bread Type'}
              </h1>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                isOnline 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    Offline
                  </>
                )}
              </div>
            </div>
            <p className="text-gray-600">
              {id ? 'Update the details of your bread type' : 'Create a new bread type for your bakery'}
              {!isOnline && (
                <span className="block text-red-600 text-sm mt-1">
                  You&apos;re currently offline. Changes cannot be saved until connection is restored.
                </span>
              )}
            </p>
          </div>
        </motion.div>

        {/* Form Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)'
          }}
        >
          <BreadTypeForm
            initialValues={initialValues || {}}
            onSubmit={handleSubmit}
            loading={formLoading}
          />
        </motion.div>
      </motion.div>
    </div>
  );
} 