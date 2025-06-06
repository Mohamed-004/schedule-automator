"use client"

import { useState } from "react"
import type React from "react"
import { Calendar, Clock, Users, Briefcase, Bell, Settings, Menu, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-mobile"

interface DashboardLayoutProps {
  children: React.ReactNode
  activeSection: string
  onSectionChange: (section: string) => void
}

const navigationItems = [
  { id: "schedule", label: "Today's Schedule", icon: Clock },
  { id: "calendar", label: "Calendar View", icon: Calendar },
  { id: "workers", label: "Workers", icon: Users },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "notifications", label: "Notifications", icon: Bell },
]

export function DashboardLayout({ children, activeSection, onSectionChange }: DashboardLayoutProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [open, setOpen] = useState(false)

  const handleNavigation = (section: string) => {
    onSectionChange(section)
    if (isMobile) {
      setOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isMobile && (
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="mr-2">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold">Manager Dashboard</h2>
                  </div>
                  <div className="p-4 space-y-2">
                    {navigationItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Button
                          key={item.id}
                          variant={activeSection === item.id ? "default" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => handleNavigation(item.id)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </Button>
                      )
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600">Manage jobs, workers, and schedules</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Badge variant="outline" className="hidden sm:flex bg-green-50 text-green-700 border-green-200">
              12 Active Jobs
            </Badge>
            <Badge variant="outline" className="hidden sm:flex bg-blue-50 text-blue-700 border-blue-200">
              8 Workers Available
            </Badge>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row">
        {/* Sidebar Navigation - Desktop */}
        <nav className="hidden md:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)]">
          <div className="p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={activeSection === item.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => onSectionChange(item.id)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              )
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
