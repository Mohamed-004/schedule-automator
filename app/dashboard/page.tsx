'use client'

import { useBusiness } from '@/hooks/use-business'
import { useJobs } from '@/hooks/use-jobs'
import JobCard from '@/components/dashboard/job-card'
import JobForm from '@/components/dashboard/job-form'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function DashboardPage() {
  const { business, loading: businessLoading } = useBusiness()
  const { jobs, loading: jobsLoading, error, refresh } = useJobs()
  const [showAddJob, setShowAddJob] = useState(false)
  const [jobError, setJobError] = useState<string | null>(null)
  const [savingJob, setSavingJob] = useState(false)
  const supabase = createClientComponentClient()

  if (businessLoading || jobsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">No business found. Please create a business profile.</p>
      </div>
    )
  }

  const today = new Date()
  const todayJobs = jobs?.filter(job => {
    const jobDate = new Date(job.scheduled_at)
    return jobDate.toDateString() === today.toDateString()
  }) || []

  const handleAddJob = async (form: any) => {
    setSavingJob(true)
    setJobError(null)
    const { error: insertError } = await supabase.from('jobs').insert([
      {
        ...form,
        business_id: business.id,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
      },
    ])
    setSavingJob(false)
    if (insertError) {
      setJobError(insertError.message)
      return
    }
    setShowAddJob(false)
    refresh && refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Today's Schedule</h1>
          <div className="text-gray-500 text-sm">
            {today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <Button onClick={() => setShowAddJob(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Job
        </Button>
      </div>
      <div>
        {todayJobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">No jobs scheduled for today.</div>
            <Button onClick={() => setShowAddJob(true)} className="flex items-center gap-2 mx-auto">
              <Plus className="h-4 w-4" /> Add Your First Job
            </Button>
          </div>
        ) : (
          todayJobs.map(job => <JobCard key={job.id} job={job} />)
        )}
      </div>
      {/* Add Job Modal */}
      {showAddJob && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add Job</h2>
            {jobError && <div className="text-red-500 text-sm mb-2">{jobError}</div>}
            <JobForm
              onSubmit={handleAddJob}
              onCancel={() => setShowAddJob(false)}
              saving={savingJob}
            />
          </div>
        </div>
      )}
    </div>
  )
} 
 
 