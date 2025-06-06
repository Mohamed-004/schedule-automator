'use client';

import { useState } from 'react';
import { useJobs } from '@/hooks/use-jobs';
import Calendar from '@/components/schedule/calendar';
import JobList from '@/components/schedule/job-list';

export default function CalendarPage() {
  const { jobs, loading } = useJobs();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const jobsForSelectedDate = jobs?.filter(job => {
    const jobDate = new Date(job.scheduled_at);
    return jobDate.toDateString() === selectedDate.toDateString();
  }) || [];

  return (
    <div className="w-full px-2 sm:px-4 md:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">Calendar View</h1>
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8 2xl:gap-12 w-full">
        <div className="min-w-0 flex-1">
          <Calendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            jobs={jobs || []}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold mb-2">
            Jobs for {selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
          {loading ? (
            <div className="text-gray-400 text-center py-8">Loading...</div>
          ) : (
            <JobList jobs={jobsForSelectedDate} />
          )}
        </div>
      </div>
    </div>
  );
} 
 
 