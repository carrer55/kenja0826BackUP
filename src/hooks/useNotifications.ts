import { useState, useEffect } from 'react'
import { supabase, getNotifications, markNotificationAsRead } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data: any
  read: boolean
  read_at: string | null
  created_at: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchNotifications()
      subscribeToNotifications()
    } else {
      // デモモードの場合はサンプル通知を表示
      if (localStorage.getItem('demoMode') === 'true') {
        setNotifications([
          {
            id: '1',
            user_id: 'demo-user-id',
            type: 'approval',
            title: '出張申請が承認されました',
            message: '東京出張申請（BT-2024-001）が承認されました。',
            data: {},
            read: false,
            read_at: null,
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            user_id: 'demo-user-id',
            type: 'reminder',
            title: '経費申請の提出期限が近づいています',
            message: '7月分の経費申請の提出期限は明日です。',
            data: {},
            read: true,
            read_at: new Date().toISOString(),
            created_at: new Date(Date.now() - 86400000).toISOString()
          }
        ])
        setUnreadCount(1)
      }
    }
  }, [user])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        setNotifications([])
        setUnreadCount(0)
        return
      }

      const data = await getNotifications(user.id)

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.read).length || 0)
    } catch (err) {
      console.error('Notifications fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToNotifications = () => {
    if (!user) return

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)
          
          // ブラウザ通知を表示
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/icon-192x192.png'
            })
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      if (localStorage.getItem('demoMode') === 'true') {
        // デモモードの場合はローカル状態のみ更新
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
        return { success: true }
      }

      const result = await markNotificationAsRead(notificationId)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

      return { success: true }
    } catch (err) {
      console.error('Mark as read error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to mark as read' 
      }
    }
  }

  const markAllAsRead = async () => {
    try {
      if (localStorage.getItem('demoMode') === 'true') {
        // デモモードの場合はローカル状態のみ更新
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
        )
        setUnreadCount(0)
        return { success: true }
      }

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('read', false)

      if (updateError) {
        throw updateError
      }

      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)

      return { success: true }
    } catch (err) {
      console.error('Mark all as read error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to mark all as read' 
      }
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      if (localStorage.getItem('demoMode') === 'true') {
        // デモモードの場合はローカル状態のみ更新
        const deletedNotification = notifications.find(n => n.id === notificationId)
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        
        if (deletedNotification && !deletedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
        return { success: true }
      }

      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (deleteError) {
        throw deleteError
      }

      const deletedNotification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

      return { success: true }
    } catch (err) {
      console.error('Delete notification error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete notification' 
      }
    }
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestNotificationPermission,
    refreshNotifications: fetchNotifications
  }
}