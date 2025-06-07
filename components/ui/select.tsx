"use client"

import React, { ReactNode, SelectHTMLAttributes, useState } from 'react'

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  children: ReactNode
  className?: string
}

export function Select({
  value,
  onValueChange,
  placeholder,
  children,
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
    </div>
  )
}

interface SelectItemProps {
  value: string
  children: ReactNode
  className?: string
}

export function SelectItem({ value, children, className = '' }: SelectItemProps) {
  return (
    <option value={value} className={className}>
      {children}
    </option>
  )
}

// Create simplified SelectTrigger and SelectValue as pass-through components
export function SelectTrigger({ className = '', children }: { className?: string, children: ReactNode }) {
  return <div className={className}>{children}</div>
}

export function SelectContent({ className = '', children }: { className?: string, children: ReactNode }) {
  return <>{children}</>
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span>{placeholder}</span>
}
