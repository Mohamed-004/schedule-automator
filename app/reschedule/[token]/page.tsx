'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Calendar, Clock, User, CheckCircle, AlertTriangle, Building } from 'lucide-react'
import { toast } from 'sonner'

interface RescheduleData {
  token: {
    id: string
    expires_at: string
    client_name: string
    client_contact: string
  }
  job: {
    id: string
    title: string
    description?: string
    scheduled_at: string
    duration_minutes: number
    location?: string
  }
  business: {
    name: string
    timezone: string
  }
  currentWorker: {
    name: string
    email: string
  }
  client: {
    name: string
    phone?: string
    email?: string
  }
  rescheduleOptions: Array<{
    suggested_date: string
    worker_id: string
    worker_name: string
    confidence_score: number
    reason: string
  }>
  availableSlots: number
}

export default function ClientReschedulePage() {
  const params = useParams()
  const token = params.token as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rescheduleData, setRescheduleData] = useState<RescheduleData | null>(null)
  const [selectedOption, setSelectedOption] = useState<RescheduleData['rescheduleOptions'][0] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (token) {
      loadRescheduleData()
    }
  }, [token])

  const loadRescheduleData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/reschedule/${token}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load reschedule information')
      }

      setRescheduleData(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const confirmReschedule = async () => {
    if (!selectedOption || !rescheduleData) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/reschedule/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedDateTime: selectedOption.suggested_date,
          selectedWorkerId: selectedOption.worker_id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reschedule appointment')
      }

      setSuccess(true)
      toast.success('Appointment rescheduled successfully!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reschedule'
      toast.error('Failed to reschedule appointment', { description: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200'
    return 'text-yellow-600 bg-yellow-50 border-yellow-200'
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-lg text-gray-600">Loading reschedule information...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={loadRescheduleData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Rescheduled!</h1>
            <p className="text-gray-600 mb-6">
              Your appointment has been successfully rescheduled. You should receive a confirmation shortly.
            </p>
            {selectedOption && rescheduleData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                <h3 className="font-medium text-green-800 mb-2">New Appointment Details:</h3>
                <div className="space-y-1 text-sm text-green-700">
                  <p><strong>Service:</strong> {rescheduleData.job.title}</p>
                  <p><strong>Date:</strong> {formatDateTime(selectedOption.suggested_date).date}</p>
                  <p><strong>Time:</strong> {formatDateTime(selectedOption.suggested_date).time}</p>
                  <p><strong>Worker:</strong> {selectedOption.worker_name}</p>
                  <p><strong>Duration:</strong> {rescheduleData.job.duration_minutes} minutes</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!rescheduleData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h1>
            <p className="text-gray-600">Unable to load reschedule information.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">{rescheduleData.business.name}</h1>
          </div>
          <h2 className="text-xl text-gray-600">Reschedule Your Appointment</h2>
        </div>

        {/* Current Appointment Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Current Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">{rescheduleData.job.title}</h3>
                {rescheduleData.job.description && (
                  <p className="text-gray-600 mb-3">{rescheduleData.job.description}</p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Client: {rescheduleData.client.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Worker: {rescheduleData.currentWorker.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>Duration: {rescheduleData.job.duration_minutes} minutes</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Currently Scheduled:</h4>
                <div className="text-red-700">
                  <p className="font-medium">{formatDateTime(rescheduleData.job.scheduled_at).date}</p>
                  <p className="text-lg font-bold">{formatDateTime(rescheduleData.job.scheduled_at).time}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Time Slots */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Available Time Slots
              </span>
              <Badge variant="outline">
                {rescheduleData.availableSlots} options available
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rescheduleData.rescheduleOptions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Available Slots</h3>
                <p className="text-gray-500">
                  Unfortunately, there are no available time slots at the moment. 
                  Please contact us directly to reschedule your appointment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rescheduleData.rescheduleOptions.map((option, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedOption === option
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedOption(option)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {formatDateTime(option.suggested_date).date}
                        </h4>
                        <p className="text-lg font-bold text-blue-600">
                          {formatDateTime(option.suggested_date).time}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-md border ${getConfidenceColor(option.confidence_score)}`}>
                        <span className="text-sm font-medium">{option.confidence_score}%</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Worker: {option.worker_name}</span>
                      </div>
                      <p className="text-sm text-gray-600">{option.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirmation */}
        {selectedOption && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Confirm Reschedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-green-800 mb-2">New Appointment Details:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
                  <div>
                    <p><strong>Service:</strong> {rescheduleData.job.title}</p>
                    <p><strong>Date:</strong> {formatDateTime(selectedOption.suggested_date).date}</p>
                    <p><strong>Time:</strong> {formatDateTime(selectedOption.suggested_date).time}</p>
                  </div>
                  <div>
                    <p><strong>Worker:</strong> {selectedOption.worker_name}</p>
                    <p><strong>Duration:</strong> {rescheduleData.job.duration_minutes} minutes</p>
                    <p><strong>Confidence:</strong> {selectedOption.confidence_score}% match</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedOption(null)}
                  disabled={isSubmitting}
                >
                  Change Selection
                </Button>
                <Button
                  onClick={confirmReschedule}
                  disabled={isSubmitting}
                  className="min-w-[140px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Confirming...
                    </>
                  ) : (
                    'Confirm Reschedule'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Link expires: {new Date(rescheduleData.token.expires_at).toLocaleString()}
          </p>
          <p className="mt-2">
            Need help? Contact {rescheduleData.business.name} directly.
          </p>
        </div>
      </div>
    </div>
  )
} 