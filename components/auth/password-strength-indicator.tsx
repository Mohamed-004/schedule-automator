/**
 * Password strength indicator component
 * Provides visual feedback for password strength
 * Uses the site's color system for consistent styling
 */

'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface PasswordStrengthIndicatorProps {
  password: string
  className?: string
}

interface StrengthResult {
  score: number
  label: string
  color: string
  requirements: {
    length: boolean
    lowercase: boolean
    uppercase: boolean
    number: boolean
    special: boolean
  }
}

export const PasswordStrengthIndicator = ({ password, className }: PasswordStrengthIndicatorProps) => {
  const strength = useMemo((): StrengthResult => {
    const requirements = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }

    const score = Object.values(requirements).filter(Boolean).length
    
    let label = ''
    let color = ''
    
    switch (score) {
      case 0:
      case 1:
        label = 'Very Weak'
        color = 'bg-destructive'
        break
      case 2:
        label = 'Weak'
        color = 'bg-orange-500'
        break
      case 3:
        label = 'Fair'
        color = 'bg-yellow-500'
        break
      case 4:
        label = 'Good'
        color = 'bg-blue-500'
        break
      case 5:
        label = 'Strong'
        color = 'bg-green-500'
        break
    }

    return { score, label, color, requirements }
  }, [password])

  if (!password) return null

  return (
    <div className={cn("space-y-2", className)}>
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-300", strength.color)}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground min-w-[60px]">
          {strength.label}
        </span>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-1 gap-1 text-xs">
        <div className={cn(
          "flex items-center gap-2 transition-colors",
          strength.requirements.length ? "text-green-600" : "text-muted-foreground"
        )}>
          <div className={cn(
            "w-3 h-3 rounded-full border transition-colors",
            strength.requirements.length 
              ? "bg-green-500 border-green-500" 
              : "border-muted-foreground"
          )}>
            {strength.requirements.length && (
              <svg className="w-2 h-2 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span>At least 8 characters</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className={cn(
            "flex items-center gap-2 transition-colors",
            strength.requirements.lowercase ? "text-green-600" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-3 h-3 rounded-full border transition-colors",
              strength.requirements.lowercase 
                ? "bg-green-500 border-green-500" 
                : "border-muted-foreground"
            )}>
              {strength.requirements.lowercase && (
                <svg className="w-2 h-2 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span>Lowercase</span>
          </div>
          
          <div className={cn(
            "flex items-center gap-2 transition-colors",
            strength.requirements.uppercase ? "text-green-600" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-3 h-3 rounded-full border transition-colors",
              strength.requirements.uppercase 
                ? "bg-green-500 border-green-500" 
                : "border-muted-foreground"
            )}>
              {strength.requirements.uppercase && (
                <svg className="w-2 h-2 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span>Uppercase</span>
          </div>
          
          <div className={cn(
            "flex items-center gap-2 transition-colors",
            strength.requirements.number ? "text-green-600" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-3 h-3 rounded-full border transition-colors",
              strength.requirements.number 
                ? "bg-green-500 border-green-500" 
                : "border-muted-foreground"
            )}>
              {strength.requirements.number && (
                <svg className="w-2 h-2 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span>Number</span>
          </div>
          
          <div className={cn(
            "flex items-center gap-2 transition-colors",
            strength.requirements.special ? "text-green-600" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-3 h-3 rounded-full border transition-colors",
              strength.requirements.special 
                ? "bg-green-500 border-green-500" 
                : "border-muted-foreground"
            )}>
              {strength.requirements.special && (
                <svg className="w-2 h-2 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span>Special char</span>
          </div>
        </div>
      </div>
    </div>
  )
} 