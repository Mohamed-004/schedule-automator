'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSupabase } from '@/lib/SupabaseProvider'
import { useWorkerAvailability } from '@/hooks/use-worker-availability'
import { AvailabilitySlot } from '@/lib/types'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function TestAvailabilityPage() {
  const { supabase, user, session } = useSupabase()
  const [workerId, setWorkerId] = useState('33333333-3333-3333-3333-333333333333')
  const [testSlots, setTestSlots] = useState<AvailabilitySlot[]>([
    { id: '', day: 1, start: '09:00', end: '17:00' }, // Monday
    { id: '', day: 2, start: '09:00', end: '17:00' }, // Tuesday
    { id: '', day: 3, start: '09:00', end: '17:00' }, // Wednesday
    { id: '', day: 4, start: '09:00', end: '17:00' }, // Thursday
    { id: '', day: 5, start: '09:00', end: '17:00' }, // Friday
  ])
  
  const { 
    weeklyAvailability, 
    isLoading, 
    error, 
    saveWeeklyAvailability,
    loadAvailability
  } = useWorkerAvailability(workerId)
  
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleTestSave = async () => {
    setIsSaving(true)
    setSaveResult(null)
    
    try {
      await saveWeeklyAvailability(testSlots)
      setSaveResult({ success: true, message: 'Save successful! ✅' })
    } catch (error) {
      setSaveResult({ 
        success: false, 
        message: `Save failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestAuth = async () => {
    if (!supabase) return
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      console.log('🔐 Auth test result:', { user, error })
      
      if (error) {
        setSaveResult({ success: false, message: `Auth error: ${error.message}` })
      } else if (user) {
        setSaveResult({ success: true, message: `Authenticated as: ${user.email}` })
      } else {
        setSaveResult({ success: false, message: 'No user authenticated' })
      }
    } catch (error) {
      setSaveResult({ success: false, message: `Auth test failed: ${error}` })
    }
  }

  const handleTestDatabase = async () => {
    if (!supabase) return
    
    try {
      const { data, error } = await supabase
        .from('worker_weekly_availability')
        .select('*')
        .limit(1)
      
      console.log('🗄️ Database test result:', { data, error })
      
      if (error) {
        setSaveResult({ success: false, message: `Database error: ${error.message}` })
      } else {
        setSaveResult({ success: true, message: `Database accessible. Found ${data?.length || 0} records.` })
      }
    } catch (error) {
      setSaveResult({ success: false, message: `Database test failed: ${error}` })
    }
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🧪 Availability Save Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Authentication Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <strong>Session:</strong> {session ? '✅ Active' : '❌ None'}
            </div>
            <div>
              <strong>User:</strong> {user?.email || 'None'}
            </div>
            <div>
              <strong>User ID:</strong> {user?.id?.slice(0, 8) || 'None'}...
            </div>
          </div>

          {/* Worker ID Input */}
          <div>
            <Label htmlFor="workerId">Worker ID</Label>
            <Input
              id="workerId"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              placeholder="Enter worker ID to test"
            />
            <p className="text-sm text-gray-500 mt-1">
              Default: 33333333-3333-3333-3333-333333333333 (test worker)
            </p>
          </div>

          {/* Test Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleTestAuth} variant="outline">
              Test Authentication
            </Button>
            <Button onClick={handleTestDatabase} variant="outline">
              Test Database
            </Button>
            <Button onClick={loadAvailability} variant="outline" disabled={isLoading}>
              Load Availability
            </Button>
            <Button 
              onClick={handleTestSave} 
              disabled={isSaving || !workerId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Test Save Availability'
              )}
            </Button>
          </div>

          {/* Result Display */}
          {saveResult && (
            <div className={`p-4 rounded-lg border flex items-center gap-2 ${
              saveResult.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {saveResult.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{saveResult.message}</span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 rounded-lg border bg-red-50 border-red-200 text-red-800">
              <strong>Hook Error:</strong> {error.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Slots Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {testSlots.map((slot, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                <div className="w-20 font-medium">
                  {dayNames[slot.day]}
                </div>
                <Input
                  type="time"
                  value={slot.start}
                  onChange={(e) => {
                    const newSlots = [...testSlots]
                    newSlots[index].start = e.target.value
                    setTestSlots(newSlots)
                  }}
                  className="w-32"
                />
                <span>to</span>
                <Input
                  type="time"
                  value={slot.end}
                  onChange={(e) => {
                    const newSlots = [...testSlots]
                    newSlots[index].end = e.target.value
                    setTestSlots(newSlots)
                  }}
                  className="w-32"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Availability Display */}
      <Card>
        <CardHeader>
          <CardTitle>Current Saved Availability</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : weeklyAvailability.length === 0 ? (
            <p className="text-gray-500">No availability set</p>
          ) : (
            <div className="space-y-2">
              {weeklyAvailability.map((slot) => (
                <div key={slot.id} className="flex items-center gap-4 p-2 bg-green-50 rounded">
                  <span className="w-20 font-medium">{dayNames[slot.day]}</span>
                  <span>{slot.start} - {slot.end}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 