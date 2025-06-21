'use client'

import WeeklyPlanningTimeline from '@/components/timeline/WeeklyPlanningTimeline'
import TimelineViewToggle from '@/components/timeline/TimelineViewToggle'

/**
 * Weekly Timeline page - shows weekly planning view
 * Part of the jobs timeline with toggle between daily and weekly views
 */
export default function WeeklyTimelinePage() {
  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* View Toggle */}
      <div className="px-6 pt-6">
        <TimelineViewToggle currentView="weekly" />
      </div>
      
      {/* Weekly Timeline Content */}
      <div className="px-6 pb-6">
        <WeeklyPlanningTimeline />
      </div>
    </div>
  )
} 