/* eslint-disable react/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import { api } from '../services/api'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''
const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const socketRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    api.getNotifications()
      .then((data) => {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      })
      .catch(() => {})

    const socket = io(SOCKET_URL, { auth: { token } })
    socketRef.current = socket

    socket.on('notification', ({ notification, unreadCount: count }) => {
      setNotifications((prev) => [notification, ...prev])
      setUnreadCount(count)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    try { await api.markNotificationRead(id) } catch {}
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try { await api.markAllNotificationsRead() } catch {}
  }, [])

  const removeNotification = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id))
    try {
      const data = await api.deleteNotification(id)
      setUnreadCount(data.unreadCount || 0)
    } catch {}
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
