'use client'

import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, User, MapPin, AlertCircle } from 'lucide-react'
import type { WeeklyWorkerData } from '@/hooks/useWeeklyPlanningData'

interface WeeklyGridProps {
  workers: WeeklyWorkerData[]
  weekRange: {
    startDate: Date
    endDate: Date
    weekDays: Date[]
  }
  showAISuggestions: boolean
}

/**
 * Main weekly grid component showing 7-day layout with worker schedules
 */
export default function WeeklyGrid({ workers, weekRange, showAISuggestions }: WeeklyGridProps) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-4">
      {/* Day Headers - Hidden on mobile, shown on tablet+ */}
      <div className="hidden md:grid md:grid-cols-8 gap-4">
        <div className="font-medium text-gray-900">Workers</div>
        {weekRange.weekDays.map((day, index) => (
          <div key={day.toISOString()} className="text-center">
            <div className="font-medium text-gray-900">{dayNames[index]}</div>
            <div className="text-sm text-gray-500">{format(day, 'MMM d')}</div>
          </div>
        ))}
      </div>

      {/* Worker Rows */}
      <div className="space-y-4">
        {workers.map((worker) => (
          <WeeklyWorkerRow
            key={worker.id}
            worker={worker}
            weekDays={weekRange.weekDays}
            showAISuggestions={showAISuggestions}
          />
        ))}
      </div>

      {workers.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Workers Found</h3>
            <p className="text-sm">Add workers to your team to start planning their schedules.</p>
          </div>
        </Card>
      )}
    </div>
  )
}

/**
 * Individual worker row showing their weekly schedule
 */
interface WeeklyWorkerRowProps {
  worker: WeeklyWorkerData
  weekDays: Date[]
  showAISuggestions: boolean
}

function WeeklyWorkerRow({ worker, weekDays, showAISuggestions }: WeeklyWorkerRowProps) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="p-4 border-b bg-gray-50">
            <WorkerInfo worker={worker} showAISuggestions={showAISuggestions} />
          </div>
          <div className="p-4 space-y-4">
            {weekDays.map((day, dayIndex) => (
              <div key={day.toISOString()} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">
                    {dayNames[dayIndex]} {format(day, 'MMM d')}
                  </h4>
                </div>
                <WeeklyTimeSlot
                  worker={worker}
                  dayOfWeek={dayIndex}
                  day={day}
                  showAISuggestions={showAISuggestions}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-8 gap-4 p-4">
          <div className="flex flex-col justify-center">
            <WorkerInfo worker={worker} showAISuggestions={showAISuggestions} />
          </div>
          {weekDays.map((day, dayIndex) => (
            <WeeklyTimeSlot
              key={day.toISOString()}
              worker={worker}
              dayOfWeek={dayIndex}
              day={day}
              showAISuggestions={showAISuggestions}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Worker information display component
 */
interface WorkerInfoProps {
  worker: WeeklyWorkerData
  showAISuggestions: boolean
}

function WorkerInfo({ worker, showAISuggestions }: WorkerInfoProps) {
  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-gray-900 truncate">{worker.name}</h3>
        <p className="text-sm text-gray-600 capitalize">{worker.role}</p>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Utilization</span>
          <span className="font-medium">{worker.weeklyStats.utilization}%</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Scheduled</span>
          <span className="font-medium">{worker.weeklyStats.totalScheduledHours.toFixed(1)}h</span>
        </div>
        
        <Badge 
          variant="outline" 
          className={`text-xs ${getEfficiencyColor(worker.weeklyStats.efficiency)}`}
        >
          {worker.weeklyStats.efficiency} efficiency
        </Badge>
      </div>

      {showAISuggestions && worker.aiRecommendations.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-purple-600">
          <AlertCircle className="h-3 w-3" />
          <span>{worker.aiRecommendations.length} AI suggestion{worker.aiRecommendations.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Individual time slot for a specific day
 */
interface WeeklyTimeSlotProps {
  worker: WeeklyWorkerData
  dayOfWeek: number
  day: Date
  showAISuggestions: boolean
}

function WeeklyTimeSlot({ worker, dayOfWeek, day, showAISuggestions }: WeeklyTimeSlotProps) {
  // Get availability for this day
  const dayAvailability = worker.weeklyAvailability.filter(slot => slot.dayOfWeek === dayOfWeek)
  
  // Get jobs for this day
  const dayJobs = worker.weeklyJobs.filter(job => job.dayOfWeek === dayOfWeek)
  
  // Calculate if worker is available this day
  const isAvailable = dayAvailability.length > 0 && dayAvailability.some(slot => slot.isAvailable)
  
  return (
    <div className="min-h-[120px] space-y-2">
      {/* Availability Display */}
      {isAvailable ? (
        <div className="space-y-1">
          {dayAvailability.map((slot, index) => (
            <div
              key={index}
              className="p-2 bg-green-50 border border-green-200 rounded text-xs"
            >
              <div className="flex items-center gap-1 text-green-700">
                <Clock className="h-3 w-3" />
                <span>{slot.startTime} - {slot.endTime}</span>
              </div>
              <div className="text-green-600 mt-1">
                Available ({Math.round(slot.duration / 60)}h)
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500 text-center">
          Not Available
        </div>
      )}

      {/* Jobs Display */}
      {dayJobs.length > 0 && (
        <div className="space-y-1">
          {dayJobs.map((job) => (
            <WeeklyJobBlock
              key={job.id}
              job={job}
              showAISuggestions={showAISuggestions}
            />
          ))}
        </div>
      )}

      {/* AI Recommendations for this day */}
      {showAISuggestions && worker.aiRecommendations.length > 0 && (
        <div className="space-y-1">
          {worker.aiRecommendations.slice(0, 1).map((rec) => (
            <div
              key={rec.id}
              className="p-2 bg-purple-50 border border-purple-200 rounded text-xs"
            >
              <div className="flex items-center gap-1 text-purple-700">
                <AlertCircle className="h-3 w-3" />
                <span className="font-medium">{rec.type.replace('_', ' ')}</span>
              </div>
              <div className="text-purple-600 mt-1 truncate">
                {rec.title}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Individual job block component
 */
interface WeeklyJobBlockProps {
  job: {
    id: string
    title: string
    clientName: string
    scheduledAt: Date
    duration: number
    status: string
    priority: string
  }
  showAISuggestions: boolean
}

function WeeklyJobBlock({ job }: WeeklyJobBlockProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-50 border-blue-200 text-blue-700'
      case 'in_progress': return 'bg-orange-50 border-orange-200 text-orange-700'
      case 'completed': return 'bg-green-50 border-green-200 text-green-700'
      default: return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'emergency': return '🚨'
      case 'high': return '⚡'
      default: return ''
    }
  }

  return (
    <div className={`p-2 border rounded text-xs ${getStatusColor(job.status)}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium truncate flex-1">{job.title}</span>
        {getPriorityIndicator(job.priority) && (
          <span className="ml-1">{getPriorityIndicator(job.priority)}</span>
        )}
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{job.clientName}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{format(job.scheduledAt, 'HH:mm')} ({Math.round(job.duration / 60)}h)</span>
        </div>
      </div>
    </div>
  )
} 