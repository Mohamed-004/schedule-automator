'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSupabase } from '@/lib/SupabaseProvider'
import { useBusiness } from '@/hooks/use-business'
import { AlertCircle, CheckCircle, User, Building } from 'lucide-react'

export default function DebugAvailability() {
  const { supabase, user, session } = useSupabase()
  const { business, loading: businessLoading } = useBusiness()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ [key: string]: any }>({})

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(true)
    try {
      const result = await testFn()
      setResults(prev => ({
        ...prev,
        [testName]: { success: true, data: result }
      }))
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [testName]: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }))
    }
    setLoading(false)
  }

  const testAuth = async () => {
    if (!supabase) throw new Error('Supabase not initialized')
    
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    
    return {
      session: !!session,
      user: session?.user?.email || 'None',
      userId: session?.user?.id || 'None'
    }
  }

  const testBusiness = async () => {
    if (!supabase || !user) throw new Error('No authenticated user')
    
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)
      
    if (error) throw error
    
    return data || []
  }

  const testWorkers = async () => {
    if (!supabase || !user) throw new Error('No authenticated user')
    
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .limit(5)
      
    if (error) throw error
    
    return data || []
  }

  const testAvailabilityAccess = async () => {
    if (!supabase || !user) throw new Error('No authenticated user')
    
    // Try to access the availability tables
    const { data: availData, error: availError } = await supabase
      .from('worker_weekly_availability')
      .select('*')
      .limit(1)
    
    const { data: exceptData, error: exceptError } = await supabase
      .from('worker_availability_exceptions')
      .select('*')
      .limit(1)
    
    return {
      weekly_availability: {
        accessible: !availError,
        error: availError?.message,
        count: availData?.length || 0
      },
      exceptions: {
        accessible: !exceptError,
        error: exceptError?.message,
        count: exceptData?.length || 0
      }
    }
  }

  const createTestWorker = async () => {
    if (!supabase || !business) throw new Error('No business found')
    
    const { data, error } = await supabase
      .from('workers')
      .insert({
        business_id: business.id,
        name: 'Test Worker',
        email: 'test@worker.com',
        phone: '555-0123',
        role: 'technician',
        status: 'active'
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  const ResultCard = ({ title, result }: { title: string, result: any }) => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {result?.success ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result ? (
          <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-500">Not tested yet</p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Session:</strong> {session ? '✅ Active' : '❌ None'}</p>
            <p><strong>User:</strong> {user?.email || 'None'}</p>
            <p><strong>User ID:</strong> {user?.id || 'None'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Business Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Loading:</strong> {businessLoading ? 'Yes' : 'No'}</p>
            <p><strong>Business:</strong> {business ? business.name : 'None'}</p>
            <p><strong>Business ID:</strong> {business?.id || 'None'}</p>
            <p><strong>Business Email:</strong> {business?.email || 'None'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button 
          onClick={() => runTest('auth', testAuth)} 
          disabled={loading}
          variant="outline"
        >
          Test Authentication
        </Button>
        
        <Button 
          onClick={() => runTest('business', testBusiness)} 
          disabled={loading}
          variant="outline"
        >
          Test Business Access
        </Button>
        
        <Button 
          onClick={() => runTest('workers', testWorkers)} 
          disabled={loading}
          variant="outline"
        >
          Test Workers Access
        </Button>
        
        <Button 
          onClick={() => runTest('availability', testAvailabilityAccess)} 
          disabled={loading}
          variant="outline"
        >
          Test Availability Tables
        </Button>
        
        <Button 
          onClick={() => runTest('createWorker', createTestWorker)} 
          disabled={loading || !business}
          variant="outline"
        >
          Create Test Worker
        </Button>
      </div>

      <div className="space-y-4">
        {Object.entries(results).map(([testName, result]) => (
          <ResultCard key={testName} title={testName} result={result} />
        ))}
      </div>
    </div>
  )
} 