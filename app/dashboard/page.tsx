'use client'

import { useBusiness } from '@/hooks/use-business'
import { useJobs } from '@/hooks/use-jobs'
import JobCard from '@/components/dashboard/job-card'
import JobForm from '@/components/dashboard/job-form'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Building, Check, X, Edit, Copy, MessageCircle, AlertCircle, ArrowUp, ArrowDown, Filter, Star, Loader2 } from 'lucide-react'
import { useSupabase } from '@/lib/SupabaseProvider'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  // All hooks at the top!
  const router = useRouter()
  const { supabase, session, user, loading: authLoading } = useSupabase();
  const { business, loading: businessLoading, createBusiness } = useBusiness()
  const { jobs, loading: jobsLoading, error, refresh } = useJobs()
  const [showAddJob, setShowAddJob] = useState(false)
  const [jobError, setJobError] = useState<string | null>(null)
  const [savingJob, setSavingJob] = useState(false)
  const [showBusinessForm, setShowBusinessForm] = useState(false)
  const [businessForm, setBusinessForm] = useState({
    name: '',
    email: user?.email || '',
    phone: '',
    address: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    has_workers: true,
    subscription_tier: 'starter' as 'starter' | 'pro' | 'elite',
    max_clients: 100
  })
  const [savingBusiness, setSavingBusiness] = useState(false)
  const [businessError, setBusinessError] = useState<string | null>(null)
  // New state for filters, sort, selection, error, etc.
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'time-asc'|'time-desc'|'worker-az'>('time-asc');
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [showBulkBar, setShowBulkBar] = useState(false);
  const [savedViews, setSavedViews] = useState<string[]>(['Default']);
  const [activeView, setActiveView] = useState('Default');
  const [errorBanner, setErrorBanner] = useState<string|null>(null);
  const [showSupport, setShowSupport] = useState(false);
  const [loadingSkeleton, setLoadingSkeleton] = useState(false);
  const [metrics, setMetrics] = useState({active: 0, cancelled: 0, availableWorkers: 0});
  const jobListRef = useRef<HTMLDivElement>(null);

  // Use effect for redirects instead of during render to prevent reload loops
  useEffect(() => {
    // Redirect to login if not authenticated and done loading
    if (!authLoading && !session && !user) {
      router.push('/auth/login')
    }
  }, [authLoading, session, user, router])

  // Metrics calculation (stubbed for now)
  useEffect(() => {
    const today = new Date();
    const todayJobs = jobs?.filter(job => {
      if (!job?.scheduled_at) return false;
      const jobDate = new Date(job.scheduled_at)
      return jobDate.toDateString() === today.toDateString()
    }) || [];
    setMetrics({
      active: todayJobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length,
      cancelled: todayJobs.filter(j => j.status === 'cancelled').length,
      availableWorkers: 8 // TODO: fetch real worker availability
    });
  }, [jobs]);

  // Show loading while auth is being initialized
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  // Wait for auth check instead of redirecting during render
  if (!session || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (businessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingBusiness(true)
    setBusinessError(null)
    
    try {
      await createBusiness(businessForm)
      setShowBusinessForm(false)
    } catch (error) {
      console.error('Error creating business:', error)
      setBusinessError('Failed to create business profile')
    } finally {
      setSavingBusiness(false)
    }
  }

  if (!business) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            {showBusinessForm ? (
              <form onSubmit={handleCreateBusiness}>
                <h2 className="text-xl font-bold mb-4">Create Business Profile</h2>
                {businessError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
                    {businessError}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Business Name</Label>
                    <Input 
                      id="name" 
                      value={businessForm.name} 
                      onChange={e => setBusinessForm({...businessForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Business Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={businessForm.email} 
                      onChange={e => setBusinessForm({...businessForm, email: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Business Phone</Label>
                    <Input 
                      id="phone" 
                      value={businessForm.phone} 
                      onChange={e => setBusinessForm({...businessForm, phone: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Business Address</Label>
                    <Input 
                      id="address" 
                      value={businessForm.address} 
                      onChange={e => setBusinessForm({...businessForm, address: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowBusinessForm(false)}
                    disabled={savingBusiness}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={savingBusiness}
                  >
                    {savingBusiness ? 'Creating...' : 'Create Business'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Building className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Business Profile Found</h3>
                <p className="text-gray-500 mb-6">
                  Create a business profile to start managing your jobs and schedule.
                </p>
                <Button onClick={() => setShowBusinessForm(true)}>
                  Create Business Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (jobsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Loading jobs...</p>
        </div>
      </div>
    )
  }

  console.log('Current business data:', business)
  console.log('Current jobs data:', jobs)
  
  const today = new Date()
  const todayJobs = jobs?.filter(job => {
    if (!job?.scheduled_at) return false;
    const jobDate = new Date(job.scheduled_at)
    return jobDate.toDateString() === today.toDateString()
  }) || []

  // Filter, sort, and metrics logic (stubbed for now)
  const filteredJobs = todayJobs.filter(job => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return job.status === 'scheduled' || job.status === 'in_progress';
    if (statusFilter === 'cancelled') return job.status === 'cancelled';
    return true;
  });
  // Sort logic
  filteredJobs.sort((a, b) => {
    if (sortBy === 'time-asc') return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    if (sortBy === 'time-desc') return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime();
    if (sortBy === 'worker-az') return (a.worker_name || '').localeCompare(b.worker_name || '');
    return 0;
  });

  // Error banner retry
  const handleRetry = () => {
    setErrorBanner(null);
    refresh && refresh();
  };

  // Bulk actions
  const handleBulkAction = (action: 'cancel'|'reassign'|'complete') => {
    // TODO: Implement bulk action logic
    setSelectedJobs([]);
    setShowBulkBar(false);
  };

  // Keyboard shortcuts (stub)
  // TODO: Add keyboard navigation logic

  // Analytics hooks (stub)
  // TODO: Track card clicks, filter usage, drag, etc.

  // Drag-to-reschedule (stub)
  // TODO: Implement drag-and-drop logic

  // Real-time updates (stub)
  // TODO: Implement websocket or polling for real-time job status

  // Virtual list (stub)
  // TODO: Use virtual list for >100 jobs

  // Empty state illustration
  const EmptyDay = () => (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <Calendar className="h-8 w-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-medium mb-2">No jobs scheduled for today</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Add your first job or go to the calendar view to schedule appointments for other days.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => setShowAddJob(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Job
          </Button>
          <Link href="/dashboard/calendar">
            <Button variant="outline">View Calendar</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  // Error banner
  const ErrorBanner = () => errorBanner && (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
      <span>{errorBanner}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleRetry}>Retry</Button>
        <Button size="sm" variant="ghost" onClick={() => setShowSupport(true)}>Contact Support</Button>
      </div>
    </div>
  );

  // Loading skeletons
  const LoadingSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-40" />
      ))}
    </div>
  );

  // Metrics chips
  const MetricsChips = () => (
    <div className="flex gap-3 mb-4">
      <Badge className="bg-blue-50 text-blue-700 px-3 py-1">{metrics.active} Active Jobs</Badge>
      <Badge className="bg-red-50 text-red-700 px-3 py-1">{metrics.cancelled} Cancelled</Badge>
      <Badge className="bg-green-50 text-green-700 px-3 py-1">{metrics.availableWorkers} Workers Available</Badge>
    </div>
  );

  // Status filter & sort bar
  const FilterSortBar = () => (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex gap-1">
        {['all','active','cancelled'].map(status => (
          <Button
            key={status}
            size="sm"
            variant={statusFilter === status ? 'default' : 'outline'}
            className="rounded-full px-3"
            onClick={() => setStatusFilter(status as any)}
            aria-label={`Filter by ${status}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>
      <div className="flex gap-1 items-center ml-4">
        <span className="text-xs text-gray-500">Sort by</span>
        <Button size="icon" variant={sortBy === 'time-asc' ? 'default' : 'outline'} onClick={() => setSortBy('time-asc')} aria-label="Sort by time ascending"><ArrowUp className="h-4 w-4" /></Button>
        <Button size="icon" variant={sortBy === 'time-desc' ? 'default' : 'outline'} onClick={() => setSortBy('time-desc')} aria-label="Sort by time descending"><ArrowDown className="h-4 w-4" /></Button>
        <Button size="icon" variant={sortBy === 'worker-az' ? 'default' : 'outline'} onClick={() => setSortBy('worker-az')} aria-label="Sort by worker A-Z"><Filter className="h-4 w-4" /></Button>
      </div>
      <div className="ml-auto">
        <Button size="sm" variant="outline" className="rounded-full flex items-center gap-1" aria-label="Saved views">
          <Star className="h-4 w-4" />
          {activeView}
        </Button>
      </div>
    </div>
  );

  // Bulk actions bar
  const BulkActionsBar = () => showBulkBar && (
    <div className="fixed bottom-0 left-0 w-full flex justify-center z-40 pointer-events-none">
      <div className="bg-white border border-gray-200 shadow-xl rounded-t-2xl sm:rounded-full px-4 py-3 sm:px-6 sm:py-3 flex flex-col sm:flex-row gap-2 sm:gap-4 items-center max-w-2xl w-full m-2 pointer-events-auto">
        <span className="font-medium whitespace-nowrap text-sm px-2">{selectedJobs.length} selected</span>
        <Button size="sm" variant="outline" className="flex items-center gap-1 w-full sm:w-auto justify-center" onClick={() => handleBulkAction('cancel')}>
          <X className="h-4 w-4" /> Cancel
        </Button>
        <Button size="sm" variant="outline" className="flex items-center gap-1 w-full sm:w-auto justify-center" onClick={() => handleBulkAction('reassign')}>
          <Edit className="h-4 w-4" /> Re-assign
        </Button>
        <Button size="sm" variant="outline" className="flex items-center gap-1 w-full sm:w-auto justify-center" onClick={() => handleBulkAction('complete')}>
          <Check className="h-4 w-4" /> Mark Complete
        </Button>
        <Button size="icon" variant="ghost" className="ml-0 sm:ml-auto" onClick={() => { setShowBulkBar(false); setSelectedJobs([]); }} aria-label="Close bulk actions bar">
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  // Job card wrapper with checkbox, drag, analytics, etc.
  const JobCardWrapper = ({ job }: { job: any }) => (
    <div className="relative group" tabIndex={0} aria-label={`Job: ${job.title}`}
      // TODO: Keyboard navigation, analytics, drag, etc.
    >
      {/* Checkbox is now handled by JobCard itself for a cleaner look */}
      <JobCard
        job={job}
        onUpdate={refresh}
        selected={selectedJobs.includes(job.id)}
        onSelect={checked => {
          if (checked) {
            setSelectedJobs([...selectedJobs, job.id])
            setShowBulkBar(true)
          } else {
            setSelectedJobs(selectedJobs.filter(id => id !== job.id))
            if (selectedJobs.length <= 1) setShowBulkBar(false)
          }
        }}
      />
      {/* Drag handle (stub) */}
      <div className="absolute top-3 right-3 cursor-move opacity-0 group-hover:opacity-100" aria-label="Drag to reschedule">
        <Loader2 className="h-4 w-4 text-gray-300" />
      </div>
      {/* Conflict badge (stub) */}
      {false && (
        <div className="absolute top-3 right-10">
          <AlertCircle className="h-5 w-5 text-red-500" aria-label="Conflict: Worker double-booked or over shift" />
        </div>
      )}
    </div>
  );

  const handleAddJob = async (form: any) => {
    if (!supabase) return
    
    setSavingJob(true)
    setJobError(null)
    
    try {
      const { error: insertError } = await supabase.from('jobs').insert([
        {
          ...form,
          business_id: business.id,
          scheduled_at: new Date(form.scheduled_at).toISOString(),
          duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
        },
      ])
      
      if (insertError) {
        setJobError(insertError.message)
        return
      }
      
      setShowAddJob(false)
      refresh && refresh()
    } catch (error) {
      setJobError('An error occurred while adding the job')
      console.error('Error adding job:', error)
    } finally {
      setSavingJob(false)
    }
  }

  return (
    <div className="p-6">
      <ErrorBanner />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Today's Schedule</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddJob(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Job
          </Button>
          <Link href="/dashboard/calendar">
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Calendar View
            </Button>
          </Link>
        </div>
      </div>
      <MetricsChips />
      <FilterSortBar />
      <BulkActionsBar />
      {loadingSkeleton ? <LoadingSkeletons /> : (
        <div ref={jobListRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.length === 0 ? <EmptyDay /> : filteredJobs.map(job => <JobCardWrapper key={job.id} job={job} />)}
        </div>
      )}
      {/* Add Job Modal */}
      {showAddJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-transparent rounded-none shadow-none flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="overflow-y-auto bg-white rounded-2xl shadow-xl p-0" style={{ maxHeight: '90vh' }}>
              <CardContent className="p-0">
                <div className="p-0">
                  <h2 className="text-lg font-bold mb-4 px-8 pt-8">Add Job</h2>
                  {jobError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4 mx-8">
                      {jobError}
                    </div>
                  )}
                  <div className="px-8 pb-8">
                    <JobForm
                      onSubmit={handleAddJob}
                      onCancel={() => setShowAddJob(false)}
                      saving={savingJob}
                    />
                  </div>
                </div>
              </CardContent>
            </div>
          </div>
        </div>
      )}
      {/* Support Modal (stub) */}
      {showSupport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold mb-4">Contact Support</h2>
              <p className="mb-4">For urgent issues, email <a href="mailto:support@example.com" className="text-blue-600 underline">support@example.com</a></p>
              <Button onClick={() => setShowSupport(false)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 
 
 