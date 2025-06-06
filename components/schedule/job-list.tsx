import { Clock, MapPin, User, Mail, Phone } from 'lucide-react'
import type { Job } from '@/lib/types'
import { useWorkers } from '@/hooks/use-workers'
import { useBusiness } from '@/hooks/use-business'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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

interface JobListProps {
  jobs: Job[]
}

export default function JobList({ jobs }: JobListProps) {
  const { business } = useBusiness();
  const { workers } = useWorkers(business?.id);
  const [clients, setClients] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchClients() {
      if (!business?.id) return;
      const { data } = await supabase.from('clients').select('*').eq('business_id', business.id);
      setClients(data || []);
    }
    fetchClients();
  }, [business, supabase]);

  const workerMap = Object.fromEntries(
    workers.map((w: any) => [String(w.id).trim(), w.name])
  );
  const clientMap = Object.fromEntries(
    clients.map((c: any) => [String(c.id).trim(), c])
  );

  if (jobs.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-500">
        No jobs scheduled for this date
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {jobs.map(job => {
        const jobWorkerId = String(job.worker_id).trim();
        const workerName = workerMap[jobWorkerId];
        const client = clientMap[String(job.client_id).trim()];
        return (
          <div
            key={job.id}
            className="rounded-lg border bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg truncate">{job.title}</h3>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {job.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(job.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{job.location}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Worker:</span>
                  <span>{workerName || 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4 text-blue-400" />
                  <span className="font-medium">Client:</span>
                  <span>{client?.name || 'Unknown Client'}</span>
                </div>
                {client?.email && (
                  <div className="flex items-center gap-1 break-all">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client?.phone && (
                  <div className="flex items-center gap-1 break-all" title={formatPhone(client.phone)}>
                    <Phone className="h-4 w-4 text-gray-400" />
                    {client?.country && <span title={client.country}>{countryToFlag(client.country)}</span>}
                    <span>{formatPhone(client.phone)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
} 