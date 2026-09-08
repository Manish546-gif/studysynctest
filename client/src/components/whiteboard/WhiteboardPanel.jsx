import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  X, FileText, MessageCircle, Users, UserPlus, Send, Copy, Check, KeyRound, Crown,
} from 'lucide-react'
import { getAssetUrl } from '../../services/api'
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

const MEMBER_COLORS = [
  'bg-[#1a3a0a] text-[#53fc18]',
  'bg-[#0a1a3a] text-[#3d8bff]',
  'bg-[#2a1a00] text-amber-400',
  'bg-[#2a001a] text-pink-400',
  'bg-[#003a1a] text-teal-400',
  'bg-[#1a001a] text-purple-400',
]

export default function WhiteboardPanel({
  _isOpen,
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
  onChatKeyDown,
  typingUsers,
  chatScrollRef,
  user,
  members,
  room,
  code,
  codeCopied,
  onCopyCode,
}) {
  const [width, setWidth] = useState(360)
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
    { id: 'files',   label: 'Files',    icon: FileText },
    { id: 'chat',    label: 'Chat',     icon: MessageCircle },
    { id: 'members', label: 'Members',  icon: Users },
    { id: 'invite',  label: 'Invite',   icon: UserPlus },
  ]

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="bg-[#16191e] border-l border-[#2a2d33] flex flex-col overflow-hidden shrink-0 h-full relative"
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 left-0 bottom-0 w-1 cursor-col-resize hover:bg-[#53fc18]/30 active:bg-[#53fc18]/50 transition-colors z-20"
        onPointerDown={startResize}
        onPointerMove={onResize}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
      />

      {/* Tab Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2d33] shrink-0 bg-[#0e0f13]">
        <div className="flex items-center gap-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  active
                    ? 'bg-[#53fc18] text-[#0e0f13]'
                    : 'text-[#9b9e9e] hover:bg-[#1e2228] hover:text-[#e8eaed]'
                }`}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            )
          })}
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#9b9e9e] hover:bg-[#1e2228] hover:text-[#e8eaed] transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* FILES TAB */}
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

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#0e0f13] border border-[#2a2d33] flex items-center justify-center mb-3">
                    <MessageCircle size={22} className="text-[#53fc18]" />
                  </div>
                  <p className="text-xs font-semibold text-[#e8eaed]">No messages yet</p>
                  <p className="text-[11px] text-[#9b9e9e] mt-1">Start the conversation</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const initials = (msg.name || '?')
                    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                  const isOwn = msg.userId === user?.id
                  return (
                    <div key={msg._id || `${msg.createdAt}-${msg.userId}`} className="flex items-start gap-2">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold ${
                        isOwn ? 'bg-[#1a3a0a] text-[#53fc18]' : 'bg-[#0a1a3a] text-[#3d8bff]'
                      }`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-[11px] font-bold text-[#e8eaed]">{msg.name}{isOwn ? ' (You)' : ''}</span>
                          <span className="text-[10px] text-[#9b9e9e]/50">{formatMessageTime(msg.createdAt)}</span>
                        </div>
                        <p className="text-xs text-[#9b9e9e] leading-relaxed break-words">{msg.text}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {typingUsers?.length > 0 && (
              <div className="px-3 pb-1">
                <p className="text-[10px] text-[#9b9e9e] italic">
                  {typingUsers.length === 1 ? `${typingUsers[0].name} is typing...` : `${typingUsers.map(u => u.name).join(', ')} are typing...`}
                </p>
              </div>
            )}

            <form onSubmit={onSendChat} className="p-2.5 border-t border-[#2a2d33] shrink-0">
              <div className="flex items-center gap-2 bg-[#0e0f13] border border-[#2a2d33] rounded-xl px-3 py-2 focus-within:border-[#53fc18] transition-colors">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={onChatKeyDown}
                  placeholder="Message..."
                  className="flex-1 bg-transparent text-xs text-[#e8eaed] placeholder:text-[#9b9e9e]/40 outline-none"
                />
                <button type="submit" className="text-[#53fc18] p-1 rounded-lg hover:bg-[#1a3a0a] transition-colors">
                  <Send size={13} />
                </button>
              </div>
            </form>
          </>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9b9e9e]/50 px-2 pb-1">
              In this room ({members.length})
            </p>
            {members.map((member, i) => {
              const isHost = member._id === room?.host?._id
              const isSelf = member._id === user?.id
              return (
                <div key={member._id || i} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#1e2228] transition-colors">
                  <div className={`w-8 h-8 rounded-xl ${MEMBER_COLORS[i % MEMBER_COLORS.length]} flex items-center justify-center text-[11px] font-bold overflow-hidden shrink-0`}>
                    {member.avatar ? (
                      <img src={getAssetUrl(member.avatar)} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                    ) : (
                      <span>{(member.username || member.name || '?').charAt(0)?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#e8eaed] truncate">
                      @{member.username || member.name || 'Unknown'}
                      {isSelf && <span className="ml-1 text-[9px] text-[#53fc18]">(You)</span>}
                    </p>
                    <p className="text-[10px] text-[#9b9e9e]/50 flex items-center gap-1">
                      {isHost && <Crown size={9} className="text-yellow-400" />}
                      {isHost ? 'Host' : 'Member'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* INVITE TAB */}
        {activeTab === 'invite' && (
          <div className="flex-1 p-4 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0e0f13] border border-[#2a2d33] flex items-center justify-center">
              <KeyRound size={28} className="text-[#53fc18]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#e8eaed] mb-1">Room Invite Code</p>
              <p className="text-xs text-[#9b9e9e]">Share this code to invite others</p>
            </div>
            <div className="w-full bg-[#0e0f13] border border-[#2a2d33] rounded-xl p-4">
              <p className="text-2xl font-mono font-black text-[#53fc18] tracking-[0.3em] text-center">
                {code || '------'}
              </p>
            </div>
            <button
              onClick={onCopyCode}
              className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                codeCopied
                  ? 'bg-[#1a3a0a] border border-[#53fc18] text-[#53fc18]'
                  : 'bg-[#53fc18] text-black hover:bg-[#48de13]'
              }`}
            >
              {codeCopied ? <Check size={15} /> : <Copy size={15} />}
              {codeCopied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
