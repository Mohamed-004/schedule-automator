"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Sarah Johnson",
    company: "Johnson Plumbing Services",
    role: "Owner",
    content:
      "SchedulePro transformed our business. We went from 40% no-shows to less than 5%. The automated reminders and client portal are game-changers.",
    rating: 5,
    avatar: "SJ",
  },
  {
    name: "Mike Rodriguez",
    company: "Elite HVAC Solutions",
    role: "Operations Manager",
    content:
      "The AI scheduling is incredible. It automatically assigns jobs based on technician skills and location. We've increased our daily capacity by 30%.",
    rating: 5,
    avatar: "MR",
  },
  {
    name: "Lisa Chen",
    company: "Chen Electrical Services",
    role: "CEO",
    content:
      "The billing integration saved us hours every week. Invoices go out automatically, and we get paid faster. ROI was immediate.",
    rating: 5,
    avatar: "LC",
  },
  {
    name: "David Thompson",
    company: "Thompson Home Services",
    role: "Founder",
    content:
      "Customer satisfaction went through the roof. The client portal lets them reschedule easily, and our workers love the mobile app.",
    rating: 5,
    avatar: "DT",
  },
  {
    name: "Maria Garcia",
    company: "Garcia Maintenance Co.",
    role: "Owner",
    content:
      "Emergency rescheduling used to be a nightmare. Now the system handles it automatically and keeps everyone happy. Brilliant!",
    rating: 5,
    avatar: "MG",
  },
  {
    name: "Robert Kim",
    company: "Kim's Appliance Repair",
    role: "Manager",
    content:
      "The analytics dashboard gives us insights we never had before. We can optimize routes, track performance, and grow strategically.",
    rating: 5,
    avatar: "RK",
  },
]

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Loved by Service Business Owners</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See how SchedulePro has helped thousands of businesses streamline their operations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <p className="text-gray-700 mb-6 leading-relaxed">"{testimonial.content}"</p>

                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-600">{testimonial.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                    <div className="text-sm text-blue-600">{testimonial.company}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
