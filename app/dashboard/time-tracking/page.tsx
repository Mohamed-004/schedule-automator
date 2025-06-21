'use client'

import Calendar from '@/components/schedule/calendar'
import { TimeEntryList } from '@/components/time-tracking/time-entry-list'
import { useJobs } from '@/hooks/use-jobs'
import { useState } from 'react'

export default function TimeTrackingPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const { jobs, loading } = useJobs()

  const selectedDateJobs = jobs?.filter(job => {
    const jobDate = new Date(job.scheduled_at)
    return jobDate.toDateString() === selectedDate.toDateString()
  }) || []

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Time Tracking</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Calendar</h2>
          <Calendar 
            jobs={jobs}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Time Entries</h2>
          <TimeEntryList jobs={selectedDateJobs} />
        </div>
      </div>
    </div>
  )
} 
 
 