import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Users, Briefcase, Bell, ListTodo, Menu, X, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/dashboard', label: "Today's Schedule", icon: ListTodo },
  { href: '/dashboard/calendar', label: 'Calendar View', icon: Calendar },
  { href: '/dashboard/team', label: 'Team', icon: Users },
  { href: '/dashboard/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/dashboard/assign-jobs', label: 'Assign Jobs', icon: Briefcase },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-full max-w-xs bg-white border-r flex flex-col z-40',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="px-6 py-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Manager Dashboard</h2>
            <p className="text-xs text-gray-500 mt-1">Manage jobs, workers, and schedules</p>
          </div>
          {/* Close button */}
          <button
            className="p-2 -mr-2"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-gray-700 hover:bg-gray-100'
                )}
                onClick={onClose}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
} 
 
 