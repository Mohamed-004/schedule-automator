"use client"

import { TrendingUp, Clock, Users, Star } from "lucide-react"

const stats = [
  {
    icon: TrendingUp,
    value: "80%",
    label: "Reduction in No-Shows",
    description: "Automated reminders keep customers engaged",
  },
  {
    icon: Clock,
    value: "60%",
    label: "Time Saved Daily",
    description: "Smart scheduling eliminates manual work",
  },
  {
    icon: Users,
    value: "10,000+",
    label: "Happy Customers",
    description: "Service businesses trust our platform",
  },
  {
    icon: Star,
    value: "4.9/5",
    label: "Customer Rating",
    description: "Rated by 2,000+ verified users",
  },
]

export function StatsSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Trusted by Service Businesses Worldwide</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join thousands of companies that have transformed their operations with SchedulePro
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="text-center">
                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="bg-blue-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                  <div className="text-base sm:text-lg font-semibold text-gray-700 mb-2">{stat.label}</div>
                  <div className="text-sm text-gray-600">{stat.description}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
