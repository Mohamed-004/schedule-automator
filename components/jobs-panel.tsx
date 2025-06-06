"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, AlertTriangle, User, Edit2, Trash2, Calendar as CalendarIcon, MapPin, Mail, Phone } from "lucide-react"
import { Job } from '@/lib/types'
import { useWorkers } from '@/hooks/use-workers'
import { useBusiness } from '@/hooks/use-business'
import JobForm from '@/components/dashboard/job-form'
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

type JobsPanelProps = {
  jobs: Job[]
  refreshJobs: () => void | Promise<void>
}

const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case "High":
      return "bg-red-100 text-red-800 border-red-200"
    case "Medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "Normal":
      return "bg-green-100 text-green-800 border-green-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

function formatPhone(phone: string) {
  if (!phone) return '';
  const cleaned = ('' + phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

function countryToFlag(countryCode: string) {
  if (!countryCode) return '';
  return countryCode
    .toUpperCase()
    .replace(/./g, char =>
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
}

export function JobsPanel({ jobs, refreshJobs }: JobsPanelProps) {
  const { business } = useBusiness();
  const { workers, loading: workersLoading, error: workersError } = useWorkers(business?.id);
  const [clients, setClients] = useState<any[]>([]);
  const supabase = createClientComponentClient();
  
  // Debug session
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('=== Session Debug ===');
      console.log('Session:', session);
      console.log('User ID:', session?.user?.id);
      console.log('Business:', business);
    }
    checkSession();
  }, [business, supabase]);

  // Debug business and workers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('=== Jobs Panel Debug ===');
      console.log('Business:', business);
      console.log('Workers Loading:', workersLoading);
      console.log('Workers Error:', workersError);
    }
  }, [business, workersLoading, workersError]);

  useEffect(() => {
    async function fetchClients() {
      if (!business?.id) return;
      const { data } = await supabase.from('clients').select('*').eq('business_id', business.id);
      setClients(data || []);
    }
    fetchClients();
  }, [business, supabase]);

  const [isAddJobOpen, setIsAddJobOpen] = useState(false)
  const [isEditJobOpen, setIsEditJobOpen] = useState(false)
  const [editJob, setEditJob] = useState<Job | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Map worker_id to name (normalize and trim)
  const workerMap = Object.fromEntries(
    workers.map(w => [String(w.id).trim(), w.name])
  )
  
  // Debug: print all worker IDs and mapping
  if (typeof window !== 'undefined') {
    console.log('=== Worker Mapping Debug ===');
    console.log('Business ID:', business?.id);
    console.log('All workers:', workers);
    console.log('Worker IDs:', workers.map(w => w.id));
    console.log('Worker Map:', workerMap);
    console.log('Jobs:', jobs);
    console.log('Job Worker IDs:', jobs.map(j => j.worker_id));
  }

  const clientMap = Object.fromEntries(
    clients.map(c => [String(c.id).trim(), c])
  );

  // Filtering logic
  const filteredJobs = jobs.filter(job => {
    const matchesSearch =
      (job.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (job.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (job.location || "").toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Edit modal handlers
  const handleEditJob = (job: Job) => {
    setEditJob(job)
    setIsEditJobOpen(true)
  }
  const handleEditJobSave = async (form: any) => {
    // TODO: Call API to update job
    setIsEditJobOpen(false)
    setEditJob(null)
    refreshJobs && refreshJobs()
    // Force refresh workers as well
    setTimeout(() => window.location.reload(), 500)
  }

  const handleAddJob = () => {
    // Replace this with actual add job logic
    console.log("Adding job:")
    setIsAddJobOpen(false)
  }

  const handleCancelJob = (jobId: string) => {
    // Replace this with actual cancel job logic
    console.log("Cancelling job with id:", jobId)
  }

  const triggerBufferReschedule = () => {
    // Logic for buffer reschedule would go here
    alert("Buffer reschedule triggered - all affected clients will be notified")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Jobs Management</h2>
          <p className="text-gray-600">Create, manage, and track all jobs</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddJobOpen} onOpenChange={setIsAddJobOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add New Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Job</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client Name</Label>
                  <Input
                    id="client"
                    placeholder="Enter client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service">Service Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="maintenance">General Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker">Assign Worker</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select worker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mike Chen">Mike Chen</SelectItem>
                      <SelectItem value="Lisa Rodriguez">Lisa Rodriguez</SelectItem>
                      <SelectItem value="David Kim">David Kim</SelectItem>
                      <SelectItem value="Anna Thompson">Anna Thompson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter job address"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes or requirements"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsAddJobOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddJob}>Create Job</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={triggerBufferReschedule}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Buffer Reschedule
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search jobs..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="rescheduled">Rescheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.map((job) => {
          // Debug output
          console.log('All workers:', workers);
          console.log('Job:', job);
          console.log('worker_id:', `[${String(job.worker_id).trim()}]`);
          console.log('workerMap:', workerMap);
          const jobWorkerId = String(job.worker_id).trim();
          const workerName = workerMap[jobWorkerId];
          const client = clientMap[String(job.client_id).trim()];
          return (
            <div key={job.id} className="bg-white rounded-lg border p-4 md:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between shadow-sm hover:shadow-md transition-shadow w-full">
              <div className="flex flex-col gap-4 w-full md:flex-row md:items-center md:gap-6">
                {/* Left: Client & Job Info */}
                <div className="flex-1 min-w-[120px]">
                  <div className="font-semibold text-lg mb-1 truncate">{job.client_name}</div>
                  <div className="text-gray-600 text-base mb-1 truncate">{job.title}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{job.location}</span>
                  </div>
                  {/* Client Info */}
                  {client && (
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-700 items-center">
                      <User className="h-4 w-4 text-blue-400" />
                      <span className="font-medium">Client:</span>
                      <span>{client.name}</span>
                      {client.email && (
                        <span className="flex items-center gap-1"><Mail className="h-4 w-4 text-gray-400" />{client.email}</span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1"><Phone className="h-4 w-4 text-gray-400" />{client.country && <span title={client.country}>{countryToFlag(client.country)}</span>}{formatPhone(client.phone)}</span>
                      )}
                    </div>
                  )}
                </div>
                {/* Middle: Date/Time & Worker */}
                <div className="flex flex-col gap-2 min-w-[160px]">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-sm">
                      {new Date(job.scheduled_at).toLocaleDateString()} at {new Date(job.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    {workerName ? (
                      <span className="font-medium text-sm">{workerName}</span>
                    ) : (
                      <span className="text-gray-400 text-sm flex items-center gap-1"><span className="inline-block w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs">?</span> Unassigned</span>
                    )}
                  </div>
                </div>
                {/* Right: Status Badge */}
                <div className="flex flex-col gap-2 min-w-[100px] items-end md:items-center">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    job.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                    job.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    job.status === 'rescheduled' ? 'bg-yellow-100 text-yellow-700' :
                    job.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                    job.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>
                </div>
              </div>
              {/* Actions */}
              <div className="flex flex-col gap-2 md:flex-row md:gap-2 items-stretch md:items-center w-full md:w-auto">
                <button
                  className="p-3 rounded hover:bg-gray-100 transition-colors w-full md:w-auto"
                  title="Edit Job"
                  onClick={() => handleEditJob(job)}
                  aria-label="Edit Job"
                >
                  <Edit2 className="h-5 w-5 text-primary mx-auto" />
                </button>
                <button
                  className="p-3 rounded hover:bg-red-50 transition-colors w-full md:w-auto"
                  title="Cancel Job"
                  onClick={() => handleCancelJob(job.id)}
                  aria-label="Cancel Job"
                >
                  <Trash2 className="h-5 w-5 text-red-500 mx-auto" />
                </button>
                {job.status === 'rescheduled' && (
                  <span className="ml-0 md:ml-2 flex items-center gap-1 text-yellow-700 text-xs font-semibold"><AlertTriangle className="h-4 w-4" /> Rescheduled</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Edit Job Modal */}
      {isEditJobOpen && editJob && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Edit Job</h2>
            <JobForm
              onSubmit={handleEditJobSave}
              onCancel={() => { setIsEditJobOpen(false); setEditJob(null); }}
              saving={false}
              initialData={editJob}
            />
          </div>
        </div>
      )}
    </div>
  )
}
