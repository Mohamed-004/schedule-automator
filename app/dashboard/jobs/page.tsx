'use client'

import { JobsPanel } from '@/components/jobs-panel'
import { useJobs } from '@/hooks/use-jobs'

export default function JobsPage() {
  const { jobs, loading, error, refresh } = useJobs()

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]">Loading jobs...</div>
  }
  if (error) {
    return <div className="flex items-center justify-center min-h-[60vh] text-red-500">Error loading jobs: {error.message}</div>
  }

  return (
    <div className="p-4 sm:p-8">
      <JobsPanel jobs={jobs || []} refreshJobs={refresh} />
    </div>
  )
} 
 
 