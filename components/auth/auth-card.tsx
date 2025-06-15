/**
 * Glassmorphic card container for authentication forms
 * Provides backdrop blur effect while maintaining site consistency
 */

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AuthCardProps {
  children: ReactNode
  className?: string
}

export const AuthCard = ({ children, className }: AuthCardProps) => {
  return (
    <div className={cn(
      // Base card styling consistent with site's card component
      "bg-card/80 backdrop-blur-xl border border-border/50",
      "rounded-lg shadow-xl",
      // Glassmorphic enhancements
      "supports-[backdrop-filter]:bg-card/60",
      "supports-[backdrop-filter]:backdrop-blur-2xl",
      // Responsive padding and sizing
      "w-full max-w-md p-8",
      // Subtle animations
      "transition-all duration-300",
      "hover:shadow-2xl hover:border-border/70",
      className
    )}>
      {children}
    </div>
  )
} 