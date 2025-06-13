'use client';

import { ReactNode, useState } from 'react';
import Sidebar from '@/components/dashboard/sidebar';
import { Menu } from 'lucide-react';

export default function DashboardClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar: always visible on desktop, drawer on mobile */}
      <div className="hidden md:block">
        <Sidebar open={true} onClose={() => {}} />
      </div>
      {/* Drawer sidebar for mobile */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
          <Sidebar open={true} onClose={() => setSidebarOpen(false)} />
        </>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="w-full border-b bg-white px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Menu button for mobile */}
            <button
              className="md:hidden p-2 border rounded bg-white shadow"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="flex gap-6">
              <span className="text-sm font-semibold text-green-600">12 Active Jobs</span>
              <span className="text-sm font-semibold text-blue-600">8 Workers Available</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="rounded-full border p-2 hover:bg-gray-100"
              onClick={() => window.location.href = '/dashboard/settings'}
              title="Settings"
            >
              <span className="sr-only">Settings</span>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 5 15.4a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 16 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.14.31.22.65.22 1v.09A1.65 1.65 0 0 0 21 12c0 .35-.08.69-.22 1z"/></svg>
            </button>
            <button 
              className="rounded-full border p-2 hover:bg-gray-100"
              onClick={() => window.location.href = '/dashboard/notifications'}
              title="Notifications"
            >
              <span className="sr-only">Notifications</span>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  );
} 