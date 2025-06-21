import React from 'react'

interface UnifiedTimelineRowProps {
  worker: {
    id: string
    name: string
    status: string
  }
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
}

export function UnifiedTimelineRow({ worker, timeSlots }: UnifiedTimelineRowProps) {
  return (
    <div className="flex items-center border-b border-gray-200 p-4">
      <div className="w-48 flex-shrink-0">
        <h3 className="font-medium">{worker.name}</h3>
        <p className="text-sm text-gray-500">{worker.status}</p>
      </div>
      
      <div className="flex-1 flex space-x-1">
        {timeSlots.map((slot, index) => (
          <div
            key={index}
            className={`h-8 rounded px-2 text-xs flex items-center justify-center ${
              slot.type === 'available' 
                ? 'bg-green-100 text-green-800'
                : slot.type === 'scheduled'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600'
            }`}
            style={{ minWidth: '80px' }}
          >
            {slot.job ? slot.job.title : slot.type}
          </div>
        ))}
      </div>
    </div>
  )
} 