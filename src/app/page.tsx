'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ChefHat, Users, BarChart3, LogIn } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-50 to-pink-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 md:mb-12"
          >
            {/* Logo & Brand */}
            <div className="mb-6 md:mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-6xl md:text-8xl mb-4"
              >
                🍞
              </motion.div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 bg-clip-text text-transparent">
                HomeBake
              </h1>
              <p className="text-lg md:text-xl text-gray-600 font-medium">
                Smart Bakery Monitoring App
              </p>
            </div>

            {/* App Description */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-8 md:mb-12"
            >
              <p className="text-base md:text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
                Streamline your bakery operations with real-time batch tracking, inventory management, 
                and shift-based monitoring. Built for bakery teams to manage sales, production, and analytics seamlessly.
              </p>
            </motion.div>

            {/* Login CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-6 md:mb-8"
            >
              <Button 
                asChild 
                size="lg" 
                className="h-12 md:h-14 px-8 md:px-12 text-base md:text-lg font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                leftIcon={<LogIn className="w-5 h-5" />}
              >
                <Link href="/login">Login to Your Account</Link>
              </Button>
            </motion.div>

            {/* Invite Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-sm md:text-base text-gray-600 bg-white/60 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-orange-200"
            >
              <p className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4 text-orange-500" />
                <span>New here? Ask your bakery owner for an invite link to join.</span>
              </p>
            </motion.div>
          </motion.div>

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12"
          >
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-orange-200 hover:border-orange-300 transition-colors">
              <ChefHat className="w-8 h-8 md:w-10 md:h-10 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Production Tracking</h3>
              <p className="text-sm text-gray-600">Real-time batch monitoring and shift management</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-orange-200 hover:border-orange-300 transition-colors">
              <BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Sales Analytics</h3>
              <p className="text-sm text-gray-600">Comprehensive reporting and insights</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-orange-200 hover:border-orange-300 transition-colors">
              <Users className="w-8 h-8 md:w-10 md:h-10 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Team Management</h3>
              <p className="text-sm text-gray-600">Role-based access and user permissions</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="py-6 md:py-8 bg-white/60 backdrop-blur-sm border-t border-orange-200"
      >
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm md:text-base text-gray-600">
            Made with ❤️ for HomeBake Team
          </p>
        </div>
      </motion.footer>
    </main>
  );
}
