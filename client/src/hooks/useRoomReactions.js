import { useState, useEffect, useRef, useCallback } from 'react'

const REACTIONS = ['👍', '❤️', '😂', '🎉', '🤔', '👀', '🔥', '✨']

export default function useRoomReactions(socketRef) {
  const [floatingReactions, setFloatingReactions] = useState([])
  const [raisedHands, setRaisedHands] = useState({})
  const idCounter = useRef(0)

  const sendReaction = useCallback((emoji) => {
    if (!socketRef.current) return
    socketRef.current.emit('reaction', { emoji })
  }, [socketRef])

  const toggleHand = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('raise-hand', { raised: true })
  }, [socketRef])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    socket.on('reaction', (data) => {
      const id = ++idCounter.current
      const x = 20 + Math.random() * 60 // 20-80% from left
      setFloatingReactions((prev) => [...prev, { id, ...data, x }])
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id))
      }, 3000)
    })

    socket.on('raise-hand', (data) => {
      setRaisedHands((prev) => {
        const next = { ...prev }
        if (data.raised) next[data.socketId] = data.userName
        else delete next[data.socketId]
        return next
      })
    })

    return () => {
      socket.off('reaction')
      socket.off('raise-hand')
    }
  }, [socketRef])

  return { floatingReactions, raisedHands, sendReaction, toggleHand, REACTIONS }
}
