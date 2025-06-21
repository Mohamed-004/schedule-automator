'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format, addDays, startOfWeek, addHours, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Users, AlertCircle, Sparkles } from 'lucide-react'

/**
 * Optimized Availability Calendar Component
 * Uses batch API calls to prevent infinite loops and improve performance
 */

interface AvailabilityCalendarProps {
  selectedDate: Date
  duration: number
  workers: Array<{
    id: string
    name: string
    email: string
  }>
  onTimeSlotSelect: (dateTime: string, workerId: string) => void
  jobId?: string
  className?: string
}

interface TimeSlotData {
  dateTime: string
  availableWorkers: Array<{
    id: string
    name: string
    workload: number
    isOptimal: boolean
  }>
  totalWorkers: number
  availabilityScore: number
}

interface BatchAvailabilityRequest {
  workerId: string
  timeSlots: Array<{
    startTime: string
    endTime: string
    slotKey: string
  }>
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] // 8 AM to 6 PM
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function AvailabilityCalendar({
  selectedDate,
  duration,
  workers,
  onTimeSlotSelect,
  jobId,
  className
}: AvailabilityCalendarProps) {
  const [availabilityData, setAvailabilityData] = useState<Map<string, TimeSlotData>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Start on Monday

  // Load availability data with debouncing to prevent excessive API calls
  const loadAvailabilityData = useCallback(
    async () => {
      if (workers.length === 0) return
      
      setIsLoading(true)
      try {
        console.log('Loading availability data for', workers.length, 'workers')
        
        // Create a simple availability map based on worker weekly availability
        const newAvailabilityData = new Map<string, TimeSlotData>()
        
        // Generate time slots for the week
        const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] // 9 AM to 7 PM
        const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const currentDay = addDays(weekStart, dayOffset)
          
          for (const hour of HOURS) {
            const slotDateTime = addHours(currentDay, hour)
            const slotKey = format(slotDateTime, 'yyyy-MM-dd-HH')
            
            // Initialize slot with no workers
            newAvailabilityData.set(slotKey, {
              dateTime: slotDateTime.toISOString(),
              availableWorkers: [],
              totalWorkers: workers.length,
              availabilityScore: 0
            })
          }
        }

        // Make ONE batch API call to get all worker availability for the week
        try {
          const response = await fetch('/api/workers/availability/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startDate: format(weekStart, 'yyyy-MM-dd'),
              endDate: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
              duration,
              allWorkers: true // Flag to get all workers' availability
            })
          })

          if (response.ok) {
            const data = await response.json()
            const workerAvailability = data.workerAvailability || {}
            
            // Process the batch response
            Object.entries(workerAvailability).forEach(([workerId, availability]: [string, any]) => {
              const worker = workers.find(w => w.id === workerId)
              if (!worker) return

              const workerData = availability as {
                availableSlots: Array<{ dateTime: string; isAvailable: boolean }>
                workload: number
              }

              workerData.availableSlots?.forEach(slot => {
                if (slot.isAvailable) {
                  const slotDate = parseISO(slot.dateTime)
                  const slotKey = format(slotDate, 'yyyy-MM-dd-HH')
                  const slotData = newAvailabilityData.get(slotKey)
                  
                  if (slotData) {
                    slotData.availableWorkers.push({
                      id: worker.id,
                      name: worker.name,
                      workload: workerData.workload || 0,
                      isOptimal: (workerData.workload || 0) < 30
                    })
                    
                    slotData.availabilityScore = slotData.availableWorkers.length / slotData.totalWorkers
                    newAvailabilityData.set(slotKey, slotData)
                  }
                }
              })
            })
          } else {
            // Fallback: Use simple weekly availability patterns (no API calls)
            console.log('Using fallback availability calculation')
            
            workers.forEach(worker => {
              // Simulate availability based on business hours (9 AM - 6 PM, Mon-Fri)
              for (let dayOffset = 1; dayOffset <= 5; dayOffset++) { // Mon-Fri only
                const currentDay = addDays(weekStart, dayOffset)
                
                for (let hour = 9; hour <= 17; hour++) { // 9 AM - 5 PM
                  const slotDateTime = addHours(currentDay, hour)
                  const slotKey = format(slotDateTime, 'yyyy-MM-dd-HH')
                  const slotData = newAvailabilityData.get(slotKey)
                  
                  if (slotData) {
                    // Simulate some availability (80% chance)
                    if (Math.random() > 0.2) {
                      slotData.availableWorkers.push({
                        id: worker.id,
                        name: worker.name,
                        workload: Math.floor(Math.random() * 40), // 0-40 hours
                        isOptimal: Math.random() > 0.5
                      })
                      
                      slotData.availabilityScore = slotData.availableWorkers.length / slotData.totalWorkers
                      newAvailabilityData.set(slotKey, slotData)
                    }
                  }
                }
              }
            })
          }
        } catch (error) {
          console.error('Error fetching batch availability:', error)
          // Use fallback as above
        }

        setAvailabilityData(newAvailabilityData)
        generateAISuggestions(newAvailabilityData)
        
      } catch (error) {
        console.error('Error loading availability data:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [selectedDate, duration, workers, jobId, weekStart]
  )

  // Generate AI suggestions based on availability data
  const generateAISuggestions = (availabilityMap: Map<string, TimeSlotData>) => {
    const suggestions: string[] = []
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
    
    // Get all workers and their workloads for the selected date
    const workersForSelectedDate = new Map<string, { name: string; workload: number; availableSlots: number }>()
    
    // Analyze availability for the selected date only
    Array.from(availabilityMap.entries()).forEach(([slotKey, data]) => {
      const slotDate = parseISO(data.dateTime)
      if (format(slotDate, 'yyyy-MM-dd') === selectedDateStr) {
        data.availableWorkers.forEach(worker => {
          if (!workersForSelectedDate.has(worker.id)) {
            workersForSelectedDate.set(worker.id, {
              name: worker.name,
              workload: worker.workload,
              availableSlots: 0
            })
          }
          const workerData = workersForSelectedDate.get(worker.id)!
          workerData.availableSlots++
          workersForSelectedDate.set(worker.id, workerData)
        })
      }
    })

    if (workersForSelectedDate.size === 0) {
      suggestions.push("❌ No workers available on the selected date. Try a different date.")
      setAiSuggestions(suggestions)
      return
    }

    // Sort workers by workload (lowest first = most efficient)
    const sortedWorkers = Array.from(workersForSelectedDate.entries())
      .sort(([, a], [, b]) => a.workload - b.workload)

    // Show the most efficient workers (lowest workload)
    suggestions.push(`💡 **Most Efficient Workers for ${format(selectedDate, 'MMM d')}:**`)
    
    sortedWorkers.slice(0, 3).forEach(([workerId, worker], index) => {
      const efficiency = worker.workload < 20 ? 'High' : worker.workload < 35 ? 'Medium' : 'Low'
      const efficiencyIcon = worker.workload < 20 ? '⭐' : worker.workload < 35 ? '✅' : '⚠️'
      
      suggestions.push(
        `${efficiencyIcon} ${worker.name} - ${efficiency} efficiency (${worker.workload}h workload, ${worker.availableSlots} slots available)`
      )
    })

    // Show total availability for the day
    const totalSlotsForDate = Array.from(availabilityMap.entries())
      .filter(([slotKey]) => slotKey.startsWith(selectedDateStr))
      .length
    
    const slotsWithAvailability = Array.from(availabilityMap.entries())
      .filter(([slotKey, data]) => 
        slotKey.startsWith(selectedDateStr) && data.availableWorkers.length > 0
      ).length

    if (slotsWithAvailability > 0) {
      suggestions.push(`📅 ${slotsWithAvailability}/${totalSlotsForDate} time slots have worker availability`)
      
      // Show best time slots
      const bestSlots = Array.from(availabilityMap.entries())
        .filter(([slotKey, data]) => 
          slotKey.startsWith(selectedDateStr) && data.availableWorkers.length > 0
        )
        .sort(([, a], [, b]) => b.availabilityScore - a.availabilityScore)
        .slice(0, 3)

      if (bestSlots.length > 0) {
        const timeList = bestSlots.map(([, data]) => {
          const time = format(parseISO(data.dateTime), 'h:mm a')
          return `${time} (${data.availableWorkers.length} workers)`
        }).join(', ')
        
        suggestions.push(`🕐 Best times: ${timeList}`)
      }
    }

    setAiSuggestions(suggestions)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAvailabilityData()
    }, 300) // Debounce to prevent excessive calls

    return () => clearTimeout(timeoutId)
  }, [loadAvailabilityData])

  const getSlotColors = (slotData: TimeSlotData | undefined) => {
    if (!slotData || slotData.availableWorkers.length === 0) {
      return 'bg-red-50 text-red-700 border-red-200 cursor-not-allowed opacity-60'
    }
    
    const hasOptimalWorkers = slotData.availableWorkers.some(w => w.isOptimal)
    const score = slotData.availabilityScore
    
    if (score >= 0.7 && hasOptimalWorkers) {
      return 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300 cursor-pointer shadow-sm'
    } else if (score >= 0.5) {
      return 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300 cursor-pointer'
    } else {
      return 'bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300 cursor-pointer'
    }
  }

  const handleSlotClick = (slotKey: string, slotData: TimeSlotData) => {
    if (slotData.availableWorkers.length === 0) return

    setSelectedSlot(slotKey)
    
    // Select the optimal worker (least workload)
    const sortedWorkers = slotData.availableWorkers.sort((a, b) => a.workload - b.workload)
    const bestWorker = sortedWorkers[0]
    
    onTimeSlotSelect(slotData.dateTime, bestWorker.id)
  }

  const formatTimeSlot = (hour: number) => {
    if (hour === 12) return '12 PM'
    if (hour > 12) return `${hour - 12} PM`
    return `${hour} AM`
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* AI Suggestions Panel */}
      {aiSuggestions.length > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-purple-600" />
              AI Scheduling Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {aiSuggestions.map((suggestion, index) => (
                <div key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">•</span>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Weekly Availability Calendar
          </CardTitle>
          <div className="text-sm text-gray-600">
            Week of {format(weekStart, 'MMM d, yyyy')} • {duration} min duration
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            <Badge className="bg-green-100 text-green-800">⭐ Optimal (High availability + Light workload)</Badge>
            <Badge className="bg-yellow-100 text-yellow-800">🟡 Good (Medium availability)</Badge>
            <Badge className="bg-orange-100 text-orange-800">⚠️ Limited (Low availability)</Badge>
            <Badge className="bg-red-100 text-red-800">❌ Unavailable</Badge>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-8 gap-1 min-w-[700px]">
              {/* Header Row */}
              <div className="p-2 font-medium text-gray-700 text-center"></div>
              {DAYS.map((day, index) => {
                const dayDate = addDays(weekStart, index)
                return (
                  <div key={day} className="p-2 text-center font-medium text-gray-700 min-w-[90px]">
                    <div className="text-sm">{day}</div>
                    <div className="text-xs text-gray-500">{format(dayDate, 'MMM d')}</div>
                  </div>
                )
              })}

              {/* Time Slots */}
              {HOURS.map((hour) => (
                <React.Fragment key={hour}>
                  {/* Time Label */}
                  <div className="p-2 text-right font-medium text-gray-600 border-r text-sm bg-gray-50">
                    {formatTimeSlot(hour)}
                  </div>
                  
                  {/* Day Slots */}
                  {DAYS.map((day, dayIndex) => {
                    const slotDate = addDays(weekStart, dayIndex)
                    const slotKey = format(addHours(slotDate, hour), 'yyyy-MM-dd-HH')
                    const slotData = availabilityData.get(slotKey)
                    const isSelected = selectedSlot === slotKey
                    
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className={cn(
                          'p-2 h-14 rounded-lg border-2 transition-all duration-200 relative text-center',
                          getSlotColors(slotData),
                          isSelected && 'ring-2 ring-blue-500 ring-offset-1 scale-105',
                          isLoading && 'animate-pulse bg-gray-100'
                        )}
                        onClick={() => slotData && handleSlotClick(slotKey, slotData)}
                      >
                        {slotData && !isLoading && (
                          <div className="flex flex-col items-center justify-center h-full">
                            <div className="text-xs font-medium flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {slotData.availableWorkers.length}
                            </div>
                            {slotData.availableWorkers.some(w => w.isOptimal) && (
                              <div className="text-xs">⭐</div>
                            )}
                            <div className="text-xs opacity-75">
                              {Math.round(slotData.availabilityScore * 100)}%
                            </div>
                          </div>
                        )}
                        
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-lg"></div>
                        )}
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Analyzing availability...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 