import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import dynamic from 'next/dynamic';
import 'react-phone-number-input/style.css';
import { useBusiness } from '@/hooks/use-business';
import { useWorkers } from '@/hooks/use-workers';

const PhoneInput = dynamic(() => import('react-phone-number-input'), { ssr: false });

interface JobFormProps {
  onSubmit: (job: any) => void;
  onCancel: () => void;
  saving?: boolean;
  initialData?: any;
}

export default function JobForm({ onSubmit, onCancel, saving, initialData }: JobFormProps) {
  const { business } = useBusiness();
  const { workers } = useWorkers();
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    client_id: '',
    worker_id: '',
    location: '',
    status: 'scheduled',
    duration_hours: '',
  });
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: '' });
  const [addingClient, setAddingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchClients() {
      if (!business?.id) return;
      setLoading(true);
      try {
        const { data: clientsData, error } = await supabase
          .from('clients')
          .select('*')
          .eq('business_id', business.id);
        if (error) throw error;
        setClients(clientsData || []);
      } catch (err) {
        setClientError('Failed to fetch clients. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, [business, supabase]);

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
    // Prevent empty UUIDs
    if (!form.client_id) {
      setClientError('Please select a client.');
      setLoading(false);
      return;
    }
    // Allow N/A worker (null or empty string)
    const jobData = { ...form };
    if (!form.worker_id || form.worker_id === 'na') {
      delete jobData.worker_id;
    }
    await onSubmit(jobData);
    setLoading(false);
  };

  // Validate all client fields before add
  const validateNewClient = () => {
    if (!newClient.name.trim()) return 'Name is required.';
    if (!newClient.email.trim()) return 'Email is required.';
    if (!newClient.phone.trim()) return 'Phone is required.';
    if (!newClient.address.trim()) return 'Address is required.';
    return null;
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingClient(true);
    setClientError(null);
    const validationError = validateNewClient();
    if (validationError) {
      setClientError(validationError);
      setAddingClient(false);
      return;
    }
    if (!business || !business.id) {
      setClientError('No business found. Please refresh or contact support.');
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
      setClientError(null);
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
    <form onSubmit={handleSubmit} className="space-y-7 bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full mx-auto">
      <div className="space-y-2">
        <Label htmlFor="title" className="block mb-1 font-medium">Title</Label>
        <Input id="title" name="title" value={form.title} onChange={handleChange} required autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description" className="block mb-1 font-medium">Description</Label>
        <Textarea id="description" name="description" value={form.description} onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="scheduled_at" className="block mb-1 font-medium">Date & Time</Label>
        <Input id="scheduled_at" name="scheduled_at" type="datetime-local" value={form.scheduled_at} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="client_id" className="block mb-1 font-medium">Client</Label>
        {loading ? (
          <div className="py-2 text-gray-500 text-sm">Loading clients...</div>
        ) : clients.length === 0 || showAddClient ? (
          <div className="space-y-2 border rounded-lg p-4 bg-white shadow-sm">
            <div className="font-semibold text-sm mb-2">Add New Client</div>
            {clientError && <div className="text-red-500 text-sm mb-2">{clientError}</div>}
            <Input placeholder="Name" value={newClient.name} onChange={e => setNewClient(c => ({ ...c, name: e.target.value }))} required className="mb-1" />
            <Input placeholder="Email" value={newClient.email} onChange={e => setNewClient(c => ({ ...c, email: e.target.value }))} required className="mb-1" />
            <PhoneInput
              placeholder="Phone"
              international
              defaultCountry="US"
              value={newClient.phone}
              onChange={value => setNewClient(c => ({ ...c, phone: value || '' }))}
              className="w-full border rounded px-2 py-2 mb-1"
            />
            <Input placeholder="Address" value={newClient.address} onChange={e => setNewClient(c => ({ ...c, address: e.target.value }))} required className="mb-2" />
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => { setShowAddClient(false); setNewClient({ name: '', email: '', phone: '', address: '' }); setClientError(null); }}>Cancel</Button>
              <Button type="button" onClick={handleAddClient} disabled={addingClient || !business || !business.id}>{addingClient ? 'Adding...' : 'Add Client'}</Button>
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
      <div className="space-y-2">
        <Label htmlFor="worker_id" className="block mb-1 font-medium">Worker</Label>
        <select id="worker_id" name="worker_id" value={form.worker_id} onChange={handleChange} className="w-full border rounded px-2 py-2">
          <option value="">Select worker</option>
          <option value="na">N/A</option>
          {workers.map(worker => (
            <option key={worker.id} value={worker.id}>{worker.name} ({worker.role})</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location" className="block mb-1 font-medium">Location</Label>
        <div className="flex gap-2">
          <Input id="location" name="location" value={form.location} onChange={handleChange} className="flex-1" />
          <Button type="button" variant="outline" onClick={handleSetLocationNA}>N/A</Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status" className="block mb-1 font-medium">Status</Label>
        <select id="status" name="status" value={form.status} onChange={handleChange} className="w-full border rounded px-2 py-2">
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="duration_hours" className="block mb-1 font-medium">Duration (hours)</Label>
        <Input id="duration_hours" name="duration_hours" value={form.duration_hours} onChange={handleChange} type="number" min="0" step="0.25" />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading || saving}>{loading || saving ? 'Saving...' : 'Save Job'}</Button>
      </div>
    </form>
  );
} 
 