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
  // On mobile, only render if open. On desktop, always render.
  // Use md:hidden and md:block to control visibility.
  return (
    <aside
      className={`
        bg-white border-r flex flex-col
        h-full w-64
        z-40
        fixed top-0 left-0
        transition-transform duration-200
        md:static md:z-auto md:block
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}
      style={{ minHeight: '100vh' }}
    >
      <div className="px-6 py-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Manager Dashboard</h2>
          <p className="text-xs text-gray-500 mt-1">Manage jobs, workers, and schedules</p>
        </div>
        {/* Close button for mobile */}
        <button
          className="md:hidden p-2 ml-2"
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
              className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${isActive ? 'bg-primary text-primary-foreground' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={onClose}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export function SidebarWithToggle() {
  const [open, setOpen] = useState(false)
  return (
    <>
      {/* Hamburger menu for mobile, only show when sidebar is closed */}
      {!open && (
        <button
          className="fixed z-50 top-4 left-4 md:hidden bg-white border rounded p-2 shadow"
          onClick={() => setOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <Sidebar open={open || typeof window === 'undefined'} onClose={() => setOpen(false)} />
    </>
  )
} 
 
 