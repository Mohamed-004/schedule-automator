'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Zap, BarChart3, Users, RefreshCw } from 'lucide-react'
import { format, addWeeks, subWeeks } from 'date-fns'
import { useWeeklyPlanningData } from '@/hooks/useWeeklyPlanningData'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import WeeklyGrid from './WeeklyGrid'
import AISuggestionsPanel from './AISuggestionsPanel'

/**
 * Main Weekly Planning Timeline component
 * Displays AI-powered weekly schedule planning with smart recommendations
 */
export default function WeeklyPlanningTimeline() {
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [showAISuggestions, setShowAISuggestions] = useState(true)
  
  const { workers, weekRange, loading, error, aiRecommendations } = useWeeklyPlanningData(selectedWeek)

  const handlePreviousWeek = () => {
    setSelectedWeek(prev => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    setSelectedWeek(prev => addWeeks(prev, 1))
  }

  const handleThisWeek = () => {
    setSelectedWeek(new Date())
  }

  // Calculate team statistics
  const teamStats = {
    totalWorkers: workers.length,
    averageUtilization: workers.length > 0 
      ? Math.round(workers.reduce((sum, w) => sum + w.weeklyStats.utilization, 0) / workers.length)
      : 0,
    highEfficiencyWorkers: workers.filter(w => w.weeklyStats.efficiency === 'high').length,
    totalRecommendations: aiRecommendations.length + workers.reduce((sum, w) => sum + w.aiRecommendations.length, 0)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <WeeklyPlanningHeader 
          weekRange={weekRange}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
          onThisWeek={handleThisWeek}
          showAISuggestions={showAISuggestions}
          onToggleAI={() => setShowAISuggestions(!showAISuggestions)}
          teamStats={teamStats}
          loading={true}
        />
        <WeeklyPlanningLoader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <WeeklyPlanningHeader 
          weekRange={weekRange}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
          onThisWeek={handleThisWeek}
          showAISuggestions={showAISuggestions}
          onToggleAI={() => setShowAISuggestions(!showAISuggestions)}
          teamStats={teamStats}
          loading={false}
        />
        <WeeklyPlanningError error={error} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with navigation and stats */}
      <WeeklyPlanningHeader 
        weekRange={weekRange}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onThisWeek={handleThisWeek}
        showAISuggestions={showAISuggestions}
        onToggleAI={() => setShowAISuggestions(!showAISuggestions)}
        teamStats={teamStats}
        loading={false}
      />

      {/* AI Suggestions Panel */}
      {showAISuggestions && (
        <AISuggestionsPanel 
          recommendations={aiRecommendations}
          workers={workers}
        />
      )}

      {/* Main Weekly Grid */}
      <WeeklyGrid 
        workers={workers}
        weekRange={weekRange}
        showAISuggestions={showAISuggestions}
      />
    </div>
  )
}

/**
 * Header component with navigation and team statistics
 */
interface WeeklyPlanningHeaderProps {
  weekRange: {
    startDate: Date
    endDate: Date
    weekDays: Date[]
  }
  onPreviousWeek: () => void
  onNextWeek: () => void
  onThisWeek: () => void
  showAISuggestions: boolean
  onToggleAI: () => void
  teamStats: {
    totalWorkers: number
    averageUtilization: number
    highEfficiencyWorkers: number
    totalRecommendations: number
  }
  loading: boolean
}

function WeeklyPlanningHeader({ 
  weekRange, 
  onPreviousWeek, 
  onNextWeek, 
  onThisWeek,
  showAISuggestions,
  onToggleAI,
  teamStats,
  loading
}: WeeklyPlanningHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviousWeek}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
              {format(weekRange.startDate, 'MMM d')} - {format(weekRange.endDate, 'MMM d, yyyy')}
            </h2>
            <p className="text-sm text-gray-500">
              Week of {format(weekRange.startDate, 'EEEE, MMMM d')}
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onNextWeek}
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onThisWeek}
            className="shrink-0"
          >
            <Calendar className="h-4 w-4 mr-1" />
            This Week
          </Button>
          
          <Button
            variant={showAISuggestions ? "default" : "outline"}
            size="sm"
            onClick={onToggleAI}
            className="shrink-0"
          >
            <Zap className="h-4 w-4 mr-1" />
            AI Suggestions
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Workers"
          value={teamStats.totalWorkers.toString()}
          loading={loading}
        />
        <StatCard
          icon={BarChart3}
          label="Avg Utilization"
          value={`${teamStats.averageUtilization}%`}
          loading={loading}
        />
        <StatCard
          icon={Zap}
          label="High Efficiency"
          value={`${teamStats.highEfficiencyWorkers}/${teamStats.totalWorkers}`}
          loading={loading}
        />
        <StatCard
          icon={RefreshCw}
          label="AI Suggestions"
          value={teamStats.totalRecommendations.toString()}
          loading={loading}
          highlight={teamStats.totalRecommendations > 0}
        />
      </div>
    </div>
  )
}

/**
 * Individual stat card component
 */
interface StatCardProps {
  icon: React.ComponentType<any>
  label: string
  value: string
  loading: boolean
  highlight?: boolean
}

function StatCard({ icon: Icon, label, value, loading, highlight }: StatCardProps) {
  return (
    <Card className={`${highlight ? 'border-purple-200 bg-purple-50' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${highlight ? 'text-purple-600' : 'text-gray-600'}`} />
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-medium ${highlight ? 'text-purple-700' : 'text-gray-600'}`}>
              {label}
            </p>
            <p className={`text-lg font-bold ${highlight ? 'text-purple-900' : 'text-gray-900'}`}>
              {loading ? '...' : value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for the weekly planning view
 */
function WeeklyPlanningLoader() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="h-24 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * Error display component
 */
function WeeklyPlanningError({ error }: { error: string }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-800">Error Loading Weekly Planning</CardTitle>
        <CardDescription className="text-red-600">
          {error}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="border-red-300 text-red-700 hover:bg-red-100"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </CardContent>
    </Card>
  )
} 