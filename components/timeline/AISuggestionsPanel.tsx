'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Zap, TrendingUp, BarChart3, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { AIRecommendation, WeeklyWorkerData } from '@/hooks/useWeeklyPlanningData'

interface AISuggestionsPanelProps {
  recommendations: AIRecommendation[]
  workers: WeeklyWorkerData[]
}

/**
 * AI Suggestions Panel component
 * Displays intelligent recommendations for schedule optimization
 */
export default function AISuggestionsPanel({ recommendations, workers }: AISuggestionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [dismissedRecommendations, setDismissedRecommendations] = useState<string[]>([])

  // Combine global and worker-specific recommendations
  const allRecommendations = [
    ...recommendations,
    ...workers.flatMap(worker => 
      worker.aiRecommendations.map(rec => ({ ...rec, workerName: worker.name }))
    )
  ].filter(rec => !dismissedRecommendations.includes(rec.id))

  // Group recommendations by type
  const groupedRecommendations = allRecommendations.reduce((groups, rec) => {
    if (!groups[rec.type]) {
      groups[rec.type] = []
    }
    groups[rec.type].push(rec)
    return groups
  }, {} as Record<string, (AIRecommendation & { workerName?: string })[]>)

  const handleDismissRecommendation = (id: string) => {
    setDismissedRecommendations(prev => [...prev, id])
  }

  if (allRecommendations.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            All Set! 🎉
          </h3>
          <p className="text-green-700">
            Your team's schedule is well-optimized. No AI recommendations at this time.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-purple-200 bg-purple-50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-purple-100 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-purple-900">
                    AI Recommendations
                  </CardTitle>
                  <CardDescription className="text-purple-700">
                    {allRecommendations.length} suggestion{allRecommendations.length !== 1 ? 's' : ''} to optimize your weekly schedule
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-purple-700 hover:bg-purple-200">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {Object.entries(groupedRecommendations).map(([type, recs]) => (
              <RecommendationGroup
                key={type}
                type={type as AIRecommendation['type']}
                recommendations={recs}
                onDismiss={handleDismissRecommendation}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

/**
 * Group of recommendations by type
 */
interface RecommendationGroupProps {
  type: AIRecommendation['type']
  recommendations: (AIRecommendation & { workerName?: string })[]
  onDismiss: (id: string) => void
}

function RecommendationGroup({ type, recommendations, onDismiss }: RecommendationGroupProps) {
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'workload_balance':
        return {
          icon: BarChart3,
          title: 'Workload Balance',
          color: 'blue',
          description: 'Optimize work distribution across your team'
        }
      case 'optimal_scheduling':
        return {
          icon: TrendingUp,
          title: 'Schedule Optimization',
          color: 'green',
          description: 'Improve scheduling efficiency and reduce gaps'
        }
      case 'efficiency_boost':
        return {
          icon: Zap,
          title: 'Efficiency Boost',
          color: 'orange',
          description: 'Maximize team productivity and utilization'
        }
      default:
        return {
          icon: AlertTriangle,
          title: 'General',
          color: 'gray',
          description: 'General recommendations'
        }
    }
  }

  const config = getTypeConfig(type)
  const Icon = config.icon

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 text-${config.color}-600`} />
        <h4 className="font-semibold text-gray-900">{config.title}</h4>
        <Badge variant="secondary" className="text-xs">
          {recommendations.length}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {recommendations.map((rec) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            config={config}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Individual recommendation card
 */
interface RecommendationCardProps {
  recommendation: AIRecommendation & { workerName?: string }
  config: {
    color: string
    icon: React.ComponentType<any>
  }
  onDismiss: (id: string) => void
}

function RecommendationCard({ recommendation, config, onDismiss }: RecommendationCardProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100'
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className={`p-4 bg-white border border-${config.color}-200 rounded-lg`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h5 className="font-medium text-gray-900">{recommendation.title}</h5>
            {recommendation.workerName && (
              <Badge variant="outline" className="text-xs">
                {recommendation.workerName}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-gray-600">
            {recommendation.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              <span className="font-medium">Suggested Action:</span> {recommendation.suggestedAction}
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={`text-xs ${getConfidenceColor(recommendation.confidence)}`}
              >
                {recommendation.confidence}% confidence
              </Badge>
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(recommendation.id)}
          className="shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 