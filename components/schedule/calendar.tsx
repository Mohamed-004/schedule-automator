import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Job } from '@/lib/types'

interface CalendarProps {
  jobs: Job[]
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export default function Calendar({ jobs, selectedDate, onSelectDate }: CalendarProps) {
  const today = new Date()
  const currentMonth = selectedDate.getMonth()
  const currentYear = selectedDate.getFullYear()

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const startingDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weeks = []

  let day = 1
  for (let i = 0; i < 6; i++) {
    const week = []
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < startingDayOfWeek) {
        week.push(null)
      } else if (day > daysInMonth) {
        week.push(null)
      } else {
        const date = new Date(currentYear, currentMonth, day)
        const jobsForDay = jobs.filter(job => {
          const jobDate = new Date(job.scheduled_at)
          return jobDate.toDateString() === date.toDateString()
        })
        week.push({ date, jobsCount: jobsForDay.length })
        day++
      }
    }
    weeks.push(week)
  }

  const handlePrevMonth = () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1)
    onSelectDate(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(currentYear, currentMonth + 1, 1)
    onSelectDate(newDate)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-xs sm:text-base">
        {days.map(day => (
          <div
            key={day}
            className="text-center font-medium text-gray-500"
          >
            {day}
          </div>
        ))}

        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            if (!day) {
              return <div key={`${weekIndex}-${dayIndex}`} />
            }

            const isToday = day.date.toDateString() === today.toDateString()
            const isSelected = day.date.toDateString() === selectedDate.toDateString()

            return (
              <button
                key={`${weekIndex}-${dayIndex}`}
                onClick={() => onSelectDate(day.date)}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-lg transition-colors',
                  'h-10 w-10 md:h-12 md:w-12 lg:h-16 lg:w-16',
                  day.jobsCount > 0 && !isSelected ? 'bg-primary/5' : '',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'hover:bg-accent hover:text-accent-foreground',
                  isToday && !isSelected && 'border border-primary'
                )}
                aria-label={
                  day.jobsCount > 0
                    ? `${day.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}, ${day.jobsCount} job${day.jobsCount > 1 ? 's' : ''}`
                    : day.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
                }
                title={day.jobsCount > 0 ? `${day.jobsCount} job${day.jobsCount > 1 ? 's' : ''}` : undefined}
              >
                {day.jobsCount > 0 && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 items-center">
                    {Array(Math.min(day.jobsCount, 3)).fill(0).map((_, i) => (
                      <span key={i} className="inline-block h-1.5 w-1.5 rounded-full bg-primary"></span>
                    ))}
                    {day.jobsCount > 3 && (
                      <span className="text-[10px] text-primary font-bold ml-0.5">+</span>
                    )}
                  </div>
                )}
                <span className="z-0">{day.date.getDate()}</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
} 
 
 