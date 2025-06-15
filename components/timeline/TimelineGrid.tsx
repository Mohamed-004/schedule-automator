'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
// import { WorkerTimelineData, TimelineConfig, TimelineJob } from '@/lib/types'
import { JobBlock } from './JobBlock'
import { AvailabilityTrack } from './AvailabilityTrack'
import { SmartAssignmentModal } from './SmartAssignmentModal'

interface TimelineGridProps {
  workersData: any[]
  timelineConfig: any
  onJobClick?: (job: any) => void
  onJobReassign?: (job: any) => void
  showHeaderOnly?: boolean
  showContentOnly?: boolean
  isMobileLayout?: boolean
  className?: string
  selectedDate?: Date
}

/**
 * TimelineGrid handles the main timeline visualization
 * Supports desktop grid layout and mobile card layout
 */
export function TimelineGrid({
  workersData,
  timelineConfig,
  onJobClick,
  onJobReassign,
  showHeaderOnly = false,
  showContentOnly = false,
  isMobileLayout = false,
  className,
  selectedDate = new Date()
}: TimelineGridProps) {
  const [showSmartAssignment, setShowSmartAssignment] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ startTime: string; endTime: string } | null>(null)
  const [selectedWorker, setSelectedWorker] = useState<any>(null)

  const { hourWidth, timeRange, minJobWidth } = timelineConfig
  const totalHours = timeRange.endHour - timeRange.startHour
  const timelineWidth = totalHours * hourWidth

  // Generate time labels for header
  const generateTimeLabels = () => {
    const labels = []
    for (let hour = timeRange.startHour; hour <= timeRange.endHour; hour++) {
      labels.push({
        hour,
        label: hour === 0 ? '12 AM' : 
               hour < 12 ? `${hour} AM` : 
               hour === 12 ? '12 PM' : 
               `${hour - 12} PM`,
        position: (hour - timeRange.startHour) * hourWidth
      })
    }
    return labels
  }

  const timeLabels = generateTimeLabels()

  // Calculate job position and width
  const calculateJobPosition = (job: any, timeRange: any) => {
    const jobStartHour = job.startTime.getHours() + job.startTime.getMinutes() / 60
    const position = (jobStartHour - timeRange.startHour) * hourWidth
    const width = Math.max((job.duration / 60) * hourWidth, minJobWidth)
    return { position, width }
  }

  // Handle availability slot click
  const handleAvailabilityClick = (timeSlot: { startTime: string; endTime: string }, worker: any) => {
    setSelectedTimeSlot(timeSlot)
    setSelectedWorker(worker)
    setShowSmartAssignment(true)
  }

  // Handle job creation success
  const handleJobCreated = (jobData: any) => {
    setShowSmartAssignment(false)
    setSelectedTimeSlot(null)
    setSelectedWorker(null)
    // Optionally refresh the timeline data here
  }

  // Mobile layout: Individual worker cards
  if (isMobileLayout) {
    return (
      <>
        <div className={cn('space-y-4', className)}>
          {workersData.map((workerData) => (
            <div
              key={workerData.worker.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Worker Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium text-sm">
                    {workerData.worker.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{workerData.worker.name}</h3>
                    <p className="text-sm text-gray-600">{workerData.jobs.length} jobs today</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="p-4">
                <div className="relative h-20 bg-gray-50 rounded-lg overflow-x-auto">
                  <div 
                    className="relative h-full"
                    style={{ width: Math.max(timelineWidth, 400) }}
                  >
                    {/* Availability Track */}
                    <AvailabilityTrack
                      availability={workerData.availability}
                      timeRange={workerData.timeRange}
                      hourWidth={hourWidth}
                      onAvailabilityClick={(timeSlot) => handleAvailabilityClick(timeSlot, workerData)}
                      workerId={workerData.worker.id}
                      workerName={workerData.worker.name}
                    />
                    
                    {/* Job Blocks */}
                    {workerData.jobs.map((job) => {
                      const { position, width } = calculateJobPosition(job, workerData.timeRange)
                      return (
                        <JobBlock
                          key={job.id}
                          job={job}
                          width={width}
                          left={position}
                          onClick={onJobClick}
                          onReassign={onJobReassign}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Smart Assignment Modal */}
        {showSmartAssignment && selectedTimeSlot && selectedWorker && (
          <SmartAssignmentModal
            isOpen={showSmartAssignment}
            onClose={() => {
              setShowSmartAssignment(false)
              setSelectedTimeSlot(null)
              setSelectedWorker(null)
            }}
            workerId={selectedWorker.worker.id}
            workerName={selectedWorker.worker.name}
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
            onJobCreated={handleJobCreated}
          />
        )}
      </>
    )
  }

  // Desktop layout: Grid with time header
  return (
    <>
      <div className={cn('bg-white', className)} style={{ width: timelineWidth }}>
        {/* Time Header */}
        {!showContentOnly && (
          <div className="relative h-12 bg-gray-50 border-b border-gray-200">
            {/* Time Grid Lines */}
            <div className="absolute inset-0">
              {timeLabels.map(({ hour, position }) => (
                <div
                  key={hour}
                  className="absolute top-0 bottom-0 border-l border-gray-200"
                  style={{ left: `${position}px` }}
                />
              ))}
            </div>

            {/* Time Labels */}
            <div className="relative h-full flex items-center">
              {timeLabels.map(({ hour, label, position }) => (
                <div
                  key={hour}
                  className="absolute text-xs font-medium text-gray-600 transform -translate-x-1/2"
                  style={{ left: `${position}px` }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Worker Rows */}
        {!showHeaderOnly && (
          <div className="divide-y divide-gray-100">
            {workersData.map((workerData) => (
              <div
                key={workerData.worker.id}
                className="relative h-[120px] hover:bg-gray-50 transition-colors"
              >
                {/* Time Grid Lines */}
                <div className="absolute inset-0">
                  {timeLabels.map(({ hour, position }) => (
                    <div
                      key={hour}
                      className="absolute top-0 bottom-0 border-l border-gray-100"
                      style={{ left: `${position}px` }}
                    />
                  ))}
                </div>

                {/* Availability Track */}
                <AvailabilityTrack
                  availability={workerData.availability}
                  timeRange={workerData.timeRange}
                  hourWidth={hourWidth}
                  onAvailabilityClick={(timeSlot) => handleAvailabilityClick(timeSlot, workerData)}
                  workerId={workerData.worker.id}
                  workerName={workerData.worker.name}
                />

                {/* Job Blocks */}
                <div className="relative">
                  {workerData.jobs.map((job) => {
                    const { position, width } = calculateJobPosition(job, workerData.timeRange)
                    return (
                      <JobBlock
                        key={job.id}
                        job={job}
                        width={width}
                        left={position}
                        onClick={onJobClick}
                        onReassign={onJobReassign}
                      />
                    )
                  })}
                </div>

                {/* Empty state for workers with no jobs */}
                {workerData.jobs.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="text-sm">No jobs scheduled</div>
                      <div className="text-xs mt-1">Available all day</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Smart Assignment Modal */}
      {showSmartAssignment && selectedTimeSlot && selectedWorker && (
        <SmartAssignmentModal
          isOpen={showSmartAssignment}
          onClose={() => {
            setShowSmartAssignment(false)
            setSelectedTimeSlot(null)
            setSelectedWorker(null)
          }}
          workerId={selectedWorker.worker.id}
          workerName={selectedWorker.worker.name}
          selectedDate={selectedDate}
          selectedTimeSlot={selectedTimeSlot}
          onJobCreated={handleJobCreated}
        />
      )}
    </>
  )
} 