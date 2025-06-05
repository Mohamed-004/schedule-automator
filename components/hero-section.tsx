"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, ArrowRight, CheckCircle, Calendar, Users, Zap } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-16 pb-20 sm:pt-24 sm:pb-32">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <Badge className="mb-6 bg-blue-100 text-blue-800 border-blue-200 px-4 py-2">
            <Zap className="h-4 w-4 mr-2" />
            New: AI-Powered Auto-Scheduling
          </Badge>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Streamline Your
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {" "}
              Service Business
            </span>
            <br />
            with Smart Scheduling
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Automate job scheduling, manage workers, and delight customers with our all-in-one platform. Reduce no-shows
            by 80% and increase efficiency by 60%.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg"
            >
              Start Free 14-Day Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg">
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Setup in under 5 minutes
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Cancel anytime
            </div>
          </div>
        </div>

        {/* Hero Image/Dashboard Preview */}
        <div className="mt-16 relative">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <div className="ml-4 text-sm text-gray-600">SchedulePro Dashboard</div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="h-6 sm:h-8 w-6 sm:w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Today's Schedule</h3>
                      <p className="text-sm text-gray-600">12 jobs scheduled</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-6 sm:h-8 w-6 sm:w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Active Workers</h3>
                      <p className="text-sm text-gray-600">8 available</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg sm:col-span-2 md:col-span-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Zap className="h-6 sm:h-8 w-6 sm:w-8 text-purple-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Automation</h3>
                      <p className="text-sm text-gray-600">95% efficiency</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
