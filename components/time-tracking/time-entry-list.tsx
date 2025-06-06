import { Clock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Job } from '@/lib/types'

interface TimeEntryListProps {
  jobs: Job[]
}

export function TimeEntryList({ jobs }: TimeEntryListProps) {
  if (jobs.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-500">
        No time entries for this date
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {jobs.map(job => (
        <div
          key={job.id}
          className="rounded-lg border bg-white p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">{job.title}</h3>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {job.status}
            </span>
          </div>

          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {new Date(job.scheduled_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{job.worker_id}</span>
            </div>
          </div>

          {job.status === 'in_progress' && (
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full"
              >
                End Time Entry
              </Button>
            </div>
          )}

          {job.status === 'scheduled' && (
            <div className="mt-4">
              <Button
                className="w-full"
              >
                Start Time Entry
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
} 