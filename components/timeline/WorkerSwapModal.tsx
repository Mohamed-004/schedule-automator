'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, Users, Clock, TrendingUp, CheckCircle, AlertTriangle, User, Calendar, ArrowRight, Zap, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Job {
  id: string
  title: string
  scheduled_at: string
  duration_minutes: number
}

interface Worker {
  id: string
  name: string
  email: string
}

interface CompatibleWorker {
  worker_id: string
  worker_name: string
  worker_email: string
  compatibility_score: number
  availability_status: 'available' | 'unavailable'
  workload_impact: number
  skill_match_score: number
  reason: string
}

interface WorkerSwapData {
  job: Job
  currentWorker: Worker
  compatibleWorkers: CompatibleWorker[]
  totalOptions: number
  availableOptions: number
}

interface WorkerSwapModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
  onSwapComplete?: (data: any) => void
}

interface QuickAssignForm {
  title: string
  description: string
  clientId: string
  duration: number
  location: string
}

export function WorkerSwapModal({ isOpen, onClose, jobId, onSwapComplete }: WorkerSwapModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [swapData, setSwapData] = useState<WorkerSwapData | null>(null)
  const [selectedWorker, setSelectedWorker] = useState<CompatibleWorker | null>(null)
  const [swapReason, setSwapReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showQuickAssign, setShowQuickAssign] = useState<string | null>(null)
  const [quickAssignForm, setQuickAssignForm] = useState<QuickAssignForm>({
    title: '',
    description: '',
    clientId: '',
    duration: 60,
    location: ''
  })
  const [isCreatingJob, setIsCreatingJob] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const router = useRouter()

  // Load compatible workers when modal opens
  useEffect(() => {
    if (isOpen && jobId) {
      loadCompatibleWorkers()
      loadClients()
    }
  }, [isOpen, jobId])

  const loadCompatibleWorkers = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/swap-worker`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load compatible workers')
      }

      setSwapData(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
      toast.error('Failed to load compatible workers', { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const result = await response.json()
      if (response.ok) {
        setClients(result.data || [])
      }
    } catch (err) {
      console.error('Failed to load clients:', err)
    }
  }

  const executeSwap = async () => {
    if (!selectedWorker || !swapData) return

    setIsSwapping(true)
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/swap-worker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newWorkerId: selectedWorker.worker_id,
          reason: swapReason || undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to swap worker')
      }

      toast.success('Worker swapped successfully!', {
        description: result.data.message
      })

      onSwapComplete?.(result.data)
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to swap worker'
      toast.error('Failed to swap worker', { description: errorMessage })
    } finally {
      setIsSwapping(false)
    }
  }

  const handleQuickAssign = (worker: CompatibleWorker) => {
    setShowQuickAssign(worker.worker_id)
    setQuickAssignForm({
      title: '',
      description: '',
      clientId: '',
      duration: 60,
      location: ''
    })
  }

  const createQuickJob = async (worker: CompatibleWorker) => {
    if (!swapData || !quickAssignForm.title || !quickAssignForm.clientId) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsCreatingJob(true)

    try {
      // Calculate the time slot for the same date
      const originalDate = new Date(swapData.job.scheduled_at)
      const jobDate = originalDate.toISOString().split('T')[0] // Same date as original job
      
      // Find an available time slot (you might want to make this more sophisticated)
      const startTime = '10:00' // Default start time, could be made dynamic
      const [hours, minutes] = startTime.split(':').map(Number)
      const startDateTime = new Date(originalDate)
      startDateTime.setHours(hours, minutes, 0, 0)
      
      const endDateTime = new Date(startDateTime)
      endDateTime.setMinutes(endDateTime.getMinutes() + quickAssignForm.duration)

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickAssignForm.title,
          description: quickAssignForm.description || '',
          client_id: quickAssignForm.clientId,
          worker_id: worker.worker_id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          duration_minutes: quickAssignForm.duration,
          status: 'scheduled',
          priority: 'normal',
          location: quickAssignForm.location || 'TBD'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create job')
      }

      toast.success('Job created successfully!', {
        description: `Assigned to ${worker.worker_name} on ${jobDate}`
      })

      setShowQuickAssign(null)
      onClose()
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create job'
      toast.error('Failed to create job', { description: errorMessage })
    } finally {
      setIsCreatingJob(false)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'available') {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-medium px-3 py-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
          Available
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 font-medium px-3 py-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
        Unavailable
      </Badge>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200'
    return 'text-red-700 bg-red-50 border-red-200'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4" />
    if (score >= 60) return <TrendingUp className="w-4 h-4" />
    return <AlertTriangle className="w-4 h-4" />
  }

  const getWorkloadColor = (impact: number) => {
    if (impact <= 5) return 'text-green-600'
    if (impact <= 15) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Swap Worker Assignment
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-lg">Loading compatible workers...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Data</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadCompatibleWorkers} variant="outline">
              Try Again
            </Button>
          </div>
        ) : swapData ? (
          <div className="space-y-6">
            {/* Job Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Job Title</Label>
                    <p className="font-medium">{swapData.job.title}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Scheduled Time</Label>
                    <p className="font-medium">
                      {new Date(swapData.job.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Duration</Label>
                    <p className="font-medium">{swapData.job.duration_minutes} minutes</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Current Worker:</span>
                    <span className="text-blue-700">{swapData.currentWorker.name}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compatible Workers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Compatible Workers</span>
                  <Badge variant="outline" className="text-sm">
                    {swapData.availableOptions} of {swapData.totalOptions} available
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {swapData.compatibleWorkers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No Compatible Workers</h3>
                    <p className="text-gray-500">
                      No other workers are available for this time slot.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {swapData.compatibleWorkers.map((worker) => (
                      <div key={worker.worker_id}>
                        <div
                          className={`p-5 border rounded-xl transition-all ${
                            selectedWorker?.worker_id === worker.worker_id
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : worker.availability_status === 'available'
                              ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
                              : 'border-gray-200 bg-gray-50 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h4 className="font-semibold text-lg">{worker.worker_name}</h4>
                                {getStatusBadge(worker.availability_status)}
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{worker.worker_email}</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{worker.reason}</p>
                            </div>
                            
                            <div className="flex items-center gap-4 ml-4">
                              {/* Compatibility Score */}
                              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getScoreColor(worker.compatibility_score)}`}>
                                {getScoreIcon(worker.compatibility_score)}
                                <div className="text-center">
                                  <div className="font-bold text-lg">{worker.compatibility_score}%</div>
                                  <div className="text-xs opacity-75">Match</div>
                                </div>
                              </div>
                              
                              {/* Workload Impact */}
                              <div className="text-center">
                                <div className={`font-semibold text-lg ${getWorkloadColor(worker.workload_impact)}`}>
                                  +{worker.workload_impact}%
                                </div>
                                <div className="text-xs text-gray-500">Workload</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                            <div className="flex gap-3">
                              {worker.availability_status === 'available' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleQuickAssign(worker)}
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                                  >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Quick Assign</span>
                                    <span className="sm:hidden">Assign</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedWorker(worker)}
                                    className={`flex items-center gap-2 px-4 py-2 transition-all duration-200 ${
                                      selectedWorker?.worker_id === worker.worker_id
                                        ? 'bg-blue-600 hover:bg-blue-700 shadow-md'
                                        : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md'
                                    }`}
                                  >
                                    <Zap className="w-4 h-4" />
                                    <span className="hidden sm:inline">
                                      {selectedWorker?.worker_id === worker.worker_id ? 'Selected for Swap' : 'Select for Swap'}
                                    </span>
                                    <span className="sm:hidden">
                                      {selectedWorker?.worker_id === worker.worker_id ? 'Selected' : 'Select'}
                                    </span>
                                  </Button>
                                </>
                              )}
                              {worker.availability_status === 'unavailable' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled
                                  className="text-gray-500 cursor-not-allowed px-4 py-2"
                                >
                                  <span className="hidden sm:inline">Not Available</span>
                                  <span className="sm:hidden">Unavailable</span>
                                </Button>
                              )}
                            </div>
                            
                            {worker.availability_status === 'available' && (
                              <div className="text-xs text-gray-500 hidden md:block">
                                Available for {new Date(swapData.job.scheduled_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Assign Form */}
                        {showQuickAssign === worker.worker_id && (
                          <Card className="mt-4 border-blue-200 bg-blue-50/50">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Calendar className="w-5 h-5 text-blue-600" />
                                  Quick Assign to {worker.worker_name}
                                </CardTitle>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowQuickAssign(null)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              <p className="text-sm text-gray-600">
                                Create a new job for {new Date(swapData.job.scheduled_at).toLocaleDateString()}
                              </p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="job-title">Job Title *</Label>
                                  <Input
                                    id="job-title"
                                    value={quickAssignForm.title}
                                    onChange={(e) => setQuickAssignForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Enter job title..."
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="client-select">Client *</Label>
                                  <select
                                    id="client-select"
                                    value={quickAssignForm.clientId}
                                    onChange={(e) => setQuickAssignForm(prev => ({ ...prev, clientId: e.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">Select a client...</option>
                                    {clients.map((client) => (
                                      <option key={client.id} value={client.id}>
                                        {client.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label htmlFor="job-description">Description</Label>
                                  <Textarea
                                    id="job-description"
                                    value={quickAssignForm.description}
                                    onChange={(e) => setQuickAssignForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Job description..."
                                    className="mt-1"
                                    rows={3}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="job-location">Location</Label>
                                  <Input
                                    id="job-location"
                                    value={quickAssignForm.location}
                                    onChange={(e) => setQuickAssignForm(prev => ({ ...prev, location: e.target.value }))}
                                    placeholder="Job location..."
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="job-duration">Duration (minutes)</Label>
                                  <Input
                                    id="job-duration"
                                    type="number"
                                    value={quickAssignForm.duration}
                                    onChange={(e) => setQuickAssignForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                                    className="mt-1"
                                    min="15"
                                    step="15"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button
                                  variant="outline"
                                  onClick={() => setShowQuickAssign(null)}
                                  disabled={isCreatingJob}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => createQuickJob(worker)}
                                  disabled={isCreatingJob || !quickAssignForm.title || !quickAssignForm.clientId}
                                  className="min-w-[120px]"
                                >
                                  {isCreatingJob ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      Creating...
                                    </>
                                  ) : (
                                    'Create Job'
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Swap Reason */}
            {selectedWorker && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Swap Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="swap-reason">Reason for Swap (Optional)</Label>
                      <Textarea
                        id="swap-reason"
                        placeholder="Enter reason for worker swap..."
                        value={swapReason}
                        onChange={(e) => setSwapReason(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-800">Ready to Swap</span>
                      </div>
                      <p className="text-sm text-green-700 mb-1">
                        {swapData.currentWorker.name} → {selectedWorker.worker_name}
                      </p>
                      <p className="text-xs text-green-600">
                        Compatibility Score: {selectedWorker.compatibility_score}% | Workload Impact: +{selectedWorker.workload_impact}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isSwapping}>
                Cancel
              </Button>
              <Button
                onClick={executeSwap}
                disabled={!selectedWorker || isSwapping}
                className="min-w-[140px]"
              >
                {isSwapping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Swapping...
                  </>
                ) : (
                  'Confirm Swap'
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
} 