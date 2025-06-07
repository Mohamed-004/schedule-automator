'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWorkerAvailability } from '@/hooks/use-worker-availability'
import WeeklyAvailabilityEditor from './WeeklyAvailabilityEditor'
import AvailabilityExceptions from './AvailabilityExceptions'
import { useWorkers } from '@/hooks/use-workers'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

interface WorkerAvailabilityManagerProps {
  initialWorkerId?: string
  isAdmin?: boolean
}

export default function WorkerAvailabilityManager({
  initialWorkerId,
  isAdmin = false,
}: WorkerAvailabilityManagerProps) {
  const { workers = [], loading: workersLoading } = useWorkers()
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(initialWorkerId || '')
  const { toast } = useToast()
  
  // Set initial worker if none provided and workers are loaded
  useEffect(() => {
    if (!initialWorkerId && workers.length > 0 && !selectedWorkerId) {
      setSelectedWorkerId(workers[0].id)
      toast({
        title: 'Worker Selected',
        description: `${workers[0].name} has been automatically selected.`,
        variant: 'info'
      })
    }
  }, [workers, initialWorkerId, selectedWorkerId])
  
  const {
    weeklyAvailability,
    exceptions,
    isLoading,
    saveWeeklyAvailability,
    saveException,
    deleteException,
  } = useWorkerAvailability(selectedWorkerId)
  
  // Handle worker selection (for admin view)
  const handleWorkerChange = (workerId: string) => {
    setSelectedWorkerId(workerId)
  }
  
  // Worker selector UI for admins
  const renderWorkerSelector = () => {
    if (!isAdmin) return null
    
    return (
      <div className="mb-6">
        <Select
          value={selectedWorkerId}
          onValueChange={handleWorkerChange}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select a worker" />
          </SelectTrigger>
          <SelectContent>
            {workers.map((worker) => (
              <SelectItem key={worker.id} value={worker.id}>
                {worker.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }
  
  // Loading state for workers
  if (workersLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-[250px]" />
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // No workers available
  if (isAdmin && workers.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No workers available. Please add workers first.</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // No worker selected (admin view only)
  if (!selectedWorkerId && isAdmin) {
    return (
      <div className="space-y-6">
        {renderWorkerSelector()}
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Please select a worker to manage their availability</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Loading availability data
  if (isLoading && selectedWorkerId) {
    return (
      <div className="space-y-6">
        {renderWorkerSelector()}
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {renderWorkerSelector()}
      
      <Tabs defaultValue="weekly">
        <TabsList>
          <TabsTrigger value="weekly">Weekly Schedule</TabsTrigger>
          <TabsTrigger value="exceptions">Time Off & Exceptions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="weekly" className="mt-6">
          <WeeklyAvailabilityEditor
            slots={weeklyAvailability || []}
            onSave={saveWeeklyAvailability}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="exceptions" className="mt-6">
          <AvailabilityExceptions
            exceptions={exceptions || []}
            onSave={saveException}
            onDelete={deleteException}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
} 