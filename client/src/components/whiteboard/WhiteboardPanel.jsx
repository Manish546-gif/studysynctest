import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  FileText,
  MessageCircle,
  Users,
  UserPlus,
  Send,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react'
import FilePreview from '../common/FilePreview'

function formatMessageTime(value) {
  if (!value) return ''
  const d = new Date(value)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function WhiteboardPanel({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  roomId,
  files,
  setFiles,
  emitFileUploaded,
  emitFileDeleted,
  messages,
  chatInput,
  setChatInput,
  onSendChat,
  chatScrollRef,
  user,
  members,
  room,
  code,
  codeCopied,
  onCopyCode,
}) {
  const memberColors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
  ]

  const [width, setWidth] = useState(380)
  const resizing = useRef(false)

  const startResize = (e) => {
    e.preventDefault()
    resizing.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onResize = (e) => {
    if (!resizing.current) return
    const container = e.currentTarget.parentElement.parentElement.getBoundingClientRect()
    const panel = e.currentTarget.parentElement.getBoundingClientRect()
    const newWidth = panel.right - e.clientX
    setWidth(Math.min(container.width - 100, Math.max(260, newWidth)))
  }

  const stopResize = (e) => {
    resizing.current = false
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const tabs = [
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'invite', label: 'Invite', icon: UserPlus },
  ]

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="bg-surface-container-low border-l border-outline-variant/20 flex flex-col overflow-hidden shrink-0 h-full relative"
    >
      <div
        className="absolute top-0 left-0 bottom-0 w-1.5 cursor-col-resize group hover:bg-primary/30 active:bg-primary/50 transition-colors z-20"
        onPointerDown={startResize}
        onPointerMove={onResize}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
      />
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/20 shrink-0">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active ? 'bg-primary-container text-on-primary-container' : 'text-on-surface/40 hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            )
          })}
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'files' && (
          <FilePreview
            roomId={roomId}
            files={files}
            setFiles={setFiles}
            emitFileUploaded={emitFileUploaded}
            emitFileDeleted={emitFileDeleted}
            isOpen={true}
            onToggle={onClose}
            panel={true}
          />
        )}

        {activeTab === 'chat' && (
          <>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageCircle size={28} className="text-on-surface/15 mb-3" />
                  <p className="text-sm text-on-surface/40">No messages yet</p>
                  <p className="text-xs text-on-surface/25 mt-1">Say hello to your study group</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const initials = (msg.name || '?')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                  const isOwn = msg.userId === user?.id
                  const time = formatMessageTime(msg.createdAt)
                  return (
                    <div key={msg._id || `${msg.createdAt}-${msg.userId}-${msg.text}`} className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isOwn ? 'bg-primary text-on-primary' : 'bg-primary-container text-on-primary-container'
                      }`}>
                        <span className="text-[11px] font-bold">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-on-surface">{msg.name}{isOwn ? ' (You)' : ''}</span>
                          <span className="text-[10px] text-on-surface/30">{time}</span>
                        </div>
                        <p className="text-sm text-on-surface/70 leading-relaxed break-words">{msg.text}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <form onSubmit={onSendChat} className="p-3 border-t border-outline-variant/20">
              <div className="flex items-center gap-2 bg-surface-container-lowest rounded-xl px-3 py-2 border border-outline-variant/20">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface/30 outline-none"
                />
                <button type="submit" className="text-primary p-1.5 rounded-lg hover:bg-primary-container/30 transition-colors">
                  <Send size={16} />
                </button>
              </div>
            </form>
          </>
        )}

        {activeTab === 'members' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {members.map((member, i) => (
              <div key={member._id || i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition-colors">
                <div className={`w-10 h-10 rounded-xl ${memberColors[i % memberColors.length]} flex items-center justify-center text-white font-bold text-sm`}>
                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">
                    {member.name || 'Unknown'}
                    {member._id === user?.id && <span className="ml-1 text-[10px] text-primary">(You)</span>}
                  </p>
                  <p className="text-[11px] text-on-surface/40">
                    {member._id === room.host?._id ? 'Host' : 'Member'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'invite' && (
          <div className="flex-1 p-4 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-tertiary-container flex items-center justify-center">
              <KeyRound size={32} className="text-on-tertiary-container" />
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface mb-1">Share Room Code</p>
              <p className="text-xs text-on-surface/40">Send this code to others so they can join</p>
            </div>
            <div className="w-full bg-surface rounded-xl p-4 border border-outline-variant/20">
              <p className="text-3xl font-mono font-bold text-on-surface tracking-[0.3em] text-center">{code}</p>
            </div>
            <button
              onClick={onCopyCode}
              className="w-full py-3 rounded-xl bg-primary-container text-on-primary-container text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-sm transition-shadow"
            >
              {codeCopied ? <Check size={16} /> : <Copy size={16} />}
              {codeCopied ? 'Copied to Clipboard!' : 'Copy Code'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
