'use client';

import { useState } from 'react';
import { useJobs } from '@/hooks/use-jobs';
import Calendar from '@/components/schedule/calendar';
import JobList from '@/components/schedule/job-list';
import { Card, CardContent } from '@/components/ui/card';

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { jobs, loading } = useJobs();

  const selectedDateJobs = jobs?.filter(job => {
    if (!job?.scheduled_at) return false;
    const jobDate = new Date(job.scheduled_at);
    return jobDate.toDateString() === selectedDate.toDateString();
  }) || [];

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">Schedule</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4 md:p-6">
              <Calendar
                jobs={jobs || []}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardContent className="p-4 md:p-6">
              <h2 className="text-lg font-semibold mb-4">
                Jobs for {selectedDate.toLocaleDateString(undefined, { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <JobList jobs={selectedDateJobs} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 
 
 