import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import dynamic from 'next/dynamic';
import 'react-phone-number-input/style.css';
import type { Worker, Client } from '@/lib/types';

// const PhoneInput = dynamic(() => import('react-phone-number-input'), { ssr: false });

interface JobFormProps {
  workers: Worker[];
  clients: Client[];
  onSave: (job: any) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
  initialData?: any;
}

export default function JobForm({ workers, clients, onSave, onClose, saving, initialData }: JobFormProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    client_id: '',
    worker_id: '',
    location: '',
    status: 'scheduled',
    duration_hours: '1',
  });

  useEffect(() => {
    if (initialData) {
      const initialForm = { ...initialData };
      if (initialData.scheduled_at) {
        try {
          const d = new Date(initialData.scheduled_at);
          initialForm.scheduled_at = d.toISOString().slice(0, 16);
        } catch (e) {
          console.error("Invalid date for initialData.scheduled_at", initialData.scheduled_at)
          initialForm.scheduled_at = '';
        }
      }
      setForm(prev => ({ ...prev, ...initialForm }));
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { worker_id, ...restOfForm } = form;
    const submissionData = {
      ...restOfForm,
      worker_id: worker_id || null,
    };
    await onSave(submissionData);
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-bold mb-4">{initialData ? 'Edit Job' : 'Add New Job'}</h2>
            {/* Title */}
            <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" value={form.title} onChange={handleChange} required />
            </div>
            {/* Description */}
            <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" value={form.description} onChange={handleChange} />
            </div>
            {/* Scheduled At */}
            <div>
                <Label htmlFor="scheduled_at">Date & Time</Label>
                <Input id="scheduled_at" name="scheduled_at" type="datetime-local" value={form.scheduled_at} onChange={handleChange} required />
            </div>
            {/* Client */}
            <div>
                <Label htmlFor="client_id">Client</Label>
                <select id="client_id" name="client_id" value={form.client_id} onChange={handleChange} required className="w-full border rounded px-2 py-2 bg-white">
                    <option value="">Select client</option>
                    {(clients || []).map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                </select>
            </div>
            {/* Worker */}
            <div>
                <Label htmlFor="worker_id">Worker</Label>
                <select id="worker_id" name="worker_id" value={form.worker_id} onChange={handleChange} className="w-full border rounded px-2 py-2 bg-white">
                    <option value="">(Optional) Select worker</option>
                    {(workers || []).map(worker => (
                        <option key={worker.id} value={worker.id}>{worker.name}</option>
                    ))}
                </select>
            </div>
            {/* Location */}
            <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" value={form.location} onChange={handleChange} />
            </div>
            {/* Status */}
            <div>
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" value={form.status} onChange={handleChange} className="w-full border rounded px-2 py-2 bg-white">
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            {/* Duration */}
            <div>
                <Label htmlFor="duration_hours">Duration (hours)</Label>
                <Input id="duration_hours" name="duration_hours" type="number" min="0" step="0.25" value={form.duration_hours} onChange={handleChange} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Job'}</Button>
            </div>
            </form>
        </div>
    </div>
  );
} 
 