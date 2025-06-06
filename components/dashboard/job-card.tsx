import { Clock, MapPin, User, Mail, Phone } from 'lucide-react';
import type { Job } from '@/lib/types';
import { useWorkers } from '@/hooks/use-workers';
import { useBusiness } from '@/hooks/use-business';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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

interface JobCardProps {
  job: Job;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-green-100 text-green-700',
  emergency: 'bg-red-100 text-red-700',
  rescheduled: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
};

export default function JobCard({ job }: JobCardProps) {
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
    workers.map(w => [String(w.id).trim(), w.name])
  );
  const clientMap = Object.fromEntries(
    clients.map(c => [String(c.id).trim(), c])
  );
  const jobWorkerId = String(job.worker_id).trim();
  const workerName = workerMap[jobWorkerId];
  const client = clientMap[String(job.client_id).trim()];

  return (
    <div className="flex flex-col md:flex-row justify-between items-center bg-white rounded-lg border p-6 mb-4 shadow-sm gap-4">
      <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
        <div className="flex items-center gap-2 min-w-[100px]">
          <Clock className="h-5 w-5 text-gray-400" />
          <span className="text-lg font-semibold">
            {new Date(job.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[job.status] || 'bg-gray-100 text-gray-700'}`}>{job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="font-bold text-base mb-1">{job.client_name}</div>
          <div className="text-sm text-gray-500 mb-1">{job.title}</div>
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            <MapPin className="h-5 w-5" />
            <span>{job.location}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-700 mt-2">
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
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{client.email}</span>
              </div>
            )}
            {client?.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{formatPhone(client.phone)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 min-w-[150px] mt-4 md:mt-0">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{workerName || 'Unassigned'}</span>
        </div>
      </div>
    </div>
  );
} 
 
 