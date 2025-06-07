import React from 'react'

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'default':
        return 'bg-blue-600 text-white hover:bg-blue-700'
      case 'secondary':
        return 'bg-gray-200 text-gray-900 hover:bg-gray-300'
      case 'destructive':
        return 'bg-red-600 text-white hover:bg-red-700'
      case 'outline':
        return 'border border-gray-300 bg-transparent text-gray-900'
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700'
    }
  }
  
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${getVariantClasses()} ${className}`}>
      {children}
    </div>
  )
}
