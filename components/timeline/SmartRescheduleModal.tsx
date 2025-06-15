'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Loader2, Calendar, Send, User, Phone, Mail, CheckCircle, AlertTriangle, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface Job {
  id: string
  title: string
  scheduled_at: string
  duration_minutes: number
}

interface Client {
  name: string
  phone?: string
  email?: string
}

interface RescheduleOption {
  suggested_date: string
  worker_id: string
  worker_name: string
  confidence_score: number
  reason: string
}

interface RescheduleData {
  job: Job
  client: Client
  rescheduleOptions: RescheduleOption[]
  generatedAt: string
}

interface SmartRescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
  onRescheduleComplete?: (data: any) => void
}

export function SmartRescheduleModal({ isOpen, onClose, jobId, onRescheduleComplete }: SmartRescheduleModalProps) {
  const [activeTab, setActiveTab] = useState<'client-link' | 'manual'>('client-link')
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rescheduleData, setRescheduleData] = useState<RescheduleData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Client Link Tab State
  const [notificationMethod, setNotificationMethod] = useState<'sms' | 'email'>('sms')
  const [customMessage, setCustomMessage] = useState('')
  const [linkResult, setLinkResult] = useState<any>(null)

  // Manual Reschedule Tab State
  const [selectedOption, setSelectedOption] = useState<RescheduleOption | null>(null)
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [notifyClient, setNotifyClient] = useState(true)

  // Load reschedule options when modal opens
  useEffect(() => {
    if (isOpen && jobId) {
      loadRescheduleOptions()
    }
  }, [isOpen, jobId])

  const loadRescheduleOptions = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-options', daysAhead: 14 })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load reschedule options')
      }

      setRescheduleData(result.data)
      
      // Set default notification method based on client contact info
      if (result.data.client.phone) {
        setNotificationMethod('sms')
      } else if (result.data.client.email) {
        setNotificationMethod('email')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
      toast.error('Failed to load reschedule options', { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  const sendClientLink = async () => {
    if (!rescheduleData) return

    setIsProcessing(true)
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-client-link',
          method: notificationMethod,
          message: customMessage || undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reschedule link')
      }

      setLinkResult(result.data)
      toast.success('Reschedule link sent successfully!', {
        description: `Link sent via ${notificationMethod} to ${result.data.recipient}`
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send link'
      toast.error('Failed to send reschedule link', { description: errorMessage })
    } finally {
      setIsProcessing(false)
    }
  }

  const executeManualReschedule = async () => {
    if (!rescheduleData || !selectedOption) return

    setIsProcessing(true)
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual-reschedule',
          newDateTime: selectedOption.suggested_date,
          newWorkerId: selectedOption.worker_id,
          reason: rescheduleReason || undefined,
          notifyClient
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reschedule job')
      }

      toast.success('Job rescheduled successfully!', {
        description: result.data.message
      })

      onRescheduleComplete?.(result.data)
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reschedule'
      toast.error('Failed to reschedule job', { description: errorMessage })
    } finally {
      setIsProcessing(false)
    }
  }

  const copyLinkToClipboard = () => {
    if (linkResult?.rescheduleUrl) {
      navigator.clipboard.writeText(linkResult.rescheduleUrl)
      toast.success('Link copied to clipboard!')
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200'
    return 'text-yellow-600 bg-yellow-50 border-yellow-200'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Smart Reschedule
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-lg">Loading reschedule options...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Data</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadRescheduleOptions} variant="outline">
              Try Again
            </Button>
          </div>
        ) : rescheduleData ? (
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
                    <p className="font-medium">{rescheduleData.job.title}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Current Time</Label>
                    <p className="font-medium">
                      {new Date(rescheduleData.job.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Client</Label>
                    <p className="font-medium">{rescheduleData.client.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reschedule Options */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="client-link" className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Send Client Link
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Manual Reschedule
                </TabsTrigger>
              </TabsList>

              <TabsContent value="client-link" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Send Reschedule Link to Client</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {linkResult ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-800">Link Sent Successfully!</span>
                          </div>
                          <p className="text-sm text-green-700 mb-3">
                            Reschedule link sent via {linkResult.method} to {linkResult.recipient}
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              value={linkResult.rescheduleUrl}
                              readOnly
                              className="text-sm"
                            />
                            <Button size="sm" variant="outline" onClick={copyLinkToClipboard}>
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-green-600 mt-2">
                            Link expires: {new Date(linkResult.expiresAt).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Note:</strong> {linkResult.note}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label className="text-sm font-medium">Notification Method</Label>
                          <Select value={notificationMethod} onValueChange={(value: 'sms' | 'email') => setNotificationMethod(value)}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {rescheduleData.client.phone && (
                                <SelectItem value="sms">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    SMS - {rescheduleData.client.phone}
                                  </div>
                                </SelectItem>
                              )}
                              {rescheduleData.client.email && (
                                <SelectItem value="email">
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Email - {rescheduleData.client.email}
                                  </div>
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="custom-message">Custom Message (Optional)</Label>
                          <Textarea
                            id="custom-message"
                            placeholder="Enter custom message or leave blank for default..."
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            className="mt-1"
                            rows={3}
                          />
                        </div>

                        <Button
                          onClick={sendClientLink}
                          disabled={isProcessing || (!rescheduleData.client.phone && !rescheduleData.client.email)}
                          className="w-full"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Sending Link...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Reschedule Link
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Available Time Slots</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {rescheduleData.rescheduleOptions.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-600 mb-2">No Available Slots</h3>
                        <p className="text-gray-500">
                          No suitable time slots found in the next 14 days.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
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
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-medium">
                                    {new Date(option.suggested_date).toLocaleString()}
                                  </h4>
                                  <Badge variant="outline">
                                    {option.worker_name}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">{option.reason}</p>
                              </div>
                              
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-md border ${getConfidenceColor(option.confidence_score)}`}>
                                <span className="font-medium">{option.confidence_score}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Reschedule Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="reschedule-reason">Reason for Reschedule (Optional)</Label>
                      <Textarea
                        id="reschedule-reason"
                        placeholder="Enter reason for rescheduling..."
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="notify-client"
                        checked={notifyClient}
                        onCheckedChange={setNotifyClient}
                      />
                      <Label htmlFor="notify-client">Notify client of the change</Label>
                    </div>

                    {selectedOption && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-800">Ready to Reschedule</span>
                        </div>
                        <p className="text-sm text-green-700">
                          New Time: {new Date(selectedOption.suggested_date).toLocaleString()}
                        </p>
                        <p className="text-sm text-green-700">
                          Worker: {selectedOption.worker_name}
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={executeManualReschedule}
                      disabled={!selectedOption || isProcessing}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Rescheduling...
                        </>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4 mr-2" />
                          Confirm Reschedule
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
} 