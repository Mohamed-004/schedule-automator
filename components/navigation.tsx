"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, Calendar, Zap } from "lucide-react"
import Link from "next/link"

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900">SchedulePro</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">
              Testimonials
            </a>
            <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">
              Contact
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <Button>
              <Zap className="h-4 w-4 mr-2" />
              Start Free Trial
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              <a
                href="#features"
                className="block px-3 py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#pricing"
                className="block px-3 py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                href="#testimonials"
                className="block px-3 py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                Testimonials
              </a>
              <a
                href="#contact"
                className="block px-3 py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </a>
              <div className="px-3 py-2 space-y-2">
                <Link href="/" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Dashboard
                  </Button>
                </Link>
                <Button className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Start Free Trial
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
