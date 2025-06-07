"use client"

import React, { ReactNode, useState } from 'react'

interface TabsProps {
  defaultValue: string
  children: ReactNode
  className?: string
}

export function Tabs({ defaultValue, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue)
  
  // Modify children to pass activeTab value
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { activeTab, setActiveTab } as any)
    }
    return child
  })
  
  return (
    <div className={className}>
      {childrenWithProps}
    </div>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
  activeTab?: string
  setActiveTab?: (value: string) => void
}

export function TabsList({ children, className = '', activeTab, setActiveTab }: TabsListProps) {
  // Modify children to pass activeTab value
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { activeTab, setActiveTab } as any)
    }
    return child
  })
  
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`}>
      {childrenWithProps}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
  activeTab?: string
  setActiveTab?: (value: string) => void
}

export function TabsTrigger({ value, children, className = '', activeTab, setActiveTab }: TabsTriggerProps) {
  const isActive = activeTab === value
  
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
        ${isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'} ${className}`}
      onClick={() => setActiveTab?.(value)}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
  activeTab?: string
}

export function TabsContent({ value, children, className = '', activeTab }: TabsContentProps) {
  if (activeTab !== value) return null
  
  return (
    <div className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${className}`}>
      {children}
    </div>
  )
}
