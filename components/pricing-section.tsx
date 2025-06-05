"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Star } from "lucide-react"

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Perfect for small service businesses",
    features: [
      "Up to 3 workers",
      "100 jobs per month",
      "Basic scheduling",
      "SMS & Email reminders",
      "Client portal",
      "Mobile app access",
      "Email support",
    ],
    popular: false,
    cta: "Start Free Trial",
  },
  {
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "For growing service businesses",
    features: [
      "Up to 15 workers",
      "Unlimited jobs",
      "AI-powered scheduling",
      "Advanced automation",
      "Analytics dashboard",
      "Billing integration",
      "Priority support",
      "Custom branding",
    ],
    popular: true,
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "/month",
    description: "For large service operations",
    features: [
      "Unlimited workers",
      "Unlimited jobs",
      "Advanced AI features",
      "Multi-location support",
      "Custom integrations",
      "Dedicated account manager",
      "24/7 phone support",
      "SLA guarantee",
    ],
    popular: false,
    cta: "Contact Sales",
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your business size. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.popular ? "ring-2 ring-blue-500 shadow-xl" : "shadow-lg"}`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-4 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-3xl sm:text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
                <p className="text-gray-600 mt-2">{plan.description}</p>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${plan.popular ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Billing Features */}
        <div className="mt-16 bg-white rounded-2xl p-6 sm:p-8 shadow-lg">
          <div className="text-center mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Billing & Payment Features</h3>
            <p className="text-gray-600">Streamline your revenue collection with our integrated billing system</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Automated Invoicing</h4>
              <p className="text-sm text-gray-600">Generate and send invoices automatically after job completion</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Online Payments</h4>
              <p className="text-sm text-gray-600">Accept credit cards, ACH, and digital wallet payments</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Recurring Billing</h4>
              <p className="text-sm text-gray-600">Set up automatic billing for maintenance contracts</p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-orange-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Financial Reports</h4>
              <p className="text-sm text-gray-600">Track revenue, expenses, and profitability in real-time</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
