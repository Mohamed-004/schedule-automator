import { Metadata } from 'next'
import WorkerAvailabilityManager from '@/components/team/WorkerAvailabilityManager'

export const metadata: Metadata = {
  title: 'Worker Availability',
  description: 'Set and manage worker availability schedules',
}

export default function WorkerAvailabilityPage() {
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Worker Availability</h1>
      <WorkerAvailabilityManager isAdmin={true} />
    </div>
  )
} 