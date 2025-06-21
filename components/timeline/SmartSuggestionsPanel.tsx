'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { 
  Clock, 
  User, 
  Star, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  Zap,
  Users,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

/**
 * Smart Suggestions Panel Component
 * Displays AI-powered recommendations for job rescheduling with multiple suggestion categories
 */

interface SmartSuggestionsPanelProps {
  jobId: string
  preferredDateTime: string
  duration: number
  preferredWorkerId?: string
  onSuggestionSelect: (dateTime: string, workerId: string) => void
  className?: string
}

interface SuggestionsData {
  requestedTime: {
    dateTime: string
    isAvailable: boolean
    availableWorkers: Array<{
      id: string
      name: string
      utilization: number
    }>
  }
  workerAlternatives: Array<{
    workerId: string
    workerName: string
    isAvailable: boolean
    utilization: number
    nextAvailableSlot?: {
      start: string
      end: string
      reason: string
    }
    conflictingJobs: string[]
  }>
  timeAlternatives: Array<{
    dateTime: string
    score: number
    reason: string
    availableWorkers: string[]
    conflicts: number
  }>
  optimalCombinations: Array<{
    worker: {
      workerId: string
      workerName: string
      utilization: number
    }
    time: {
      dateTime: string
      score: number
      reason: string
    }
    score: number
    reason: string
  }>
  conflictResolution?: {
    hasConflicts: boolean
    conflictingJobs: Array<{
      id: string
      title: string
      scheduledAt: string
      duration: number
      canBeRescheduled: boolean
    }>
    suggestions: string[]
  }
}

export default function SmartSuggestionsPanel({
  jobId,
  preferredDateTime,
  duration,
  preferredWorkerId,
  onSuggestionSelect,
  className
}: SmartSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<SuggestionsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('optimal')

  useEffect(() => {
    if (jobId && preferredDateTime && duration) {
      loadSuggestions()
    }
  }, [jobId, preferredDateTime, duration, preferredWorkerId])

  const loadSuggestions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/workers/availability/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          preferredDateTime,
          duration,
          preferredWorkerId,
          searchDays: 7
        })
      })

      if (!response.ok) {
        throw new Error('Failed to load suggestions')
      }

      const data = await response.json()
      setSuggestions(data.suggestions)
    } catch (error) {
      console.error('Error loading suggestions:', error)
      setError('Failed to load smart suggestions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (dateTime: string, workerId: string) => {
    onSuggestionSelect(dateTime, workerId)
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization <= 40) return 'bg-green-100 text-green-800'
    if (utilization <= 70) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Loading Smart Suggestions...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !suggestions) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Error Loading Suggestions
          </CardTitle>
          <CardDescription>{error || 'Unable to load suggestions'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadSuggestions} variant="outline" size="sm">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Smart Reschedule Suggestions
        </CardTitle>
        <CardDescription>
          AI-powered recommendations based on worker availability and scheduling optimization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="optimal" className="text-xs">
              <Star className="h-3 w-3 mr-1" />
              Optimal
            </TabsTrigger>
            <TabsTrigger value="times" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Times
            </TabsTrigger>
            <TabsTrigger value="workers" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Workers
            </TabsTrigger>
            <TabsTrigger value="conflicts" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Conflicts
            </TabsTrigger>
          </TabsList>

          {/* Optimal Combinations Tab */}
          <TabsContent value="optimal" className="space-y-3">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Best Worker + Time Combinations
            </div>
            {suggestions.optimalCombinations.length > 0 ? (
              suggestions.optimalCombinations.slice(0, 3).map((combo: any, index: number) => (
                <Card key={index} className="border border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{combo.worker.workerName}</span>
                          <Badge className={getUtilizationColor(combo.worker.utilization)}>
                            {combo.worker.utilization}% utilized
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          {format(parseISO(combo.time.dateTime), 'EEE, MMM d • h:mm a')}
                        </div>
                        <div className="text-xs text-gray-500">{combo.reason}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getScoreColor(combo.score)} bg-white border`}>
                          {combo.score}% match
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleSuggestionClick(combo.time.dateTime, combo.worker.workerId)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No optimal combinations found for the selected time period
              </div>
            )}
          </TabsContent>

          {/* Alternative Times Tab */}
          <TabsContent value="times" className="space-y-3">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Alternative Time Slots
            </div>
            {suggestions.timeAlternatives.length > 0 ? (
              suggestions.timeAlternatives.slice(0, 3).map((time: any, index: number) => (
                <Card key={index} className="border hover:border-blue-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">
                            {format(parseISO(time.dateTime), 'EEE, MMM d • h:mm a')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {time.availableWorkers.length} worker(s) available
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">{time.reason}</div>
                        {time.conflicts > 0 && (
                          <div className="text-xs text-red-600 mt-1">
                            {time.conflicts} conflict(s) detected
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getScoreColor(time.score)} bg-white border`}>
                          {time.score}% score
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSuggestionClick(time.dateTime, time.availableWorkers[0])}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No alternative time slots found for the selected time period
              </div>
            )}
          </TabsContent>

          {/* Worker Alternatives Tab */}
          <TabsContent value="workers" className="space-y-3">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Worker Availability for {format(parseISO(preferredDateTime), 'MMM d, h:mm a')}
            </div>
            {suggestions.workerAlternatives.length > 0 ? (
              suggestions.workerAlternatives.map((worker, index) => (
                <Card key={index} className={cn(
                  'border',
                  worker.isAvailable ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{worker.workerName}</span>
                          <Badge className={getUtilizationColor(worker.utilization)}>
                            {worker.utilization}% utilized
                          </Badge>
                          {worker.isAvailable ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        
                        {worker.isAvailable ? (
                          <div className="text-sm text-green-600">Available at requested time</div>
                        ) : (
                          <>
                            {worker.conflictingJobs.length > 0 && (
                              <div className="text-sm text-red-600 mb-1">
                                Conflicts: {worker.conflictingJobs.join(', ')}
                              </div>
                            )}
                            {worker.nextAvailableSlot && (
                              <div className="text-sm text-gray-600">
                                Next available: {format(parseISO(worker.nextAvailableSlot.start), 'MMM d, h:mm a')}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {worker.isAvailable ? (
                          <Button
                            size="sm"
                            onClick={() => handleSuggestionClick(preferredDateTime, worker.workerId)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Select
                          </Button>
                        ) : worker.nextAvailableSlot ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSuggestionClick(worker.nextAvailableSlot!.start, worker.workerId)}
                          >
                            Next Slot
                          </Button>
                        ) : (
                          <Badge variant="secondary">Unavailable</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No worker availability found for the selected time period
              </div>
            )}
          </TabsContent>

          {/* Conflict Resolution Tab */}
          <TabsContent value="conflicts" className="space-y-3">
            {suggestions.conflictResolution?.hasConflicts ? (
              <>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Conflict Resolution
                </div>
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-800">
                        {suggestions.conflictResolution.conflictingJobs.length} Conflicting Job(s)
                      </span>
                    </div>
                    <div className="space-y-2 mb-3">
                      {suggestions.conflictResolution.conflictingJobs.map((job, index) => (
                        <div key={index} className="text-sm text-amber-700 bg-white rounded p-2">
                          <div className="font-medium">{job.title}</div>
                          <div className="text-xs text-amber-600">
                            {format(parseISO(job.scheduledAt), 'MMM d, h:mm a')} • {job.duration} min
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-sm text-amber-800 mb-2 font-medium">Suggested Actions:</div>
                    <div className="space-y-1">
                      {suggestions.conflictResolution.suggestions.map((suggestion, index) => (
                        <div key={index} className="text-sm text-amber-700 flex items-center gap-2">
                          <ArrowRight className="h-3 w-3" />
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <div className="text-green-600 font-medium">No Conflicts Detected</div>
                <div className="text-sm text-gray-500">
                  The selected time slot is clear for rescheduling
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 