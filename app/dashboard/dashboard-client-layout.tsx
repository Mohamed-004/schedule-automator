'use client';

import { ReactNode } from 'react';
import Sidebar from '@/components/dashboard/sidebar';

export default function DashboardClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto transition-all duration-300 ease-in-out">
          {children}
        </main>
      </div>
    </div>
  );
} 