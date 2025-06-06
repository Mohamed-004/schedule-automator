import { useEffect, useState } from 'react'
import { notificationOperations } from '@/lib/db-operations'
import type { Notification } from '@/lib/types'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const data = await notificationOperations.list()
        setNotifications(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch notifications'))
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, loading, error }
} 