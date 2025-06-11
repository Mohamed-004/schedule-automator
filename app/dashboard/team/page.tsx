'use client';

import { useState } from 'react';
import { useSupabase } from '@/lib/SupabaseProvider';
import { useBusiness } from '@/hooks/use-business';
import { useWorkers } from '@/hooks/use-workers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, User, Mail, Phone, UserCircle, Shield, Calendar, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Worker } from '@/lib/types';
import WorkerCardSkeleton from '@/components/team/WorkerCardSkeleton';

export default function TeamPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { business, loading: businessLoading } = useBusiness();
  const { workers, loading, error: workersError, addWorker, deleteWorker, refresh } = useWorkers();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Omit<Worker, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'status'>>({ 
    name: '', 
    email: '', 
    phone: '', 
    role: 'technician'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!business) {
      setError('No business found.');
      return;
    }
    
    setSaving(true);
    setError(null);

    try {
      const workerData = { 
        ...form,
        business_id: business.id,
        status: 'active',
      };

      const result = await addWorker(workerData as any);
      
      if (!result) {
        setError('Failed to add worker. Please try again.');
        return;
      }

      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', role: 'technician' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add worker');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this worker?')) {
      const success = await deleteWorker(id);
      if (!success) {
        setError('Failed to delete worker');
      }
    }
  };

  if (businessLoading) {
    return (
      <div className="w-full h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading team information...</p>
        </div>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'technician': return 'bg-blue-100 text-blue-800';
      case 'manager': return 'bg-purple-100 text-purple-800';
      case 'dispatcher': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'technician': return <UserCircle className="h-4 w-4" />;
      case 'manager': return <Shield className="h-4 w-4" />;
      case 'dispatcher': return <Phone className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your workers and team members</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Worker
        </Button>
      </div>
      
      {workersError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          Error loading workers: {workersError.message}
        </div>
      )}
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <WorkerCardSkeleton key={i} />
          ))}
        </div>
      ) : !workers ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-6">
          No worker data available. Please try refreshing the page.
        </div>
      ) : workers.length === 0 ? (
        <Card className="border border-dashed border-gray-300 bg-gray-50">
          <CardContent className="p-10 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No workers added yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Add your first team member to start assigning jobs and managing your workforce.
            </p>
            <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2 mx-auto">
              <Plus className="h-4 w-4" /> Add Your First Worker
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers?.map(worker => (
            <Card key={worker.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-0">
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="flex items-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(worker.role)}`}>
                        {getRoleIcon(worker.role)}
                        {worker.role}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg mb-1">{worker.name}</h3>
                  
                  <div className="space-y-2 mb-4 flex-grow">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {worker.email}
                    </div>
                    {worker.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {worker.phone}
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t pt-4 mt-auto">
                    <div className="flex flex-col gap-2">
                      {/* Schedule Hours Button */}
                      <Button 
                        variant="default"
                        size="sm" 
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm transition-all duration-200 hover:shadow-md"
                        onClick={() => router.push(`/dashboard/team/availability/${worker.id}`)}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Hours
                      </Button>
                      
                      {/* Remove Button */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(worker.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors duration-200"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Worker Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-6">Add Team Member</h2>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-medium">Full Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={form.name} 
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                    placeholder="Enter full name"
                    className="border-gray-300"
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-medium">Email Address</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={form.email} 
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                    placeholder="Enter email address"
                    className="border-gray-300"
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-medium">Phone Number</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    type="tel" 
                    value={form.phone} 
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} 
                    placeholder="Enter phone number"
                    className="border-gray-300"
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role" className="font-medium">Role</Label>
                  <Select 
                    value={form.role} 
                    onValueChange={value => setForm(f => ({ ...f, role: value as 'technician' | 'dispatcher' | 'manager' }))}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="dispatcher">Dispatcher</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAdd(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? 'Adding...' : 'Add Worker'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 