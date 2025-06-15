/**
 * Demo data for timeline visualization matching the provided design
 * This data creates the exact workers and jobs shown in the image
 */

import { TimelineJob, Worker, WorkerTimelineData, AvailabilitySlot } from '@/lib/types'

// Demo workers matching the image
export const demoWorkers: Worker[] = [
  {
    id: '1',
    business_id: 'demo-business',
    name: 'Ameer Gailan',
    email: 'ameer@example.com',
    phone: '(555) 123-4567',
    role: 'technician',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    business_id: 'demo-business',
    name: 'Test Worker',
    email: 'test@example.com',
    phone: '(555) 987-6543',
    role: 'technician',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    business_id: 'demo-business',
    name: 'Part Time Worker',
    email: 'parttime@example.com',
    phone: '(555) 456-7890',
    role: 'technician',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

// Demo jobs matching the image exactly
export const createDemoJobs = (selectedDate: Date = new Date()): TimelineJob[] => {
  const baseDate = new Date(selectedDate)
  baseDate.setHours(0, 0, 0, 0)

  return [
    // Ameer Gailan's jobs
    {
      id: '1',
      business_id: 'demo-business',
      client_id: 'client-1',
      worker_id: '1',
      title: 'Plumbing Repair',
      description: 'Fix kitchen sink leak and replace faucet',
      status: 'in_progress',
      priority: 'medium',
      scheduled_at: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9:00 AM
      completed_at: null,
      location: '123 Main St',
      client_name: 'John Smith',
      worker_name: 'Ameer Gailan',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      duration: 120, // 2 hours
      startTime: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000),
      endTime: new Date(baseDate.getTime() + 11 * 60 * 60 * 1000),
      conflictStatus: 'valid'
    },
    {
      id: '2',
      business_id: 'demo-business',
      client_id: 'client-2',
      worker_id: '1',
      title: 'Kitchen Installation',
      description: 'Install new kitchen cabinets and countertops',
      status: 'scheduled',
      priority: 'medium',
      scheduled_at: new Date(baseDate.getTime() + 13.5 * 60 * 60 * 1000).toISOString(), // 1:30 PM
      completed_at: null,
      location: '456 Oak Ave',
      client_name: 'Jane Doe',
      worker_name: 'Ameer Gailan',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      duration: 240, // 4 hours
      startTime: new Date(baseDate.getTime() + 13.5 * 60 * 60 * 1000),
      endTime: new Date(baseDate.getTime() + 17.5 * 60 * 60 * 1000),
      conflictStatus: 'valid'
    },
    // Test Worker's jobs
    {
      id: '3',
      business_id: 'demo-business',
      client_id: 'client-3',
      worker_id: '2',
      title: 'Bathroom Renovation',
      description: 'Complete bathroom remodel including tiles and fixtures',
      status: 'scheduled',
      priority: 'urgent',
      scheduled_at: new Date(baseDate.getTime() + 10 * 60 * 60 * 1000).toISOString(), // 10:00 AM
      completed_at: null,
      location: '789 Pine St',
      client_name: 'Bob Wilson',
      worker_name: 'Test Worker',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      duration: 180, // 3 hours
      startTime: new Date(baseDate.getTime() + 10 * 60 * 60 * 1000),
      endTime: new Date(baseDate.getTime() + 13 * 60 * 60 * 1000),
      conflictStatus: 'valid'
    },
    {
      id: '4',
      business_id: 'demo-business',
      client_id: 'client-4',
      worker_id: '2',
      title: 'Emergency Repair',
      description: 'Urgent pipe burst repair',
      status: 'scheduled',
      priority: 'urgent',
      scheduled_at: new Date(baseDate.getTime() + 15 * 60 * 60 * 1000).toISOString(), // 3:00 PM
      completed_at: null,
      location: '654 Maple Dr',
      client_name: 'Mike Davis',
      worker_name: 'Test Worker',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      duration: 90, // 1.5 hours
      startTime: new Date(baseDate.getTime() + 15 * 60 * 60 * 1000),
      endTime: new Date(baseDate.getTime() + 16.5 * 60 * 60 * 1000),
      conflictStatus: 'valid'
    },
    // Part Time Worker's job
    {
      id: '5',
      business_id: 'demo-business',
      client_id: 'client-5',
      worker_id: '3',
      title: 'Maintenance',
      description: 'Routine maintenance and inspection',
      status: 'completed',
      priority: 'low',
      scheduled_at: new Date(baseDate.getTime() + 11 * 60 * 60 * 1000).toISOString(), // 11:00 AM
      completed_at: new Date(baseDate.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      location: '321 Elm St',
      client_name: 'Alice Brown',
      worker_name: 'Part Time Worker',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      duration: 60, // 1 hour
      startTime: new Date(baseDate.getTime() + 11 * 60 * 60 * 1000),
      endTime: new Date(baseDate.getTime() + 12 * 60 * 60 * 1000),
      conflictStatus: 'valid'
    }
  ]
}

// Demo availability data matching the image
export const demoAvailability: Record<string, AvailabilitySlot[]> = {
  '1': [ // Ameer Gailan: 06:00 - 20:00 (full day availability like in image)
    { day: 0, start: '06:00', end: '20:00' }
  ],
  '2': [ // Test Worker: 08:00 - 18:00
    { day: 0, start: '08:00', end: '18:00' }
  ],
  '3': [ // Part Time Worker: 10:00 - 14:00
    { day: 0, start: '10:00', end: '14:00' }
  ]
}

// Create timeline data matching the image
export const createDemoTimelineData = (selectedDate: Date = new Date()): WorkerTimelineData[] => {
  const jobs = createDemoJobs(selectedDate)
  
  return demoWorkers.map(worker => {
    const workerJobs = jobs.filter(job => job.worker_id === worker.id)
    const availability = demoAvailability[worker.id] || []
    
    // Calculate status based on jobs
    let status: 'busy' | 'scheduled' | 'available' = 'available'
    if (workerJobs.some(job => job.status === 'in_progress')) {
      status = 'busy'
    } else if (workerJobs.length > 0) {
      status = 'scheduled'
    }

    // Calculate time range from availability
    const timeRange = availability.length > 0 
      ? {
          start: parseInt(availability[0].start.split(':')[0]),
          end: parseInt(availability[0].end.split(':')[0])
        }
      : { start: 8, end: 18 } // Default range

    return {
      worker,
      availability,
      jobs: workerJobs,
      timeRange,
      totalJobs: workerJobs.length,
      status
    }
  })
} 