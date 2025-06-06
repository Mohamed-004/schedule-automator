import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import dynamic from 'next/dynamic';
import 'react-phone-number-input/style.css';
import { useBusiness } from '@/hooks/use-business';

const PhoneInput = dynamic(() => import('react-phone-number-input'), { ssr: false });

interface JobFormProps {
  onSubmit: (job: any) => void;
  onCancel: () => void;
  saving?: boolean;
  initialData?: any;
}

export default function JobForm({ onSubmit, onCancel, saving, initialData }: JobFormProps) {
  const { business } = useBusiness();
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    client_id: '',
    worker_id: '',
    location: '',
    status: 'Scheduled',
    duration_hours: '',
  });
  const [clients, setClients] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: '' });
  const [addingClient, setAddingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchData() {
      const { data: clientsData } = await supabase.from('clients').select('*');
      setClients(clientsData || []);
      const { data: workersData } = await supabase.from('workers').select('*');
      setWorkers(workersData || []);
    }
    fetchData();
  }, [supabase]);

  useEffect(() => {
    if (initialData) {
      setForm({ ...form, ...initialData });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingClient(true);
    setClientError(null);
    if (!business) {
      setClientError('No business found.');
      setAddingClient(false);
      return;
    }
    const { data, error } = await supabase.from('clients').insert([
      { ...newClient, business_id: business.id }
    ]).select().single();
    if (!error && data) {
      setClients(prev => [...prev, data]);
      setForm(prev => ({ ...prev, client_id: data.id }));
      setShowAddClient(false);
      setNewClient({ name: '', email: '', phone: '', address: '' });
    } else {
      setClientError(error?.message || 'Failed to add client.');
    }
    setAddingClient(false);
  };

  const handleSetLocationNA = () => {
    setForm(prev => ({ ...prev, location: 'N/A' }));
  };

  // Filter clients by search
  const filteredClients = clientSearch
    ? clients.filter(c =>
        c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone?.replace(/\D/g, '').includes(clientSearch.replace(/\D/g, ''))
      )
    : clients;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" value={form.title} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" value={form.description} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="scheduled_at">Date & Time</Label>
        <Input id="scheduled_at" name="scheduled_at" type="datetime-local" value={form.scheduled_at} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="client_id">Client</Label>
        {clients.length === 0 || showAddClient ? (
          <div className="space-y-2 border rounded p-3 bg-gray-50">
            <div className="font-semibold text-sm mb-2">Add New Client</div>
            {clientError && <div className="text-red-500 text-sm mb-2">{clientError}</div>}
            <Input placeholder="Name" value={newClient.name} onChange={e => setNewClient(c => ({ ...c, name: e.target.value }))} required className="mb-1" />
            <Input placeholder="Email" value={newClient.email} onChange={e => setNewClient(c => ({ ...c, email: e.target.value }))} className="mb-1" />
            <PhoneInput
              placeholder="Phone"
              international
              defaultCountry="US"
              value={newClient.phone}
              onChange={value => setNewClient(c => ({ ...c, phone: value || '' }))}
              className="w-full border rounded px-2 py-2 mb-1"
            />
            <Input placeholder="Address" value={newClient.address} onChange={e => setNewClient(c => ({ ...c, address: e.target.value }))} className="mb-2" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowAddClient(false); setNewClient({ name: '', email: '', phone: '', address: '' }); setClientError(null); }}>Cancel</Button>
              <Button type="button" onClick={handleAddClient} disabled={addingClient}>{addingClient ? 'Adding...' : 'Add Client'}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Search clients by name, email, or phone"
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="mb-2"
            />
            <div className="flex gap-2 items-center">
              <select id="client_id" name="client_id" value={form.client_id} onChange={handleChange} required className="w-full border rounded px-2 py-2">
                <option value="">Select client</option>
                {filteredClients.map(client => (
                  <option key={client.id} value={client.id}>{client.name} {client.email ? `(${client.email})` : ''}</option>
                ))}
              </select>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddClient(true)}>
                Add New
              </Button>
            </div>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="worker_id">Worker</Label>
        <select id="worker_id" name="worker_id" value={form.worker_id} onChange={handleChange} required className="w-full border rounded px-2 py-2">
          <option value="">Select worker</option>
          {workers.map(worker => (
            <option key={worker.id} value={worker.id}>{worker.name}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <div className="flex gap-2">
          <Input id="location" name="location" value={form.location} onChange={handleChange} />
          <Button type="button" variant="outline" size="sm" onClick={handleSetLocationNA}>N/A</Button>
        </div>
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <select id="status" name="status" value={form.status} onChange={handleChange} className="w-full border rounded px-2 py-2">
          <option value="scheduled">Scheduled</option>
          <option value="rescheduled">Rescheduled</option>
          <option value="cancelled">Cancelled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div>
        <Label htmlFor="duration_hours">Duration (hours)</Label>
        <Input id="duration_hours" name="duration_hours" type="number" min="0.5" step="0.5" value={form.duration_hours} onChange={handleChange} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading || saving}>{(loading || saving) ? 'Saving...' : 'Save Job'}</Button>
      </div>
    </form>
  );
} 
 