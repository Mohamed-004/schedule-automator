import { Clock, MapPin, User, Tag, Calendar, MoreHorizontal, Sun, Wind, CloudDrizzle, CheckCircle, CalendarClock } from 'lucide-react'
import type { Job, Worker, Client } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface JobListProps {
  jobs: Job[];
  workers: Worker[];
  clients: Client[];
}

const getStatusStyles = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'bg-green-100 text-green-800 border-green-200'
    case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-sky-100 text-sky-800 border-sky-200'
  }
}

const getStatusIcon = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed': return <CheckCircle className="h-3.5 w-3.5" />;
    case 'in_progress': return <CalendarClock className="h-3.5 w-3.5" />;
    case 'cancelled': return <Tag className="h-3.5 w-3.5" />;
    default: return <Calendar className="h-3.5 w-3.5" />;
  }
};

const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl border border-gray-200 shadow"
  >
    <div className="relative mb-4">
      <motion.div
        animate={{ 
          rotate: [0, 15, 0],
          y: [0, -2, 0]
        }}
        transition={{ 
          duration: 5, 
          repeat: Infinity,
          ease: 'easeInOut' 
        }}
      >
        <Sun className="h-14 w-14 text-yellow-400" />
      </motion.div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 20, 
          repeat: Infinity,
          ease: 'linear' 
        }}
        className="absolute -bottom-1 -left-3"
      >
        <Wind className="h-5 w-5 text-blue-200" />
      </motion.div>
      <motion.div
        animate={{ 
          y: [0, -3, 0],
          x: [0, 2, 0]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1
        }}
        className="absolute -top-2 -right-4"
      >
        <CloudDrizzle className="h-7 w-7 text-blue-400" />
      </motion.div>
    </div>
    <h3 className="text-lg font-bold text-gray-900">All clear!</h3>
    <p className="text-sm text-gray-500 mt-1">No jobs scheduled for this day.</p>
  </motion.div>
)

const JobCard = ({ job, index }: { job: Job, index: number }) => {
  const scheduledTime = new Date(job.scheduled_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group"
    >
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-md hover:translate-y-[-2px] bg-white border border-gray-200 shadow">
        <div className={cn(
          'p-4 border-l-4 relative', 
          getStatusStyles(job.status).replace('bg-', 'border-').replace('-100', '-500').replace('text-','')
        )}>
          {/* Status indicator dot */}
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className={cn('text-xs px-2 py-0 h-5 flex items-center gap-1', getStatusStyles(job.status))}>
              {getStatusIcon(job.status)}
              <span>{job.status}</span>
            </Badge>
          </div>

          <div className="pr-20">
            <p className="font-bold text-gray-900 mb-1 line-clamp-1">{job.title}</p>
            <p className="text-xs text-gray-500 line-clamp-1">{job.description}</p>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-dashed border-gray-200 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-700 truncate">{job.worker?.name || 'Unassigned'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-700 truncate">{job.location || 'No location'}</span>
            </div>
          </div>
          
          {/* Quick action buttons that appear on hover */}
          <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export default function JobList({ jobs, workers, clients }: JobListProps) {
  if (!jobs || jobs.length === 0) {
    return <EmptyState />;
  }

  const workerMap = Object.fromEntries(
    (workers || []).map((w) => [String(w.id).trim(), w])
  );
  
  // Enrich jobs with worker info from the map
  const enrichedJobs = jobs.map(job => ({
    ...job,
    worker: workerMap[String(job.worker_id).trim()],
  }));

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {enrichedJobs.map((job, index) => (
          <JobCard key={job.id} job={job} index={index} />
        ))}
      </AnimatePresence>
    </div>
  )
} 