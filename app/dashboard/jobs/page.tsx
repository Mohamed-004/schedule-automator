'use client'

import EnhancedVerticalTimeline from '@/components/timeline/EnhancedVerticalTimeline'
import TimelineViewToggle from '@/components/timeline/TimelineViewToggle'

/**
 * Jobs page with daily timeline
 * Shows worker schedules with job blocks in timeline format
 * Includes toggle to switch to weekly view
 */
export default function JobsPage() {
  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* View Toggle */}
      <div className="px-6 pt-6">
        <TimelineViewToggle currentView="daily" />
      </div>
      
      {/* Daily Timeline Content */}
      <div className="px-6 pb-6">
        <EnhancedVerticalTimeline />
      </div>
    </div>
  )
} 
 
 