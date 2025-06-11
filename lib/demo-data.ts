import { addHours, addMinutes, addDays, startOfDay } from 'date-fns'
import type { Job as TimelineJob, Worker as TimelineWorker } from '@/components/jobs/TimelineScheduler'

export function generateDemoTimelineData(selectedDate: Date) {
  const dayStart = startOfDay(selectedDate)
  const weekStart = startOfDay(selectedDate) // We'll distribute jobs across the week

  // Demo workers with different roles and statuses
  const demoWorkers: TimelineWorker[] = [
    {
      id: 'worker-1',
      name: 'Sarah Chen',
      role: 'Senior Technician',
      status: 'available',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b043?w=150&h=150&fit=crop&crop=face',
      utilization: 85,
      skills: ['HVAC', 'Electrical']
    },
    {
      id: 'worker-2',
      name: 'Marcus Johnson',
      role: 'Lead Engineer',
      status: 'busy',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      utilization: 95,
      skills: ['Plumbing', 'General Maintenance']
    },
    {
      id: 'worker-3',
      name: 'Ana Rodriguez',
      role: 'Field Specialist',
      status: 'available',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      utilization: 60,
      skills: ['IT Support', 'Electrical']
    },
    {
      id: 'worker-4',
      name: 'James Wilson',
      role: 'Junior Technician',
      status: 'available',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      utilization: 40,
      skills: ['HVAC', 'General Maintenance']
    },
    {
      id: 'worker-5',
      name: 'Lisa Park',
      role: 'Senior Engineer',
      status: 'offline',
      avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face',
      utilization: 0,
      skills: ['General Maintenance', 'IT Support']
    },
  ]

  // Demo jobs with realistic scheduling
  const demoJobs: TimelineJob[] = [
    {
      id: 'job-1',
      title: 'HVAC System Maintenance',
      description: 'Quarterly maintenance check for commercial HVAC system',
      client_name: 'Downtown Office Complex',
      worker_id: 'worker-1',
      worker_name: 'Sarah Chen',
      scheduled_at: addHours(dayStart, 8).toISOString(),
      duration_hours: 2,
      status: 'scheduled',
      priority: 'medium',
      location: '123 Business Plaza, Suite 400',
    },
    {
      id: 'job-2',
      title: 'Emergency Plumbing Repair',
      description: 'Urgent pipe burst repair in basement',
      client_name: 'Riverside Apartments',
      worker_id: 'worker-2',
      worker_name: 'Marcus Johnson',
      scheduled_at: addHours(dayStart, 7).toISOString(),
      duration_hours: 3,
      status: 'in_progress',
      priority: 'urgent',
      location: '456 River St, Building B',
    },
    {
      id: 'job-3',
      title: 'Electrical Panel Inspection',
      description: 'Annual safety inspection of main electrical panel',
      client_name: 'Tech Startup Inc',
      worker_id: 'worker-1',
      worker_name: 'Sarah Chen',
      scheduled_at: addHours(dayStart, 11).toISOString(),
      duration_hours: 1.5,
      status: 'scheduled',
      priority: 'high',
      location: '789 Innovation Drive',
    },
    {
      id: 'job-4',
      title: 'Network Infrastructure Setup',
      description: 'Install and configure new network equipment',
      client_name: 'Creative Agency Ltd',
      worker_id: 'worker-3',
      worker_name: 'Ana Rodriguez',
      scheduled_at: addHours(dayStart, 9).toISOString(),
      duration_hours: 4,
      status: 'scheduled',
      priority: 'medium',
      location: '321 Design Avenue, Floor 3',
    },
    {
      id: 'job-5',
      title: 'Security System Update',
      description: 'Upgrade surveillance cameras and access control',
      client_name: 'Metro Bank Branch',
      worker_id: 'worker-2',
      worker_name: 'Marcus Johnson',
      scheduled_at: addHours(dayStart, 14).toISOString(),
      duration_hours: 2.5,
      status: 'scheduled',
      priority: 'high',
      location: '555 Financial District',
    },
    {
      id: 'job-6',
      title: 'Routine Maintenance Check',
      description: 'Monthly equipment check and calibration',
      client_name: 'Manufacturing Corp',
      worker_id: 'worker-4',
      worker_name: 'James Wilson',
      scheduled_at: addHours(dayStart, 10).toISOString(),
      duration_hours: 3,
      status: 'scheduled',
      priority: 'low',
      location: '777 Industrial Park, Unit 12',
    },
    {
      id: 'job-7',
      title: 'Fire Safety System Test',
      description: 'Quarterly testing of fire alarms and suppression',
      client_name: 'Grand Hotel',
      worker_id: 'worker-3',
      worker_name: 'Ana Rodriguez',
      scheduled_at: addHours(dayStart, 15).toISOString(),
      duration_hours: 2,
      status: 'scheduled',
      priority: 'medium',
      location: '888 Hospitality Blvd',
    },
    {
      id: 'job-8',
      title: 'Data Center Cooling Repair',
      description: 'Fix malfunctioning cooling unit in server room',
      client_name: 'Cloud Services Inc',
      worker_id: 'worker-1',
      worker_name: 'Sarah Chen',
      scheduled_at: addHours(dayStart, 16).toISOString(),
      duration_hours: 1,
      status: 'completed',
      priority: 'urgent',
      location: '999 Data Center Drive',
    },
    // Additional jobs spread across the week
    {
      id: 'job-9',
      title: 'Server Room Maintenance',
      description: 'Monthly server maintenance and updates',
      client_name: 'TechCorp Solutions',
      worker_id: 'worker-1',
      worker_name: 'Sarah Chen',
      scheduled_at: addHours(addDays(weekStart, 1), 9).toISOString(), // Tuesday
      duration_hours: 2,
      status: 'scheduled',
      priority: 'medium',
      location: '444 Tech Park, Building A',
    },
    {
      id: 'job-10',
      title: 'Point of Sale System Install',
      description: 'Install new POS terminals and configure payment processing',
      client_name: 'Retail Chain Store',
      worker_id: 'worker-3',
      worker_name: 'Ana Rodriguez',
      scheduled_at: addHours(addDays(weekStart, 2), 10).toISOString(), // Wednesday
      duration_hours: 3,
      status: 'scheduled',
      priority: 'high',
      location: '555 Shopping Center, Unit 15',
    },
    {
      id: 'job-11',
      title: 'Backup System Configuration',
      description: 'Configure automated backup systems',
      client_name: 'Financial Services Inc',
      worker_id: 'worker-2',
      worker_name: 'Marcus Johnson',
      scheduled_at: addHours(addDays(weekStart, 3), 11).toISOString(), // Thursday
      duration_hours: 2.5,
      status: 'scheduled',
      priority: 'medium',
      location: '666 Finance District, Tower B',
    },
    {
      id: 'job-12',
      title: 'Video Conference Setup',
      description: 'Install and configure video conferencing equipment',
      client_name: 'Corporate Headquarters',
      worker_id: 'worker-4',
      worker_name: 'James Wilson',
      scheduled_at: addHours(addDays(weekStart, 4), 14).toISOString(), // Friday
      duration_hours: 1.5,
      status: 'scheduled',
      priority: 'low',
      location: '777 Business Plaza, Conference Room',
    },
    // Weekend jobs
    {
      id: 'job-13',
      title: 'Database Migration',
      description: 'Critical database migration during off-hours',
      client_name: 'E-commerce Platform',
      worker_id: 'worker-1',
      worker_name: 'Sarah Chen',
      scheduled_at: addHours(addDays(weekStart, 5), 20).toISOString(), // Saturday evening
      duration_hours: 4,
      status: 'scheduled',
      priority: 'urgent',
      location: '888 Data Center Complex',
    },
    // Unassigned jobs
    {
      id: 'job-14',
      title: 'Printer Network Setup',
      description: 'Configure new office printers and network settings',
      client_name: 'Law Firm Associates',
      worker_id: undefined,
      worker_name: undefined,
      scheduled_at: addHours(addDays(weekStart, 1), 13).toISOString(), // Tuesday
      duration_hours: 1.5,
      status: 'scheduled',
      priority: 'medium',
      location: '111 Legal Plaza, Suite 200',
    },
    {
      id: 'job-15',
      title: 'Emergency Generator Test',
      description: 'Critical power backup system testing',
      client_name: 'Hospital Medical Center',
      worker_id: undefined,
      worker_name: undefined,
      scheduled_at: addHours(addDays(weekStart, 2), 12).toISOString(), // Wednesday
      duration_hours: 2,
      status: 'scheduled',
      priority: 'urgent',
      location: '222 Healthcare Avenue',
    },
  ]

  return {
    workers: demoWorkers,
    jobs: demoJobs,
  }
} 