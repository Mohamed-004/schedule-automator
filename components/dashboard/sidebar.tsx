'use client'

import { CustomLink } from '@/components/ui/custom-link'
import { usePathname } from 'next/navigation'
import { Calendar, Users, Briefcase, Bell, ListTodo, Menu, X, Settings } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useOnClickOutside } from '@/hooks/use-on-click-outside'

const navLinks = [
  { href: '/dashboard', label: "Today's Schedule", icon: ListTodo },
  { href: '/dashboard/calendar', label: 'Calendar View', icon: Calendar },
  { href: '/dashboard/team', label: 'Team', icon: Users },
  { href: '/dashboard/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/dashboard/assign-jobs', label: 'Assign Jobs', icon: Briefcase },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
]

const bottomLinks = [
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)
  const sidebarRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useOnClickOutside(sidebarRef, (event) => {
    if (buttonRef.current && buttonRef.current.contains(event.target as Node)) {
        return;
    }
    if (isOpen) {
      setIsOpen(false)
    }
  });

  // Add this effect to adjust the main content's margin
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const mainContent = document.querySelector('main')
        if (mainContent) {
            if (isOpen) {
                mainContent.classList.add('lg:ml-64')
            } else {
                mainContent.classList.remove('lg:ml-64')
            }
        }
    }
  }, [isOpen])

  return (
    <>
        {/* Toggle Button - now always visible */}
        <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white hover:bg-gray-700 transition-colors"
            aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <aside
            ref={sidebarRef}
            className={cn(
            'bg-gray-900 text-gray-200 border-r border-gray-700 flex flex-col',
            'h-full w-64 z-40 fixed top-0 left-0 transition-transform duration-300 ease-in-out',
            isOpen ? 'translate-x-0' : '-translate-x-full'
            )}
            style={{ minHeight: '100vh' }}
        >
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between h-[65px]">
                <div className="ml-12">
                    <h2 className="text-xl font-bold text-white">Manager Pro</h2>
                    <p className="text-xs text-gray-400 mt-1">Automation Scheduler</p>
                </div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href
                return (
                <CustomLink
                    key={href}
                    href={href}
                    className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-800 hover:text-white'
                    )}
                >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                </CustomLink>
                )
            })}
            </nav>
            <div className="px-3 py-4 border-t border-gray-700">
            {bottomLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href
                return (
                <CustomLink
                    key={href}
                    href={href}
                    className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-800 hover:text-white'
                    )}
                >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                </CustomLink>
                )
            })}
            </div>
        </aside>
    </>
  )
} 
 
 