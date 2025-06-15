'use client'

import { useLoading } from '@/contexts/loading-provider'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Toaster } from '@/components/ui/toaster'

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoading } = useLoading()

  return (
    <>
      {isLoading && <LoadingSpinner />}
      <main className="min-h-screen flex flex-col items-center">{children}</main>
      <Toaster />
    </>
  )
} 