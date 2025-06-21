'use client'

import WeeklyPlanningTimeline from '@/components/timeline/WeeklyPlanningTimeline'

/**
 * Weekly Planning page with AI-powered scheduling recommendations
 * Shows 7-day worker schedules with intelligent suggestions for optimal job assignment
 */
export default function WeeklyPlanningPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Weekly Planning
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          AI-powered weekly schedule planning with smart recommendations for optimal worker utilization
        </p>
      </div>
      
      <WeeklyPlanningTimeline />
    </div>
  )
} 