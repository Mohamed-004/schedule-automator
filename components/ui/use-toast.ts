import { useState, useCallback } from 'react'
import { type ToastActionElement } from '@/components/ui/toast'

export type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  action?: ToastActionElement
}

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  action?: ToastActionElement
}

let toastCount = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(({ title, description, variant = 'default', action }: ToastOptions) => {
    const id = String(toastCount++)
    const newToast = { id, title, description, variant, action }
    
    setToasts(prevToasts => [...prevToasts, newToast])
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prevToasts => prevToasts.filter(t => t.id !== id))
    }, 5000)
    
    return newToast
  }, [])

  const dismiss = useCallback((toastId: string) => {
    setToasts(prevToasts => prevToasts.filter(t => t.id !== toastId))
  }, [])

  return {
    toast,
    dismiss,
    toasts,
  }
} 