"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to Transform Your Service Business?</h2>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Join thousands of service businesses that have streamlined their operations with SchedulePro. Start your free
          trial today - no credit card required.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg">
            Start Free 14-Day Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg"
          >
            Schedule a Demo
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-blue-100">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Setup in 5 minutes
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            No long-term contracts
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            24/7 support included
          </div>
        </div>
      </div>
    </section>
  )
}
