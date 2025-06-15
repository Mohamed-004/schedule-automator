'use client';

import { useState } from 'react';
import Calendar from '@/components/schedule/calendar';
import JobList from '@/components/schedule/job-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CalendarIcon, Calendar as CalendarCheck } from 'lucide-react';
import { useCalendarData } from './useCalendarData';

export default function CalendarPage() {
  const { jobs, workers, clients, loading } = useCalendarData();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const jobsForSelectedDate = jobs?.filter(job => {
    if (!job?.scheduled_at) return false;
    const jobDate = new Date(job.scheduled_at);
    return jobDate.toDateString() === selectedDate.toDateString();
  }) || [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6 md:p-8 space-y-8"
    >
      <header className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="p-2 bg-blue-50 rounded-lg"
          >
            <CalendarCheck className="h-7 w-7 text-blue-500" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Calendar</h1>
        </div>
        <p className="text-lg text-gray-500 mt-1">
          View and manage your scheduled jobs.
        </p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="shadow-lg border border-gray-200 bg-white">
            <CardContent className="p-4 sm:p-5">
              <Calendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                jobs={jobs || []}
              />
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:sticky lg:top-24"
        >
          <Card className="shadow-lg border border-gray-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
                <span>
                  {selectedDate.toLocaleDateString(undefined, { 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <JobList jobs={jobsForSelectedDate} workers={workers} clients={clients} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
} 
 
 