"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Calendar, MessageSquare, Users, Zap, Clock, BarChart3, Smartphone, Shield, CreditCard } from "lucide-react"

const features = [
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description:
      "AI-powered scheduling that automatically assigns jobs based on worker skills, location, and availability.",
  },
  {
    icon: MessageSquare,
    title: "Automated Reminders",
    description:
      "Send SMS, email, and phone reminders automatically. Reduce no-shows by 80% with our 3-tier reminder system.",
  },
  {
    icon: Users,
    title: "Worker Management",
    description:
      "Track worker availability, skills, and performance. Optimize your team's productivity with real-time insights.",
  },
  {
    icon: Zap,
    title: "Emergency Rescheduling",
    description: "Handle urgent jobs with automatic rescheduling. Our buffer system keeps your schedule optimized.",
  },
  {
    icon: Smartphone,
    title: "Client Portal",
    description: "Mobile-friendly portal for clients to confirm, reschedule, or cancel appointments with one click.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track KPIs, worker performance, and customer satisfaction with comprehensive reporting tools.",
  },
  {
    icon: CreditCard,
    title: "Billing Integration",
    description: "Automated invoicing and payment processing. Accept payments online and track revenue in real-time.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level security with SOC 2 compliance. Your data is encrypted and protected 24/7.",
  },
  {
    icon: Clock,
    title: "Real-time Updates",
    description:
      "Live notifications keep everyone in sync. Workers and managers get instant updates on schedule changes.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Run Your Service Business
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            From scheduling to billing, our comprehensive platform handles every aspect of your operations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
