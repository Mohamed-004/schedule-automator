import { Mail, Phone, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Worker } from '@/lib/types'

interface WorkerListProps {
  workers: Worker[]
}

export function WorkerList({ workers }: WorkerListProps) {
  if (workers.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-500">
        No workers added yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {workers.map(worker => (
        <div
          key={worker.id}
          className="flex items-center justify-between rounded-lg border bg-white p-4"
        >
          <div>
            <h3 className="font-medium">{worker.name}</h3>
            <div className="mt-1 space-y-1 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{worker.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{worker.phone}</span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
} 