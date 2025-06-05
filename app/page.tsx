"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TodaysSchedule } from "@/components/todays-schedule"
import { CalendarView } from "@/components/calendar-view"
import { WorkersPanel } from "@/components/workers-panel"
import { JobsPanel } from "@/components/jobs-panel"
import { NotificationsLog } from "@/components/notifications-log"

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
      default:
        return <TodaysSchedule />
    }
  }

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderActiveSection()}
    </DashboardLayout>
  )
}
