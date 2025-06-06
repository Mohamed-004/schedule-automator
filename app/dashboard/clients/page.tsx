'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-phone-number-input/style.css';

const PhoneInput = dynamic(() => import('react-phone-number-input'), { ssr: false });

export default function ClientsPage() {
  const supabase = createClientComponentClient();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', country: '' });
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: true });
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Validate phone number
    const cleaned = (form.phone || '').replace(/\D/g, '');
    if (cleaned.length < 10) {
      alert('Please enter a valid phone number.');
      setSaving(false);
      return;
    }
    // Extract country code from phone number (using react-phone-number-input's parsePhoneNumber)
    let country = '';
    try {
      if (form.phone) {
        // Only import if needed
        const { parsePhoneNumberFromString } = await import('libphonenumber-js');
        const phoneNumber = parsePhoneNumberFromString(form.phone);
        if (phoneNumber) {
          country = phoneNumber.country || '';
        }
      }
    } catch (e) {}
    await supabase.from('clients').insert([{ ...form, country }]);
    setShowAdd(false);
    setForm({ name: '', email: '', phone: '', address: '', country: '' });
    setSaving(false);
    fetchClients();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('clients').delete().eq('id', id);
    fetchClients();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>
      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 mb-4">No clients added yet.</div>
          <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2 mx-auto">
            <Plus className="h-4 w-4" /> Add Your First Client
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map(client => (
            <div key={client.id} className="flex items-center justify-between bg-white rounded-lg border p-4 shadow-sm">
              <div>
                <div className="font-bold">{client.name}</div>
                <div className="text-sm text-gray-500">{client.email} {client.phone && `| ${client.phone}`}</div>
                <div className="text-xs text-gray-400 mt-1">{client.address}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)}>
                <Trash2 className="h-5 w-5 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {/* Add Client Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add Client</h2>
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
                <PhoneInput
                  id="phone"
                  name="phone"
                  international
                  defaultCountry="US"
                  value={form.phone}
                  onChange={value => setForm(f => ({ ...f, phone: value || '' }))}
                  className="w-full border rounded px-2 py-2"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Client'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 