"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Home, ArrowRight } from "lucide-react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TodaysSchedule } from "@/components/todays-schedule"
import { CalendarView } from "@/components/calendar-view"
import { WorkersPanel } from "@/components/workers-panel"
import { JobsPanel } from "@/components/jobs-panel"
import { NotificationsLog } from "@/components/notifications-log"
import { TaskList } from '@/components/TaskList'

export default function ManagerDashboard() {
  const [activeSection, setActiveSection] = useState("schedule")

  const renderActiveSection = () => {
    switch (activeSection) {
      case "schedule":
        return <TodaysSchedule />
      case "calendar":
        return <CalendarView />
      case "workers":
        return <WorkersPanel />
      case "jobs":
        return <JobsPanel />
      case "notifications":
        return <NotificationsLog />
      case "tasks":
        return <TaskList />
      default:
        return <TodaysSchedule />
    }
  }

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {/* Add Homepage Link */}
      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Home className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">Visit Our Homepage</h3>
                <p className="text-sm text-blue-700">Check out our landing page and billing features</p>
              </div>
            </div>
            <Link href="/homepage">
              <Button className="bg-blue-600 hover:bg-blue-700">
                View Homepage
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {renderActiveSection()}
    </DashboardLayout>
  )
}
