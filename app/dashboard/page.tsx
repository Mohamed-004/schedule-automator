import { Calendar, Clock, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBusiness } from '@/hooks/use-business'
import { useJobs } from '@/hooks/use-jobs'
import { useWorkers } from '@/hooks/use-workers'

export default function DashboardPage() {
  const { business, loading: businessLoading } = useBusiness()
  const { jobs, loading: jobsLoading } = useJobs()
  const { workers, loading: workersLoading } = useWorkers()

  const todayJobs = jobs?.filter(job => {
    const jobDate = new Date(job.scheduled_at)
    const today = new Date()
    return jobDate.toDateString() === today.toDateString()
  }) || []

  const upcomingJobs = jobs?.filter(job => {
    const jobDate = new Date(job.scheduled_at)
    const today = new Date()
    return jobDate > today
  }) || []

  if (businessLoading || jobsLoading || workersLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-3">
        {/* Today's Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Jobs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayJobs.length}</div>
            <p className="text-xs text-muted-foreground">
              {todayJobs.length === 0 ? 'No jobs scheduled' : 'Jobs scheduled for today'}
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Jobs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingJobs.length}</div>
            <p className="text-xs text-muted-foreground">
              {upcomingJobs.length === 0 ? 'No upcoming jobs' : 'Jobs scheduled in the future'}
            </p>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {workers?.length === 0 ? 'No team members' : 'Active team members'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="mt-6">
        <h2 className="mb-4 text-xl font-semibold">Recent Activity</h2>
        <div className="rounded-lg border bg-white">
          {/* Activity list will go here */}
          <div className="p-4 text-center text-sm text-muted-foreground">
            No recent activity
          </div>
        </div>
      </div>
    </div>
  )
} 