import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Job } from '@/lib/types'

interface CalendarProps {
  jobs: Job[]
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export function Calendar({ jobs, selectedDate, onSelectDate }: CalendarProps) {
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
        const hasJobs = jobs.some(job => {
          const jobDate = new Date(job.scheduled_at)
          return jobDate.toDateString() === date.toDateString()
        })
        week.push({ date, hasJobs })
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
    <div className="w-full">
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

      <div className="grid grid-cols-7 gap-1">
        {days.map(day => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-500"
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
                  'relative h-10 rounded-md text-sm transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground',
                  isToday && !isSelected && 'border border-primary'
                )}
              >
                {day.date.getDate()}
                {day.hasJobs && (
                  <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
} 