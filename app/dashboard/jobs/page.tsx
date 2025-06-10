'use client'

import { useState } from 'react'
import { Plus, BarChart3 } from 'lucide-react'
import { StatsRibbon } from '@/components/dashboard/StatsRibbon'
import { JobsPanel } from '@/components/jobs-panel'
import { Button } from '@/components/ui/button'
import { useJobs } from '@/hooks/use-jobs'

export default function JobsPage() {
  const { jobs, loading, error, refresh } = useJobs()
  const [selectedView, setSelectedView] = useState('table')

  const handleCreateJob = () => {
    // TODO: Open job creation modal
    console.log('Create new job')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg">Loading jobs...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-500">
        <div className="text-lg">Error loading jobs: {error.message}</div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <div className="text-sm text-gray-500 mt-1">
            <span>Jobs › All Jobs</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button onClick={handleCreateJob}>
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
        </div>
      </div>
      
      {/* Stats Ribbon */}
      <StatsRibbon />
      
      {/* View Selection */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          {[
            { id: 'table', label: 'Table View', icon: '📋' },
            { id: 'board', label: 'Board View', icon: '📌' },
            { id: 'calendar', label: 'Calendar View', icon: '📅' },
          ].map((view) => (
            <button
              key={view.id}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedView === view.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setSelectedView(view.id)}
            >
              <span className="mr-2">{view.icon}</span>
              {view.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Main Content */}
      {selectedView === 'table' && (
        <JobsPanel jobs={jobs || []} refreshJobs={refresh} />
      )}
      
      {selectedView === 'board' && (
        <div className="text-center py-12 text-gray-500">
          Board view coming soon...
        </div>
      )}
      
      {selectedView === 'calendar' && (
        <div className="text-center py-12 text-gray-500">
          Calendar view coming soon...
        </div>
      )}
    </>
  )
}