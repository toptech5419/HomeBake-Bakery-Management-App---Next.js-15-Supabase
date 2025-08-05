"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShift } from '@/contexts/ShiftContext';
import { useEndShiftContext } from '@/contexts/EndShiftContext';
import { Clock, RotateCcw, Settings, Sun, Moon, Power, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ShiftToggleProps {
  showLabel?: boolean;
  compact?: boolean;
}

export default function ShiftToggle({ showLabel = true, compact = false }: ShiftToggleProps) {
  const { currentShift, toggleShift } = useShift();
  const { onEndShift } = useEndShiftContext();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Handle end shift functionality
  const handleEndShift = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 ShiftToggle: End shift button clicked');
      await onEndShift();
      setShowModal(false);
      toast.success('Shift ended successfully!');
    } catch (error) {
      console.error('❌ Error ending shift:', error);
      toast.error('Failed to end shift. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <motion.div 
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Badge className={`flex items-center gap-1 backdrop-blur-sm border ${
            currentShift === 'morning' 
              ? 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-800 border-orange-200' 
              : 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border-indigo-200'
          }`}>
            <Clock className="h-3 w-3" />
            {currentShift === 'morning' ? '🌅' : '🌙'} {currentShift}
          </Badge>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleShift}
            className="p-1 h-6 w-6 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="relative overflow-hidden mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Sleek modern background */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100 opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-white/50 backdrop-blur-lg" />
      
      <div className="relative p-4 sm:p-6 rounded-3xl border border-white/30 shadow-2xl bg-white/80 backdrop-blur-xl">
        {/* Mobile-first layout */}
        <div className="flex flex-col gap-6">
          
          {/* Header - Only show on non-compact */}
          {showLabel && (
            <motion.div 
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-gray-900 text-xl">Shift Control</span>
              </div>
              
              {/* Status indicator */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`h-3 w-3 rounded-full ${
                  currentShift === 'morning' 
                    ? 'bg-gradient-to-r from-orange-400 to-yellow-400' 
                    : 'bg-gradient-to-r from-indigo-400 to-purple-400'
                } shadow-lg`}
              />
            </motion.div>
          )}
          
          {/* Main content area */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            
            {/* Current Shift Display - Redesigned */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              className="flex-1 w-full sm:w-auto"
            >
              <div className={`relative p-6 rounded-2xl shadow-xl border-2 transition-all duration-300 ${
                currentShift === 'morning' 
                  ? 'bg-gradient-to-br from-orange-100 via-amber-50 to-orange-100 border-orange-300 text-orange-900' 
                  : 'bg-gradient-to-br from-indigo-100 via-purple-50 to-indigo-100 border-indigo-300 text-indigo-900'
              }`}>
                
                {/* Decorative elements */}
                <div className="absolute top-2 right-2 opacity-20">
                  {currentShift === 'morning' ? (
                    <Sun className="h-8 w-8" />
                  ) : (
                    <Moon className="h-8 w-8" />
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl shadow-lg ${
                    currentShift === 'morning' 
                      ? 'bg-gradient-to-br from-orange-500 to-amber-500' 
                      : 'bg-gradient-to-br from-indigo-500 to-purple-500'
                  }`}>
                    {currentShift === 'morning' ? (
                      <Sun className="h-7 w-7 text-white" />
                    ) : (
                      <Moon className="h-7 w-7 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">
                        {currentShift === 'morning' ? '🌅' : '🌙'}
                      </span>
                      <span className="font-bold text-xl capitalize">
                        {currentShift} Shift
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 opacity-60" />
                      <span className="text-sm font-medium opacity-80">
                        Active Session
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Action buttons - Redesigned for mobile */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              
              {/* Switch Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 sm:flex-none"
              >
                <Button
                  variant="outline"
                  size="lg"
                  onClick={toggleShift}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-white via-gray-50 to-white border-2 border-gray-200 rounded-2xl shadow-lg hover:shadow-xl hover:border-gray-300 transition-all duration-300 font-semibold text-gray-700 hover:text-gray-800 min-h-[56px]"
                >
                  <motion.div
                    animate={{ rotate: isHovered ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    onHoverStart={() => setIsHovered(true)}
                    onHoverEnd={() => setIsHovered(false)}
                  >
                    <RotateCcw className="h-5 w-5" />
                  </motion.div>
                  <span className="hidden sm:inline">
                    Switch to {currentShift === 'morning' ? 'Night' : 'Morning'}
                  </span>
                  <span className="sm:hidden">
                    Switch Shift
                  </span>
                </Button>
              </motion.div>

              {/* End Shift Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 sm:flex-none"
              >
                <Button
                  type="button"
                  size="lg"
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold border-0 min-h-[56px]"
                  onClick={() => setShowModal(true)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <Power className="h-5 w-5" />
                  )}
                  <span>End Shift</span>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="End Shift?">
        <motion.div 
          className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-md mx-auto border border-gray-100"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">End Current Shift?</h3>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-700 leading-relaxed">
              Are you sure you want to end your current shift? This will clear all recorded sales for the {currentShift} shift.
            </p>
          </div>
          
          <div className="flex gap-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1"
            >
              <Button
                type="button"
                size="lg"
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={handleEndShift}
                disabled={isLoading}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                ) : (
                  <Power className="h-5 w-5 mr-2" />
                )}
                {isLoading ? 'Ending Shift...' : 'Proceed'}
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1"
            >
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setShowModal(false)}
                disabled={isLoading}
                className="w-full border-2 border-gray-300 hover:border-gray-400 rounded-xl font-semibold transition-all duration-300"
              >
                Cancel
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </Modal>
    </motion.div>
  );
}