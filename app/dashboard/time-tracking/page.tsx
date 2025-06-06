import { Calendar } from '@/components/schedule/calendar'
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
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Time Tracking</h1>
      
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="rounded-lg border bg-white p-4">
          <Calendar
            jobs={jobs || []}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
        
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold">
            Time Entries for {selectedDate.toLocaleDateString()}
          </h2>
          <TimeEntryList jobs={selectedDateJobs} />
        </div>
      </div>
    </div>
  )
} 