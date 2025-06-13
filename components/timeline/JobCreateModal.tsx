import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Calendar, Clock, MapPin, User, AlertTriangle } from 'lucide-react'
import { formatGridTime } from '@/lib/timeline-grid'

interface Worker {
  id: string
  name: string
  status: 'available' | 'busy' | 'offline'
}

interface JobCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateJob: (jobData: any) => void
  workers: Worker[]
  selectedDate: Date
  initialTime?: { hour: number; minute: number }
  initialWorkerId?: string
}

export function JobCreateModal({
  isOpen,
  onClose,
  onCreateJob,
  workers,
  selectedDate,
  initialTime,
  initialWorkerId
}: JobCreateModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_name: '',
    location: '',
    worker_id: initialWorkerId || '',
    duration: 120, // 2 hours in minutes
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    hour: initialTime?.hour || 9,
    minute: initialTime?.minute || 0
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required'
    }

    if (!formData.client_name.trim()) {
      newErrors.client_name = 'Client name is required'
    }

    if (!formData.worker_id) {
      newErrors.worker_id = 'Please select a worker'
    }

    if (formData.duration < 15) {
      newErrors.duration = 'Duration must be at least 15 minutes'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Create the scheduled date/time
    const scheduledDate = new Date(selectedDate)
    scheduledDate.setHours(formData.hour, formData.minute, 0, 0)

    const jobData = {
      title: formData.title,
      description: formData.description,
      client_name: formData.client_name,
      location: formData.location,
      worker_id: formData.worker_id,
      scheduled_at: scheduledDate.toISOString(),
      duration: formData.duration,
      priority: formData.priority,
      status: 'scheduled'
    }

    onCreateJob(jobData)
    handleClose()
  }

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      client_name: '',
      location: '',
      worker_id: initialWorkerId || '',
      duration: 120,
      priority: 'medium',
      hour: initialTime?.hour || 9,
      minute: initialTime?.minute || 0
    })
    setErrors({})
    onClose()
  }

  const availableWorkers = workers.filter(w => w.status === 'available')
  const busyWorkers = workers.filter(w => w.status === 'busy')
  const offlineWorkers = workers.filter(w => w.status === 'offline')

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create New Job
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Kitchen Renovation"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Client Name */}
          <div className="space-y-2">
            <Label htmlFor="client_name">Client Name *</Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
              placeholder="e.g., John Smith"
              className={errors.client_name ? 'border-red-500' : ''}
            />
            {errors.client_name && <p className="text-sm text-red-500">{errors.client_name}</p>}
          </div>

          {/* Worker Assignment */}
          <div className="space-y-2">
            <Label htmlFor="worker_id">Assign Worker *</Label>
            <Select
              value={formData.worker_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, worker_id: value }))}
            >
              <SelectTrigger className={errors.worker_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a worker" />
              </SelectTrigger>
              <SelectContent>
                {availableWorkers.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50">
                      Available Workers
                    </div>
                    {availableWorkers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          {worker.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                
                {busyWorkers.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-yellow-600 bg-yellow-50">
                      Busy Workers
                    </div>
                    {busyWorkers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                          {worker.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}

                {offlineWorkers.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50">
                      Offline Workers
                    </div>
                    {offlineWorkers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-500 rounded-full" />
                          {worker.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            {errors.worker_id && <p className="text-sm text-red-500">{errors.worker_id}</p>}
          </div>

          {/* Time and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.hour.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, hour: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {formatGridTime(i, 0).split(' ')[0]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={formData.minute.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, minute: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 15, 30, 45].map((minute) => (
                      <SelectItem key={minute} value={minute.toString()}>
                        :{minute.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                step="15"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 120 }))}
                className={errors.duration ? 'border-red-500' : ''}
              />
              {errors.duration && <p className="text-sm text-red-500">{errors.duration}</p>}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                setFormData(prev => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    Low Priority
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    Medium Priority
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full" />
                    High Priority
                  </div>
                </SelectItem>
                <SelectItem value="urgent">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    Urgent
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., 123 Main St, City"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about the job..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Job
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 