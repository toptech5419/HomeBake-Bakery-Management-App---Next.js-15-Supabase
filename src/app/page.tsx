import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wheat, Users, BarChart3, Package } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-orange-500 p-3 rounded-xl mr-4">
              <Wheat className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">HomeBake</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional bakery management system for tracking production, sales, and inventory
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <Package className="h-8 w-8 text-orange-500 mb-4" />
            <h3 className="font-semibold mb-2">Production Tracking</h3>
            <p className="text-gray-600">Monitor daily bread production and inventory levels</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <Users className="h-8 w-8 text-orange-500 mb-4" />
            <h3 className="font-semibold mb-2">Sales Management</h3>
            <p className="text-gray-600">Track sales, shifts, and customer transactions</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <BarChart3 className="h-8 w-8 text-orange-500 mb-4" />
            <h3 className="font-semibold mb-2">Analytics & Reports</h3>
            <p className="text-gray-600">Generate insights and performance reports</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="space-x-4">
            <Button asChild className="bg-orange-500 hover:bg-orange-600">
              <Link href="/login">Login to Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Create Account</Link>
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Existing user? <Link href="/dashboard" className="text-orange-600 hover:underline">Go to Dashboard</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
