import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Job } from '@/lib/types'
import { AnimatePresence, motion } from 'framer-motion';

interface CalendarProps {
  jobs: Job[]
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export default function Calendar({ jobs, selectedDate, onSelectDate }: CalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentMonth = selectedDate.getMonth()
  const currentYear = selectedDate.getFullYear()

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const startingDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weeks = []
  
  let day = 1
  for (let i = 0; i < 6; i++) {
    const week = []
    for (let j = 0; j < 7; j++) {
      if ((i === 0 && j < startingDayOfWeek) || day > daysInMonth) {
        week.push(null)
      } else {
        const date = new Date(currentYear, currentMonth, day)
        date.setHours(0, 0, 0, 0)
        
        const jobsForDay = jobs?.filter(job => {
          if (!job.scheduled_at) return false
          const jobDate = new Date(job.scheduled_at)
          jobDate.setHours(0, 0, 0, 0)
          return jobDate.getTime() === date.getTime()
        }) || []

        week.push({ date, jobsCount: jobsForDay.length })
        day++
      }
    }
    weeks.push(week)
    if (day > daysInMonth) break;
  }

  const handlePrevMonth = () => onSelectDate(new Date(currentYear, currentMonth - 1, 1))
  const handleNextMonth = () => onSelectDate(new Date(currentYear, currentMonth + 1, 1))

  // Always show a single blue dot if there is at least one job
  const JobDot = ({ count }: { count: number }) => {
    if (count === 0) return null;
    return (
      <div className="flex justify-center items-center mt-0.5">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <AnimatePresence mode="wait">
          <motion.h2
            key={selectedDate.toLocaleString('default', { month: 'long' })}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="text-lg font-bold text-gray-900"
          >
            {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </motion.h2>
        </AnimatePresence>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-7 w-7 text-gray-500 hover:bg-gray-100">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-7 w-7 text-gray-500 hover:bg-gray-100">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-400 mb-1">
        {daysOfWeek.map(day => (
          <div key={day} className="py-1">{day.toUpperCase()}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1.5">
        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            if (!day) return <div key={`${weekIndex}-${dayIndex}`} className="aspect-square" />;
            const isToday = day.date.getTime() === today.getTime();
            const isSelected = day.date.getTime() === selectedDate.getTime();
            const isCurrentMonth = day.date.getMonth() === currentMonth;
            return (
              <div key={`${weekIndex}-${dayIndex}`} className="relative aspect-square">
                <button
                  onClick={() => onSelectDate(day.date)}
                  className={cn(
                    'w-full h-full rounded-lg flex flex-col items-center justify-center text-xs font-semibold transition-colors',
                    {
                      'ring-2 ring-blue-500 bg-white text-blue-700': isSelected,
                      'bg-white text-gray-900': !isSelected && isCurrentMonth,
                      'bg-white text-gray-300': !isCurrentMonth,
                      'ring-1 ring-blue-300': isToday && !isSelected,
                    }
                  )}
                  style={{ minHeight: 32, minWidth: 32, maxWidth: 40, maxHeight: 40, padding: 0 }}
                >
                  <span>{day.date.getDate()}</span>
                  {!isSelected && <JobDot count={day.jobsCount} />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
} 
 
 