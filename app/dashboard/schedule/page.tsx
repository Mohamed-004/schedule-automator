import { Calendar } from '@/components/schedule/calendar'
import { JobList } from '@/components/schedule/job-list'
import { useJobs } from '@/hooks/use-jobs'
import { useState } from 'react'

export default function SchedulePage() {
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
      <h1 className="mb-6 text-2xl font-bold">Schedule</h1>
      
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
            Jobs for {selectedDate.toLocaleDateString()}
          </h2>
          <JobList jobs={selectedDateJobs} />
        </div>
      </div>
    </div>
  )
} 
 
 