import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  Package,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle,
  Mail,
  UserPlus,
  Wheat
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <Wheat className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">HomeBake</span>
            </div>
            {/* Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-orange-600 transition-colors">
                Features
              </Link>
              <Link href="#about" className="text-gray-600 hover:text-orange-600 transition-colors">
                About
              </Link>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6">
              🏆 Professional Bakery Management
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Streamline Your
              <span className="text-gradient block">Bakery Operations</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Professional bakery management system for tracking production, sales, and inventory. Optimized for efficiency with real-time updates and offline capabilities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto">
                  Sign In to Dashboard
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="#contact">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <UserPlus className="mr-2 w-4 h-4" />
                  Request Access
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Need access? <Link href="#contact" className="text-orange-600 hover:text-orange-700 font-medium">Contact your bakery owner</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Your Bakery
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From production tracking to sales management, we've got you covered
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Production Tracking */}
            <Card className="p-6 hover-lift border-0 shadow-lg">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Production Tracking
              </h3>
              <p className="text-gray-600">
                Monitor daily bread production and inventory levels with real-time updates and offline capabilities.
              </p>
            </Card>
            {/* Sales Management */}
            <Card className="p-6 hover-lift border-0 shadow-lg">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Sales Management
              </h3>
              <p className="text-gray-600">
                Track sales, shifts, and customer transactions with detailed reporting and analytics.
              </p>
            </Card>
            {/* Analytics & Reports */}
            <Card className="p-6 hover-lift border-0 shadow-lg">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Analytics & Reports
              </h3>
              <p className="text-gray-600">
                Generate insights and performance reports to optimize your bakery operations.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose HomeBake Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Why Choose HomeBake?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Built specifically for bakeries, our platform combines powerful features with intuitive design to help you focus on what matters most - creating amazing baked goods.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Secure Access Control</h4>
                    <p className="text-gray-600">Invitation-based system ensures only authorized personnel can access your bakery data</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Real-time Updates</h4>
                    <p className="text-gray-600">Stay synchronized across all devices with live data updates</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Role-based Access</h4>
                    <p className="text-gray-600">Secure access control for owners, managers, and sales representatives</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-8 text-white">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Performance Insights</h4>
                      <p className="text-orange-100 text-sm">Track your bakery's growth</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Secure & Reliable</h4>
                      <p className="text-orange-100 text-sm">Enterprise-grade security</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Lightning Fast</h4>
                      <p className="text-orange-100 text-sm">Optimized for speed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Access Information Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Get Access to HomeBake
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            HomeBake uses an invitation-based system to ensure secure access to your bakery's data. Contact your bakery owner or manager to request access.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <Card className="p-6 hover-lift border-0 shadow-lg">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <UserPlus className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                For New Users
              </h3>
              <p className="text-gray-600 mb-4">
                Contact your bakery owner to receive an invitation link. You'll need this to create your account.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  I Have an Invitation
                </Button>
              </Link>
            </Card>
            <Card className="p-6 hover-lift border-0 shadow-lg">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Mail className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                For Bakery Owners
              </h3>
              <p className="text-gray-600 mb-4">
                Already have an account? Sign in to manage your team and send invitations to new users.
              </p>
              <Link href="/login">
                <Button className="w-full">
                  Sign In to Dashboard
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Wheat className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold">HomeBake</span>
            </div>
            <div className="flex space-x-6 text-sm">
              <Link href="/login" className="text-gray-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="#contact" className="text-gray-300 hover:text-white transition-colors">
                Request Access
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 HomeBake. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
