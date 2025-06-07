import { Database } from './supabase'

// Business Profile
export type Business = {
  id: string
  name: string
  email: string
  phone: string
  address: string
  timezone: string
  has_workers: boolean
  subscription_tier: 'starter' | 'pro' | 'elite'
  max_clients: number
  created_at: string
  updated_at: string
}

// Worker (optional based on business needs)
export type Worker = {
  id: string
  business_id: string
  name: string
  email: string
  phone: string
  role: 'technician' | 'dispatcher' | 'manager'
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

// Client
export type Client = {
  id: string
  business_id: string
  name: string
  email: string
  phone: string
  address: string
  notes?: string
  created_at: string
  updated_at: string
}

// Job/Appointment
export type Job = {
  id: string
  business_id: string
  client_id: string
  worker_id: string
  title: string
  description: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled'
  scheduled_at: string
  completed_at: string | null
  location: string
  client_name: string
  worker_name?: string
  worker?: Worker | null
  created_at: string
  updated_at: string
}

// Reminder
export type Reminder = {
  id: string
  job_id: string
  type: 'email' | 'sms'
  status: 'pending' | 'sent' | 'failed'
  scheduled_at: string
  sent_at: string | null
  created_at: string
  updated_at: string
}

// Reschedule Request
export type RescheduleRequest = {
  id: string
  job_id: string
  requested_by: 'client' | 'worker'
  status: 'pending' | 'approved' | 'rejected'
  requested_date: string
  reason: string
  created_at: string
  updated_at: string
}

// Notification
export type Notification = {
  id: string
  business_id: string
  user_id: string
  type: 'job_reminder' | 'reschedule_request' | 'job_status'
  title: string
  message: string
  read: boolean
  created_at: string
  updated_at: string
}

// Worker Availability Types
export interface WeeklyAvailability {
  id: string;
  worker_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  created_at: string;
  updated_at: string;
}

export interface AvailabilityException {
  id: string;
  worker_id: string;
  date: string; // YYYY-MM-DD
  is_available: boolean;
  start_time?: string | null; // HH:MM:SS or null for all-day
  end_time?: string | null; // HH:MM:SS or null for all-day
  reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  day: number;
  start: string; // HH:MM format
  end: string; // HH:MM format
  id?: string; // For existing slots
}

export interface AvailabilityExceptionInput {
  date: string; // YYYY-MM-DD
  isAvailable: boolean;
  allDay: boolean;
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  reason?: string;
  id?: string; // For existing exceptions
}

// Database Schema Types
export type Tables = {
  businesses: Business
  workers: Worker
  clients: Client
  jobs: Job
  reminders: Reminder
  reschedule_requests: RescheduleRequest
  notifications: Notification
}

// Database Schema
export const schema = {
  businesses: {
    id: 'uuid primary key default uuid_generate_v4()',
    name: 'text not null',
    email: 'text not null unique',
    phone: 'text not null',
    address: 'text not null',
    timezone: 'text not null',
    has_workers: 'boolean not null default false',
    subscription_tier: 'text not null check (subscription_tier in (\'starter\', \'pro\', \'elite\'))',
    max_clients: 'integer not null',
    created_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null',
    updated_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null'
  },
  workers: {
    id: 'uuid primary key default uuid_generate_v4()',
    business_id: 'uuid references businesses(id) on delete cascade',
    name: 'text not null',
    email: 'text not null',
    phone: 'text not null',
    role: 'text not null check (role in (\'technician\', \'dispatcher\', \'manager\'))',
    status: 'text not null check (status in (\'active\', \'inactive\'))',
    created_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null',
    updated_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null'
  },
  clients: {
    id: 'uuid primary key default uuid_generate_v4()',
    business_id: 'uuid references businesses(id) on delete cascade',
    name: 'text not null',
    email: 'text not null',
    phone: 'text not null',
    address: 'text not null',
    notes: 'text',
    created_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null',
    updated_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null'
  },
  jobs: {
    id: 'uuid primary key default uuid_generate_v4()',
    business_id: 'uuid references businesses(id) on delete cascade',
    client_id: 'uuid references clients(id) on delete cascade',
    worker_id: 'uuid references workers(id) on delete set null',
    title: 'text not null',
    description: 'text',
    status: 'text not null check (status in (\'scheduled\', \'in_progress\', \'completed\', \'cancelled\'))',
    priority: 'text not null check (priority in (\'normal\', \'high\', \'emergency\'))',
    start_time: 'timestamp with time zone not null',
    end_time: 'timestamp with time zone not null',
    duration_minutes: 'integer not null',
    location: 'text not null',
    created_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null',
    updated_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null'
  },
  reminders: {
    id: 'uuid primary key default uuid_generate_v4()',
    job_id: 'uuid references jobs(id) on delete cascade',
    type: 'text not null check (type in (\'sms\', \'email\'))',
    status: 'text not null check (status in (\'pending\', \'sent\', \'failed\'))',
    scheduled_for: 'timestamp with time zone not null',
    sent_at: 'timestamp with time zone',
    created_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null',
    updated_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null'
  },
  reschedule_requests: {
    id: 'uuid primary key default uuid_generate_v4()',
    job_id: 'uuid references jobs(id) on delete cascade',
    original_start_time: 'timestamp with time zone not null',
    original_end_time: 'timestamp with time zone not null',
    new_start_time: 'timestamp with time zone not null',
    new_end_time: 'timestamp with time zone not null',
    status: 'text not null check (status in (\'pending\', \'approved\', \'rejected\'))',
    requested_by: 'text not null check (requested_by in (\'client\', \'business\'))',
    created_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null',
    updated_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null'
  },
  notifications: {
    id: 'uuid primary key default uuid_generate_v4()',
    business_id: 'uuid references businesses(id) on delete cascade',
    type: 'text not null check (type in (\'reminder\', \'reschedule\', \'cancellation\', \'emergency\'))',
    title: 'text not null',
    message: 'text not null',
    status: 'text not null check (status in (\'unread\', \'read\'))',
    created_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null',
    updated_at: 'timestamp with time zone default timezone(\'utc\'::text, now()) not null'
  }
} 
 
 