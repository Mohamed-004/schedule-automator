/**
 * Shared authentication layout component
 * Provides consistent branding, responsive design, and animated background
 * Maintains consistency with the main dashboard design
 */

import { ReactNode } from 'react'
import { AnimatedBackground } from './animated-background'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AnimatedBackground />
      
      {/* Left side - Branding and info */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 py-16 relative">
        <div className="max-w-md">
          {/* Brand header consistent with sidebar */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Manager Pro</h1>
            <p className="text-muted-foreground mt-2">Automation Scheduler</p>
          </div>
          
          {/* Value proposition */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Streamline Your Business Operations
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Automate scheduling, manage your team, and optimize workflows with our 
                comprehensive business management platform.
              </p>
            </div>
            
            {/* Feature highlights */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-sm text-muted-foreground">
                  Intelligent job scheduling and assignment
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-sm text-muted-foreground">
                  Real-time team collaboration tools
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-sm text-muted-foreground">
                  Advanced analytics and reporting
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Authentication form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile branding */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground">Manager Pro</h1>
            <p className="text-muted-foreground text-sm mt-1">Automation Scheduler</p>
          </div>
          
          {/* Page title */}
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            {subtitle && (
              <p className="text-muted-foreground mt-2">{subtitle}</p>
            )}
          </div>
          
          {/* Form content */}
          {children}
        </div>
      </div>
    </div>
  )
} 