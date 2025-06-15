import { Inter } from 'next/font/google'
import './globals.css'
import { SupabaseProvider } from '@/lib/SupabaseProvider'
import { LoadingProvider } from '@/contexts/loading-provider'
import LayoutClient from './layout-client'
import React from 'react'

const inter = Inter({ subsets: ['latin'] })

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Next.js and Supabase Starter Kit',
  description: 'The fastest way to build apps with Next.js and Supabase',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider>
          <LoadingProvider>
            <LayoutClient>{children}</LayoutClient>
          </LoadingProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}
