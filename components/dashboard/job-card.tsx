"use client"
import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSupabase } from '@/lib/SupabaseProvider'
import { Job } from '@/lib/types'
import { Calendar, MapPin, User, Clock, CheckCircle, X, Clock4, MessageSquare, Bot, User as UserIcon, Briefcase, Sparkles, MoreVertical, PlayCircle, Timer, MessageCircle, Brain, RefreshCw, PhoneCall, CalendarClock, Wand2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface JobCardProps {
  job: Job
  onUpdate?: () => void
  selected?: boolean
  onSelect?: (checked: boolean) => void
}

export default function JobCard({ job, onUpdate, selected, onSelect }: JobCardProps) {
  const { supabase } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [cancelledBy, setCancelledBy] = useState<'user'|'manager'|null>((job as any).cancelled_by || null);

  const updateJobStatus = async (newStatus: Job['status']) => {
    if (!supabase) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', job.id)
      if (error) {
        console.error('Error updating job:', error)
      } else {
        onUpdate?.()
      }
    } catch (error) {
      console.error('Error updating job:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      case 'rescheduled': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return { date: 'N/A', time: 'N/A' };
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const { date, time } = formatDateTime(job.scheduled_at)
  let workerName = 'Unassigned';
  if (job.worker && typeof job.worker === 'object' && job.worker.name) {
    workerName = job.worker.name;
  } else if (job.worker_id && job.worker_name) {
    workerName = job.worker_name;
  }

  return (
    <div className={`relative flex items-start bg-white/80 backdrop-blur-md border border-gray-200 shadow-md rounded-2xl p-4 mb-4 transition-transform duration-150 hover:scale-[1.01] hover:shadow-lg`}>
      {/* Custom Checkbox */}
      <div className="flex flex-col items-center justify-center mr-4">
        <label className="relative cursor-pointer group">
          <input type="checkbox" checked={selected} onChange={e => onSelect && onSelect(e.target.checked)} className="sr-only" />
          <span className="block w-5 h-5 rounded-full border border-gray-300 bg-white shadow-sm group-hover:shadow-md transition-all duration-150 flex items-center justify-center">
            {selected && (
              <svg className="w-4 h-4 text-[#7F5FFF]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
        </label>
      </div>
      {/* Card Content */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg font-semibold font-sans text-gray-900 tracking-tight line-clamp-1">{job.title}</div>
          {job.status && (
            <span className={`px-3 py-0.5 rounded-full text-xs font-semibold shadow-sm ${job.status === 'scheduled' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' : job.status === 'cancelled' ? 'bg-gradient-to-r from-rose-400 to-rose-600 text-white' : 'bg-gradient-to-r from-green-400 to-emerald-600 text-white'}`}>{job.status}</span>
          )}
        </div>
        <div className="text-gray-500 text-sm mb-1 line-clamp-2">{job.description || <span className="italic">...nothing to see</span>}</div>
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700 text-xs">
          <div className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-gray-400" /> <span className="font-medium">Client:</span> <span className="ml-0.5">{job.client_name || 'Unknown'}</span></div>
          <div className="flex items-center gap-1"><UserIcon className="h-3.5 w-3.5 text-emerald-400" /> <span className="font-medium">Worker:</span> <span className="ml-0.5">{job.worker_name || 'Unassigned'}</span></div>
          <div className="flex items-center gap-1 col-span-2"><MapPin className="h-3.5 w-3.5 text-gray-300" /> <span>{job.location || 'N/A'}</span></div>
          <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-blue-400" /> {job.scheduled_at ? new Date(job.scheduled_at).toLocaleDateString() : 'N/A'}</div>
          <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-indigo-400" /> {job.scheduled_at ? new Date(job.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</div>
        </div>
        {/* Action Buttons */}
        <div className="mt-3 flex gap-2 items-end">
          {job.status === 'scheduled' ? (
            <>
              <Button
                size="sm"
                className="rounded-full px-5 py-2 bg-gradient-to-r from-[#2563eb] to-[#1e40af] text-white font-medium text-sm border border-blue-700/20 shadow-sm hover:from-[#1d4ed8] hover:to-[#1e293b] hover:shadow-md transition-all duration-150 flex items-center gap-2"
                onClick={() => updateJobStatus('in_progress')}
                disabled={loading}
              >
                <PlayCircle className="h-4 w-4 text-white/90" /> Start Job
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 px-5 py-2 rounded-full border border-slate-300 bg-gradient-to-r from-[#6366f1] to-[#0f172a] text-white font-medium text-sm shadow-sm hover:from-[#4f46e5] hover:to-[#334155] hover:shadow-md transition-all duration-150 focus:ring-2 focus:ring-[#6366f1]/30 focus:outline-none"
                  >
                    <Wand2 className="h-4 w-4 text-slate-100" />
                    <span className="tracking-wide text-sm">Co-Pilot</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 bg-white border border-slate-200 shadow-lg rounded-xl py-2 px-1 mt-2 flex flex-col items-stretch">
                  <DropdownMenuItem 
                    className="text-blue-800 font-medium text-sm py-2 rounded-md hover:bg-slate-50 focus:bg-slate-100 transition-all flex items-center gap-3"
                    disabled
                  >
                    <Sparkles className="h-4 w-4 text-blue-400" />
                    Smart Reschedule
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-yellow-700 font-medium text-sm py-2 rounded-md hover:bg-slate-50 focus:bg-slate-100 transition-all flex items-center gap-3"
                    disabled
                  >
                    <Timer className="h-4 w-4 text-yellow-500" />
                    Add Buffer Time
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-rose-700 font-medium text-sm py-2 rounded-md hover:bg-slate-50 focus:bg-slate-100 transition-all flex items-center gap-3"
                    disabled
                  >
                    <MessageCircle className="h-4 w-4 text-rose-400" />
                    AI Apology & Reschedule
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : job.status === 'in_progress' ? (
            <Button
              size="sm"
              className="rounded-full px-5 py-2 bg-gradient-to-r from-[#2563eb] to-[#1e40af] text-white font-medium text-sm border border-blue-700/20 shadow-sm hover:from-[#1d4ed8] hover:to-[#1e293b] hover:shadow-md transition-all duration-150 flex items-center gap-2"
              onClick={() => updateJobStatus('completed')}
              disabled={loading}
            >
              <CheckCircle className="h-4 w-4 text-white/90" /> Complete
            </Button>
          ) : job.status === 'cancelled' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 px-5 py-2 rounded-full border border-slate-300 bg-gradient-to-r from-[#6366f1] to-[#0f172a] text-white font-medium text-sm shadow-sm hover:from-[#4f46e5] hover:to-[#334155] hover:shadow-md transition-all duration-150 focus:ring-2 focus:ring-[#6366f1]/30 focus:outline-none"
                >
                  <Wand2 className="h-4 w-4 text-slate-100" />
                  <span className="tracking-wide text-sm">Co-Pilot</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56 bg-white border border-slate-200 shadow-lg rounded-xl py-2 px-1 mt-2 flex flex-col items-stretch">
                <DropdownMenuItem 
                  className="text-blue-800 font-medium text-sm py-2 rounded-md hover:bg-slate-50 focus:bg-slate-100 transition-all flex items-center gap-3"
                  disabled
                >
                  <RefreshCw className="h-4 w-4 text-blue-400" />
                  Smart Re-engagement
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-yellow-700 font-medium text-sm py-2 rounded-md hover:bg-slate-50 focus:bg-slate-100 transition-all flex items-center gap-3"
                  disabled
                >
                  <PhoneCall className="h-4 w-4 text-yellow-500" />
                  Follow-up Call
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-rose-700 font-medium text-sm py-2 rounded-md hover:bg-slate-50 focus:bg-slate-100 transition-all flex items-center gap-3"
                  disabled
                >
                  <CalendarClock className="h-4 w-4 text-rose-400" />
                  Schedule New Time
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </div>
  )
} 
 
 