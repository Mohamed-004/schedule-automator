'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useBusiness } from '@/hooks/use-business';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';

export default function TeamPage() {
  const supabase = createClientComponentClient();
  const { business, loading: businessLoading } = useBusiness();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'Worker' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkers = async () => {
    if (!business) {
      setWorkers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('workers')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: true });
    setWorkers(data || []);
    setLoading(false);
  };

  useEffect(() => { 
    if (business) {
      fetchWorkers(); 
    }
  }, [business]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    if (!business) {
      setError('No business found.');
      setSaving(false);
      return;
    }

    console.log('Adding worker for business:', business);
    console.log('Form data:', form);

    try {
      const workerData = { 
        ...form, 
        business_id: business.id, 
        status: 'active',
        role: 'technician' // Ensure role matches the enum
      };
      console.log('Worker data to insert:', workerData);

      const { data, error: insertError } = await supabase
        .from('workers')
        .insert([workerData])
        .select();

      if (insertError) {
        console.error('Error inserting worker:', insertError);
        setError(insertError.message);
        setSaving(false);
        return;
      }

      console.log('Successfully inserted worker:', data);
      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', role: 'Worker' });
      setSaving(false);
      fetchWorkers();
    } catch (err) {
      console.error('Error in handleAdd:', err);
      setError(err instanceof Error ? err.message : 'Failed to add worker');
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('workers').delete().eq('id', id);
    fetchWorkers();
  };

  if (businessLoading) {
    return <div className="text-gray-400 text-center py-16">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Workers</h1>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Worker
        </Button>
      </div>
      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading...</div>
      ) : workers.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 mb-4">No workers added yet.</div>
          <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2 mx-auto">
            <Plus className="h-4 w-4" /> Add Your First Worker
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {workers.map(worker => (
            <div key={worker.id} className="flex items-center justify-between bg-white rounded-lg border p-4 shadow-sm">
              <div>
                <div className="font-bold">{worker.name}</div>
                <div className="text-sm text-gray-500">{worker.email} {worker.phone && `| ${worker.phone}`}</div>
                <div className="text-xs text-gray-400 mt-1">{worker.role}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(worker.id)}>
                <Trash2 className="h-5 w-5 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {/* Add Worker Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add Worker</h2>
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Input id="role" name="role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Worker'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 