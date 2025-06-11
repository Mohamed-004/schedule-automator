'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Job {
  id: string
  title: string
  description?: string
  client_name: string
  worker_id?: string
  worker_name?: string
  scheduled_at: string
  duration_hours: number
  status: string
  priority: string
  location?: string
}

interface Worker {
  id: string
  name: string
  avatar?: string
  role: string
  skills?: string[]
  status: string
  working_hours?: {
    start: string
    end: string
  }[]
}

export default function TestJobCount() {
  const supabase = createClient()
  const [jobs, setJobs] = useState<Job[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [workerJobs, setWorkerJobs] = useState<Record<string, Job[]>>({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // Fetch jobs
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
        
        if (jobsError) throw jobsError
        
        // Fetch workers
        const { data: workersData, error: workersError } = await supabase
          .from('workers')
          .select('*')
        
        if (workersError) throw workersError
        
        setJobs(jobsData || [])
        setWorkers(workersData || [])
        
        // Group jobs by worker
        const grouped: Record<string, Job[]> = {}
        jobsData?.forEach((job: Job) => {
          if (job.worker_id) {
            if (!grouped[job.worker_id]) {
              grouped[job.worker_id] = []
            }
            grouped[job.worker_id].push(job)
          }
        })
        
        setWorkerJobs(grouped)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [supabase])

  // Calculate worker utilization
  const workersWithStats = workers.map(worker => {
    const workerJobsArray = workerJobs[worker.id] || []
    const totalHours = workerJobsArray.reduce((sum, job) => sum + job.duration_hours, 0)
    const utilization = Math.min((totalHours / 8) * 100, 100) // 8 hour workday
    
    return {
      ...worker,
      utilization,
      totalHours,
      jobCount: workerJobsArray.length,
      isOverbooked: totalHours > 8,
      jobs: workerJobsArray
    }
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Job Count Debugging</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-6">
          <p>Total jobs: {jobs.length}</p>
          <p>Total workers: {workers.length}</p>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">Worker Job Counts</h2>
          <div className="space-y-4">
            {workersWithStats.map(worker => (
              <div key={worker.id} className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="font-medium text-lg">{worker.name}</h3>
                <p>Job count: {worker.jobCount}</p>
                <p>Total hours: {worker.totalHours}</p>
                <p>Utilization: {Math.round(worker.utilization)}%</p>
                
                <h4 className="font-medium mt-4 mb-2">Job Details:</h4>
                <div className="space-y-2">
                  {worker.jobs.map((job: Job) => (
                    <div key={job.id} className="bg-gray-100 p-2 rounded">
                      <p className="font-medium">{job.title}</p>
                      <p className="text-sm">Client: {job.client_name}</p>
                      <p className="text-sm">Duration: {job.duration_hours}h</p>
                      <p className="text-sm">ID: {job.id}</p>
                    </div>
                  ))}
                  {worker.jobs.length === 0 && (
                    <p className="text-gray-500 italic">No jobs assigned</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 