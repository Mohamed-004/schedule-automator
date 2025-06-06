import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkers } from '@/hooks/use-workers'
import { WorkerList } from '@/components/team/worker-list'
import { WorkerForm } from '@/components/team/worker-form'
import { useState } from 'react'

export default function TeamPage() {
  const { workers, loading } = useWorkers()
  const [isAddingWorker, setIsAddingWorker] = useState(false)

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team</h1>
        <Button onClick={() => setIsAddingWorker(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Worker
        </Button>
      </div>

      {isAddingWorker && (
        <div className="mb-6">
          <WorkerForm onClose={() => setIsAddingWorker(false)} />
        </div>
      )}

      <div className="rounded-lg border bg-white p-4">
        <WorkerList workers={workers || []} />
      </div>
    </div>
  )
} 