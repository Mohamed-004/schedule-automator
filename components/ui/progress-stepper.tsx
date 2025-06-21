import React from 'react'
import { CheckCircle, Circle, Clock, User, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

interface ProgressStepperProps {
  currentStep: string
  steps: Step[]
  className?: string
}

export function ProgressStepper({ currentStep, steps, className }: ProgressStepperProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep)

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex
          const isCurrent = index === currentStepIndex
          const isUpcoming = index > currentStepIndex
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                    {
                      "bg-green-500 border-green-500 text-white": isCompleted,
                      "bg-primary border-primary text-primary-foreground": isCurrent,
                      "bg-muted border-muted-foreground/30 text-muted-foreground": isUpcoming,
                    }
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                
                {/* Step Title */}
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors",
                      {
                        "text-green-600": isCompleted,
                        "text-primary": isCurrent,
                        "text-muted-foreground": isUpcoming,
                      }
                    )}
                  >
                    {step.title}
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-1 transition-colors",
                      {
                        "text-green-500": isCompleted,
                        "text-primary/80": isCurrent,
                        "text-muted-foreground/60": isUpcoming,
                      }
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4 transition-colors duration-200",
                    {
                      "bg-green-500": index < currentStepIndex,
                      "bg-primary": index === currentStepIndex - 1,
                      "bg-muted-foreground/20": index >= currentStepIndex,
                    }
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Pre-defined steps for reschedule modal
export const RESCHEDULE_STEPS: Step[] = [
  {
    id: 'select-time',
    title: 'Select Time',
    description: 'Choose date & time',
    icon: Clock,
  },
  {
    id: 'choose-worker',
    title: 'Choose Worker',
    description: 'Pick available worker',
    icon: User,
  },
  {
    id: 'confirm',
    title: 'Confirm',
    description: 'Review & reschedule',
    icon: Calendar,
  },
] 