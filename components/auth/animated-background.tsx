/**
 * Animated background component for authentication pages
 * Features geometric patterns representing automation and scheduling
 * Uses the site's existing color scheme for consistency
 */

'use client'

export const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Primary gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      
      {/* Animated geometric shapes */}
      <div className="absolute inset-0">
        {/* Large circles representing scheduling cycles */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border border-primary/10 animate-pulse" />
        <div className="absolute top-3/4 right-1/4 w-48 h-48 rounded-full border border-primary/15 animate-pulse delay-1000" />
        
        {/* Grid pattern representing organization */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-12 gap-4 h-full w-full p-8">
            {Array.from({ length: 48 }).map((_, i) => (
              <div 
                key={i} 
                className="border border-primary/20 rounded-sm animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
        
        {/* Floating automation icons */}
        <div className="absolute top-1/3 left-1/3 w-4 h-4 bg-primary/20 rounded-full animate-bounce delay-500" />
        <div className="absolute top-2/3 right-1/3 w-3 h-3 bg-primary/15 rounded-full animate-bounce delay-1500" />
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-primary/25 rounded-full animate-bounce delay-2000" />
      </div>
    </div>
  )
} 