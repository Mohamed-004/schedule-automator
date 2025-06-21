'use client'

import { Calendar, CalendarDays } from 'lucide-react'
import { CustomLink } from '@/components/ui/custom-link'
import { cn } from '@/lib/utils'

/**
 * Timeline View Toggle Component
 * Provides navigation between daily and weekly timeline views
 * Follows the DayPilot calendar pattern for view switching
 */

interface TimelineViewToggleProps {
  currentView: 'daily' | 'weekly'
  className?: string
}

export default function TimelineViewToggle({ currentView, className }: TimelineViewToggleProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center border rounded-md bg-white shadow-sm">
        <CustomLink
          href="/dashboard/jobs"
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-r",
            currentView === 'daily'
              ? "bg-blue-600 text-white"
              : "hover:bg-gray-100 text-gray-700"
          )}
        >
          <Calendar className="w-4 h-4" />
          Daily
        </CustomLink>
        
        <CustomLink
          href="/dashboard/jobs/weekly"
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
            currentView === 'weekly'
              ? "bg-blue-600 text-white"
              : "hover:bg-gray-100 text-gray-700"
          )}
        >
          <CalendarDays className="w-4 h-4" />
          Weekly
        </CustomLink>
      </div>
    </div>
  )
} 