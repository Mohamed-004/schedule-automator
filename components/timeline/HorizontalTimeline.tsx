import React from 'react'
import { generateTimeGrid, TIME_SLOT_COLORS } from '@/lib/timeline-grid'

interface HorizontalTimelineProps {
  workers: Array<{
    id: string
    name: string
    status: string
    timeSlots: Array<{
      startTime: string
      endTime: string
      type: 'available' | 'scheduled' | 'break'
      job?: {
        id: string
        title: string
        client: string
      }
    }>
  }>
  startHour?: number
  endHour?: number
}

export default function HorizontalTimeline({ 
  workers, 
  startHour = 8, 
  endHour = 18 
}: HorizontalTimelineProps) {
  const timeGrid = generateTimeGrid(startHour, endHour, 60) // 1-hour intervals

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with time labels */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div className="w-48 p-4 font-medium text-gray-900">Workers</div>
        <div className="flex-1 flex">
          {timeGrid.map((time) => (
            <div 
              key={time} 
              className="flex-1 p-2 text-center text-sm font-medium text-gray-600 border-l border-gray-200"
            >
              {time}
            </div>
          ))}
        </div>
      </div>

      {/* Worker rows */}
      <div className="divide-y divide-gray-200">
        {workers.map((worker) => (
          <div key={worker.id} className="flex">
            <div className="w-48 p-4 bg-gray-50">
              <h3 className="font-medium text-gray-900">{worker.name}</h3>
              <p className="text-sm text-gray-500 capitalize">{worker.status}</p>
            </div>
            <div className="flex-1 flex">
              {timeGrid.map((time, index) => {
                const slot = worker.timeSlots.find(s => s.startTime <= time && s.endTime > time)
                return (
                  <div 
                    key={`${worker.id}-${time}`}
                    className={`flex-1 p-2 border-l border-gray-200 text-xs text-center ${
                      slot ? TIME_SLOT_COLORS[slot.type] : 'bg-white'
                    }`}
                  >
                    {slot?.job ? slot.job.title : slot?.type || ''}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 