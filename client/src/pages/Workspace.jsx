import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  MessageCircle,
  Pencil,
  PhoneOff,
  Users,
  UserPlus,
  Copy,
  Check,
  KeyRound,
  ArrowLeft,
  Trash2,
  Loader2,
  Send,
  X,
  Timer,
  FileText,
  PenTool,
  Maximize,
  Settings,
  Link2,
} from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../hooks/useSocket'
import { useWebRTC } from '../hooks/useWebRTC'
import Whiteboard from '../components/whiteboard/Whiteboard'
import WhiteboardPanel from '../components/whiteboard/WhiteboardPanel'
import PomodoroTimer from '../components/common/PomodoroTimer'
import ScreenRecorder from '../components/common/ScreenRecorder'
import FilePreview from '../components/common/FilePreview'
import ConfirmationModal from '../components/common/ConfirmationModal'
import FloatingReactions from '../components/FloatingReactions'
import ReactionPicker from '../components/ReactionPicker'
import InviteLinkModal from '../components/InviteLinkModal'
import BreakoutPanel from '../components/BreakoutPanel'
import useRoomReactions from '../hooks/useRoomReactions'

const ROOM_TAGS = ['Study', 'Project', 'Review', 'Homework', 'Exam Prep', 'Discussion']

function VideoTile({ stream, name, isLocal, muted, mirror, presenting, onClick, active, contain }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl min-w-[16rem] min-h-[9rem] max-h-[18rem] overflow-hidden bg-surface-container-high aspect-video transition-all ${
        active
          ? 'border-2 border-primary ring-2 ring-primary/30'
          : 'border border-outline-variant/20'
      } ${onClick ? 'cursor-pointer hover:border-primary/50' : ''}`}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`w-full h-full ${contain ? 'object-contain' : 'object-cover'} ${mirror ? '-scale-x-100' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center">
            <span className="text-lg font-bold text-on-primary-container">{name?.charAt(0)?.toUpperCase()}</span>
          </div>
        </div>
      )}
      {presenting && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-primary text-on-primary rounded-lg px-2 py-1">
          <Monitor size={11} />
          <span className="text-[10px] font-bold">Presenting</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
        <span className="text-[11px] font-medium text-white truncate max-w-[100px]">{name}{isLocal ? ' (You)' : ''}</span>
      </div>
    </div>
  )
}

function formatMessageTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (isToday) return time
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + time
}

export default function Workspace() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [whiteboardOpen, setWhiteboardOpen] = useState(false)
  const [whiteboardFullScreen, setWhiteboardFullScreen] = useState(false)
  const [whiteboardWidth, setWhiteboardWidth] = useState(48)
  const [wbPanelTab, setWbPanelTab] = useState(null)
  const whiteboardResizing = useRef(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsName, setSettingsName] = useState('')
  const [settingsTag, setSettingsTag] = useState('Study')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingRoom, setDeletingRoom] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [pomodoroOpen, setPomodoroOpen] = useState(false)
  const [recorderOpen, setRecorderOpen] = useState(false)
  const [filePreviewOpen, setFilePreviewOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [inviteLinkOpen, setInviteLinkOpen] = useState(false)
  const [breakoutOpen, setBreakoutOpen] = useState(false)
  const [breakoutRooms, setBreakoutRooms] = useState([])
  const [viewerCount, setViewerCount] = useState(0)
  const [_sharedPomodoro, setSharedPomodoro] = useState(null)
  const pomodoroSessionsRef = useRef(0)
  const sessionStartRef = useRef(Date.now())
  const chatScrollRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const isTypingRef = useRef(false)
  const halfScreenCanvasRef = useRef(null)
  const fullScreenCanvasRef = useRef(null)

  const {
    socket: socketRef,
    connected,
    roomUsers,
    remoteCursors,
    remoteActions,
    setRemoteActions,
    livePaths,
    emitDraw,
    emitCursor,
    emitClear,
    emitUndo,
    emitLivePath,
    emitLivePathEnd,
    messages,
    emitMessage,
    roomFiles,
    setRoomFiles,
    typingUsers,
    emitTypingStart,
    emitTypingStop,
    emitFileUploaded,
    emitFileDeleted,
    screenSharers,
  } = useSocket(roomId)

  const {
    localStream,
    remoteStreams,
    micOn,
    camOn,
    screenSharing,
    screenStream,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    stopMedia,
  } = useWebRTC(socketRef, roomId, user?.id)

  const { floatingReactions, raisedHands: _raisedHands, sendReaction, toggleHand } = useRoomReactions(socketRef)


  const [pinnedId, setPinnedId] = useState(null) // 'local' | socketId | null
  const stageRef = useRef(null)
  const stageVideoRef = useRef(null)

  // --- Breakout rooms listener ---
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    socket.on('breakout-update', (data) => setBreakoutRooms(data.breakoutRooms || []))
    socket.on('viewer-count', (data) => setViewerCount(data.count || 0))
    socket.on('pomodoro-sync', (data) => setSharedPomodoro(data))
    return () => {
      socket.off('breakout-update')
      socket.off('viewer-count')
      socket.off('pomodoro-sync')
    }
  }, [socketRef])

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e) => {
      // Ignore if typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'm' || e.key === 'M') { e.preventDefault(); toggleMic() }
        if (e.key === 'd' || e.key === 'D') { e.preventDefault(); toggleCam() }
        if (e.shiftKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); toggleScreenShare() }
        if (e.shiftKey && (e.key === 'r' || e.key === 'R')) { e.preventDefault(); setRecorderOpen((v) => !v) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleMic, toggleCam, toggleScreenShare])

  // --- Record study session on unmount ---
  useEffect(() => {
    return () => {
      const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000)
      if (duration > 30) {
        api.recordStudySession({ room: roomId, type: 'room', duration, pomodoroSessions: pomodoroSessionsRef.current }).catch(() => {})
      }
    }
  }, [roomId])

  // --- Room data fetch (moved after socket setup so we can copy invite link) ---
  useEffect(() => {
    if (!roomId) return
    setLoading(true)
    api.getRoom(roomId)
      .then((data) => {
        setRoom(data.room)
        if (data.room.files) setRoomFiles(data.room.files)
        setBreakoutRooms(data.room.breakoutRooms || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [roomId, setRoomFiles])

  const handleDraw = useCallback((action) => {
    emitDraw(action)
    setRemoteActions((prev) => [...prev, action])
  }, [emitDraw, setRemoteActions])

  const copyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  const handleDeleteRoom = async () => {
    setDeletingRoom(true)
    try {
      await api.deleteRoom(roomId)
      stopMedia()
      navigate('/dashboard')
    } catch (err) {
      alert(err.message)
      setDeletingRoom(false)
    }
  }

  const openSettings = () => {
    if (!room) return
    setSettingsName(room.name || '')
    setSettingsTag(room.tag || 'Study')
    setSettingsError('')
    setSettingsSaved(false)
    setChatOpen(false)
    setMembersOpen(false)
    setInviteOpen(false)
    setSettingsOpen(true)
  }

  const handleSaveSettings = async () => {
    if (!settingsName.trim()) return
    setSavingSettings(true)
    setSettingsError('')
    try {
      const data = await api.updateRoom(roomId, { name: settingsName.trim(), tag: settingsTag })
      setRoom(data.room)
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2000)
    } catch (err) {
      setSettingsError(err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSendChat = (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    clearTimeout(typingTimeoutRef.current)
    if (isTypingRef.current) {
      isTypingRef.current = false
      emitTypingStop()
    }
    emitMessage(chatInput.trim())
    setChatInput('')
  }

  const handleChatKeyDown = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true
      emitTypingStart()
    }
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
      emitTypingStop()
    }, 2000)
  }, [emitTypingStart, emitTypingStop])

  useEffect(() => () => clearTimeout(typingTimeoutRef.current), [])

  const formatTypingIndicator = () => {
    if (typingUsers.length === 0) return null
    const names = typingUsers.map((u) => u.name).filter(Boolean)
    if (names.length === 0) return null
    return names.length === 1
      ? `${names[0]} is typing...`
      : `${names.join(', ')} are typing...`
  }

  const typingLabel = formatTypingIndicator()

  const toggleWbPanel = (tab) => {
    setWbPanelTab((cur) => (cur === tab ? null : tab))
  }

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages, chatOpen])

  const memberColors = [    'bg-tertiary', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
    'bg-orange-500', 'bg-pink-500', 'bg-teal-500', 'bg-red-500',
  ]

  const allMembers = room?.members || []
  const displayMembers = roomUsers.length > 0 ? roomUsers : allMembers
  const remoteUserIds = Object.keys(remoteStreams)

  // Stage resolution: pinned tile wins, otherwise auto-follow the active
  // presenter (local share takes priority). Remotes count as presenters only
  // once their stream has actually arrived.
  const presenterIds = useMemo(() => {
    const ids = [];
    if (screenSharing && (screenStream || localStream)) ids.push('local');
    Object.keys(screenSharers).forEach((sid) => {
      if (remoteStreams[sid] && !ids.includes(sid)) ids.push(sid);
    });
    return ids;
  }, [screenSharing, screenStream, localStream, screenSharers, remoteStreams]);

  const pinnedValid =
    pinnedId === 'local'
      ? !!(localStream || screenSharing)
      : !!(pinnedId && remoteStreams[pinnedId]);
  const stageTarget = pinnedValid ? pinnedId : presenterIds.length > 0 ? presenterIds[0] : null;
  const stageIsLocal = stageTarget === 'local';
  const stageStream = stageIsLocal
    ? (screenSharing && screenStream ? screenStream : localStream)
    : (stageTarget ? remoteStreams[stageTarget] : null);
  const stageActive = !!stageStream;
  const stageName = stageIsLocal
    ? `${user?.name || 'You'} (You)`
    : screenSharers[stageTarget] || displayMembers.find((m) => roomUsers.some((u) => u._id === m._id) && remoteUserIds.includes(stageTarget))?.name || 'Participant';

  // Drop stale pins (stream died / media stopped) and leave fullscreen.
  useEffect(() => {
    if (pinnedId === 'local' && !localStream && !screenSharing) setPinnedId(null);
    else if (pinnedId && pinnedId !== 'local' && !remoteStreams[pinnedId]) setPinnedId(null);
  }, [pinnedId, remoteStreams, localStream, screenSharing]);

  useEffect(() => {
    if (!stageActive && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [stageActive]);

  const toggleStageFullscreen = () => {
    const el = stageRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface">
        <p className="text-on-surface/50 mb-4">{error || 'Room not found'}</p>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-xl text-sm font-semibold">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
    )
  }

  const isHost = room.host?._id === user?.id

  return (
    <div className="flex flex-col h-screen bg-surface">
      <FloatingReactions reactions={floatingReactions} />
      {inviteLinkOpen && (
        <InviteLinkModal roomId={roomId} roomCode={room?.code} onClose={() => setInviteLinkOpen(false)} />
      )}

      {/* Top Header */}
      <div className="flex items-center gap-3 px-4 lg:px-6 py-3 bg-surface border-b border-outline-variant/20 shrink-0">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-on-surface/50 hover:text-on-surface transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="w-px h-5 bg-outline-variant/30" />
        <h1 className="text-sm font-semibold text-on-surface">{room.name}</h1>
        <button
          onClick={openSettings}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container hover:text-on-surface transition-colors"
          title="Room settings"
        >
          <Settings size={14} />
        </button>

        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-tertiary-container text-on-tertiary-container rounded-xl text-xs font-bold hover:shadow-sm transition-shadow"
        >
          <KeyRound size={13} />
          <span className="font-mono tracking-widest">{room.code}</span>
          {codeCopied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
        </button>

        <button
          onClick={() => setInviteLinkOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-on-surface/60 rounded-xl text-xs font-medium transition"
          title="Copy invite link"
        >
          <Link2 size={13} />
          Invite
        </button>

        <AnimatePresence>
          {codeCopied && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-success font-medium"
            >
              Copied!
            </motion.span>
          )}
        </AnimatePresence>

        <div className="ml-auto flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-error animate-pulse'}`} />
          <span className="text-xs text-on-surface/40">{connected ? 'Connected' : 'Connecting...'}</span>
          {room.host?._id === user?.id && (
            <button
              onClick={handleDeleteRoom}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/30 hover:bg-error-container hover:text-error transition-colors ml-2"
              title="Delete room"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
      {/* Whiteboard Fullscreen Overlay */}
      <AnimatePresence>
        {whiteboardOpen && whiteboardFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-surface flex"
          >
            <div className="flex-1 relative min-w-0">
              <Whiteboard
                roomId={roomId}
                connected={connected}
                roomUsers={roomUsers}
                remoteCursors={remoteCursors}
                actions={remoteActions}
                livePaths={livePaths}
                onDraw={handleDraw}
                onCursor={emitCursor}
                onClear={emitClear}
                onUndo={emitUndo}
                onLivePath={emitLivePath}
                onLivePathEnd={emitLivePathEnd}
                fullScreen={true}
                onToggleFullScreen={() => setWhiteboardFullScreen(false)}
                canvasRef={fullScreenCanvasRef}
                pomodoroOpen={pomodoroOpen}
                onTogglePomodoro={() => setPomodoroOpen((v) => !v)}
                recorderOpen={recorderOpen}
                onToggleRecorder={() => setRecorderOpen((v) => !v)}
                recording={recording}
                panelTab={wbPanelTab}
                onTogglePanel={toggleWbPanel}
                fileCount={roomFiles.length}
              />
            </div>
            <AnimatePresence>
              {wbPanelTab && (
                <WhiteboardPanel
                  isOpen={!!wbPanelTab}
                  onClose={() => setWbPanelTab(null)}
                  activeTab={wbPanelTab}
                  onTabChange={setWbPanelTab}
                  roomId={roomId}
                  files={roomFiles}
                  setFiles={setRoomFiles}
                  emitFileUploaded={emitFileUploaded}
                  emitFileDeleted={emitFileDeleted}
                  messages={messages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  onSendChat={handleSendChat}
                  onChatKeyDown={handleChatKeyDown}
                  typingUsers={typingUsers}
                  chatScrollRef={chatScrollRef}
                  user={user}
                  members={displayMembers}
                  room={room}
                  code={room.code}
                  codeCopied={codeCopied}
                  onCopyCode={copyCode}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Whiteboard (half-screen mode) */}
      <AnimatePresence>
        {whiteboardOpen && !whiteboardFullScreen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: `${whiteboardWidth}%`, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="bg-surface relative flex flex-col overflow-hidden shrink-0 border-r border-outline-variant/20"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/20 shrink-0">
              <span className="text-sm font-semibold text-on-surface flex items-center gap-2">
                <PenTool size={15} className="text-primary" />
                Whiteboard
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWhiteboardFullScreen(true)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container hover:text-on-surface transition-colors"
                  title="Full screen"
                >
                  <Maximize size={14} />
                </button>
                <button onClick={() => setWhiteboardOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 relative min-h-0 flex">
              <div className="flex-1 relative min-w-0">
                <Whiteboard
                  roomId={roomId}
                  connected={connected}
                  roomUsers={roomUsers}
                  remoteCursors={remoteCursors}
                  actions={remoteActions}
                  livePaths={livePaths}
                  onDraw={handleDraw}
                  onCursor={emitCursor}
                  onClear={emitClear}
                  onUndo={emitUndo}
                  onLivePath={emitLivePath}
                  onLivePathEnd={emitLivePathEnd}
                  fullScreen={false}
                  onToggleFullScreen={() => setWhiteboardFullScreen(true)}
                  canvasRef={halfScreenCanvasRef}
                  pomodoroOpen={pomodoroOpen}
                  onTogglePomodoro={() => setPomodoroOpen((v) => !v)}
                  recorderOpen={recorderOpen}
                  onToggleRecorder={() => setRecorderOpen((v) => !v)}
                  recording={recording}
                  panelTab={wbPanelTab}
                  onTogglePanel={toggleWbPanel}
                  fileCount={roomFiles.length}
                />
              </div>
              <AnimatePresence>
                {wbPanelTab && (
                  <WhiteboardPanel
                    isOpen={!!wbPanelTab}
                    onClose={() => setWbPanelTab(null)}
                    activeTab={wbPanelTab}
                    onTabChange={setWbPanelTab}
                    roomId={roomId}
                    files={roomFiles}
                    setFiles={setRoomFiles}
                    emitFileUploaded={emitFileUploaded}
                    emitFileDeleted={emitFileDeleted}
                    messages={messages}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    onSendChat={handleSendChat}
                    onChatKeyDown={handleChatKeyDown}
                    typingUsers={typingUsers}
                    chatScrollRef={chatScrollRef}
                    user={user}
                    members={displayMembers}
                    room={room}
                    code={room.code}
                    codeCopied={codeCopied}
                    onCopyCode={copyCode}
                  />
                )}
              </AnimatePresence>
            </div>
            <div
              className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize group hover:bg-primary/30 active:bg-primary/50 transition-colors"
              onPointerDown={(e) => {
                e.preventDefault();
                whiteboardResizing.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!whiteboardResizing.current) return;
                const container = e.currentTarget.parentElement.parentElement.getBoundingClientRect();
                const pct = ((e.clientX - container.left) / container.width) * 100;
                setWhiteboardWidth(Math.min(85, Math.max(25, pct)));
              }}
              onPointerUp={(e) => {
                whiteboardResizing.current = false;
                e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={() => { whiteboardResizing.current = false; }}
            />
          </motion.div>
        )}
      </AnimatePresence>

        {/* Center */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 flex flex-col gap-3 min-h-0 max-w-6xl w-full mx-auto">
            {stageActive ? (
              <>
                {/* Switcher: pick which shared screen to watch */}
                {presenterIds.length > 1 && (
                  <div className="shrink-0 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-on-surface/50">Shared screens:</span>
                    {presenterIds.map((pid) => (
                      <button
                        key={pid}
                        onClick={() => setPinnedId(pid)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          stageTarget === pid
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                        }`}
                      >
                        <Monitor size={11} />
                        {pid === 'local' ? 'You' : screenSharers[pid] || 'Participant'}
                      </button>
                    ))}
                  </div>
                )}
                {/* Stage: spotlighted stream */}
                <div
                  ref={stageRef}
                  onDoubleClick={toggleStageFullscreen}
                  className="relative flex-1 min-h-0 rounded-2xl overflow-hidden bg-black border border-outline-variant/20"
                >
                  <video
                    ref={(node) => {
                      stageVideoRef.current = node
                      if (node && stageStream && node.srcObject !== stageStream) {
                        node.srcObject = stageStream
                      }
                    }}
                    autoPlay
                    playsInline
                    muted={stageIsLocal}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5 pointer-events-none">
                    <Monitor size={12} className="text-white" />
                    <span className="text-xs font-medium text-white">{stageName}</span>
                  </div>
                  <button
                    onClick={toggleStageFullscreen}
                    className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center bg-black/50 text-white hover:bg-black/70 transition-colors"
                    title={document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    <Maximize size={14} />
                  </button>
                  <button
                    onClick={() => setPinnedId(null)}
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-sm text-white text-xs font-semibold hover:bg-black/70 transition-colors"
                    title="Back to gallery"
                  >
                    <X size={13} /> Exit spotlight
                  </button>
                </div>

                {/* Filmstrip of cameras */}
                <div className="shrink-0 flex gap-3 overflow-x-auto pb-1">
                  <div className="w-44 shrink-0">
                    <VideoTile
                      stream={localStream}
                      name={user?.name || 'You'}
                      isLocal={true}
                      muted={true}
                      mirror={!screenSharing}
                      presenting={screenSharing}
                      active={stageTarget === 'local'}
                      onClick={() => setPinnedId(stageTarget === 'local' ? null : 'local')}
                    />
                  </div>
                  {remoteUserIds.map((socketId) => (
                    <div key={socketId} className="w-44 shrink-0">
                      <VideoTile
                        stream={remoteStreams[socketId]}
                        name={
                          displayMembers.find((m) =>
                            roomUsers.some((u) => u._id === m._id)
                          )?.name || 'Participant'
                        }
                        isLocal={false}
                        muted={false}
                        presenting={!!screenSharers[socketId]}
                        active={stageTarget === socketId}
                        onClick={() => setPinnedId(stageTarget === socketId ? null : socketId)}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-wrap gap-3 justify-center content-start max-w-5xl mx-auto">
                  {/* Local video */}
                  <VideoTile
                    stream={localStream}
                    name={user?.name || 'You'}
                    isLocal={true}
                    muted={true}
                    mirror={!screenSharing}
                    presenting={screenSharing}
                    onClick={() => setPinnedId('local')}
                  />

                  {/* Remote videos */}
                  {remoteUserIds.map((socketId) => (
                    <VideoTile
                      key={socketId}
                      stream={remoteStreams[socketId]}
                      name={
                        displayMembers.find((m) =>
                          roomUsers.some((u) => u._id === m._id)
                        )?.name || 'Participant'
                      }
                      isLocal={false}
                      muted={false}
                      presenting={!!screenSharers[socketId]}
                      onClick={() => setPinnedId(socketId)}
                    />
                  ))}

                  {/* Audio-only participants (no video stream) */}
                  {displayMembers
                    .filter((m) => m._id !== user?.id && !remoteUserIds.some((sid) => remoteStreams[sid]))
                    .map((member, i) => (
                      <div key={member._id || i} className="rounded-xl overflow-hidden bg-surface-container-high border border-outline-variant/20 min-w-[16rem] min-h-[9rem] aspect-video flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-14 h-14 rounded-2xl ${memberColors[i % memberColors.length]} flex items-center justify-center`}>
                            <span className="text-lg font-bold text-white">{member.name?.charAt(0)?.toUpperCase()}</span>
                          </div>
                          <span className="text-xs text-on-surface/50">{member.name}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Chat */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-surface-container-low border-l border-outline-variant/20 flex flex-col overflow-hidden shrink-0"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
                <span className="text-sm font-semibold text-on-surface">Chat</span>
                <button onClick={() => setChatOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
                  <X size={16} />
                </button>
              </div>
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
              <form onSubmit={handleSendChat} className="p-3 border-t border-outline-variant/20">
                <div className="flex items-center gap-2 bg-surface-container-lowest rounded-xl px-3 py-2 border border-outline-variant/20">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface/30 outline-none"
                  />
                  <button type="submit" className="text-primary p-1.5 rounded-lg hover:bg-primary-container/30 transition-colors">
                    <Send size={16} />
                  </button>
                </div>
                {typingLabel && (
                  <p className="text-on-surface/40 text-xs italic mt-1.5 px-1">{typingLabel}</p>
                )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Members sidebar */}
        <AnimatePresence>
          {membersOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-surface-container-low border-l border-outline-variant/20 flex flex-col overflow-hidden shrink-0"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
                <span className="text-sm font-semibold text-on-surface">Members ({displayMembers.length})</span>
                <button onClick={() => setMembersOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {displayMembers.map((member, i) => (
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Breakout rooms sidebar */}
        <AnimatePresence>
          {breakoutOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-surface-container-low border-l border-outline-variant/20 flex flex-col overflow-hidden shrink-0"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
                <span className="text-sm font-semibold text-on-surface">Breakout Rooms</span>
                <button onClick={() => setBreakoutOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <BreakoutPanel
                  breakoutRooms={breakoutRooms}
                  socketRef={socketRef}
                  userId={user?.id}
                  isHost={room?.host?._id === user?.id}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invite sidebar */}
        <AnimatePresence>
          {inviteOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-surface-container-low border-l border-outline-variant/20 flex flex-col overflow-hidden shrink-0"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
                <span className="text-sm font-semibold text-on-surface">Invite Members</span>
                <button onClick={() => setInviteOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 p-4 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-tertiary-container flex items-center justify-center">
                  <KeyRound size={32} className="text-on-tertiary-container" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface mb-1">Share Room Code</p>
                  <p className="text-xs text-on-surface/40">Send this code to others so they can join</p>
                </div>
                <div className="w-full bg-surface rounded-xl p-4 border border-outline-variant/20">
                  <p className="text-3xl font-mono font-bold text-on-surface tracking-[0.3em] text-center">{room.code}</p>
                </div>
                <button
                  onClick={copyCode}
                  className="w-full py-3 rounded-xl bg-primary-container text-on-primary-container text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-sm transition-shadow"
                >
                  {codeCopied ? <Check size={16} /> : <Copy size={16} />}
                  {codeCopied ? 'Copied to Clipboard!' : 'Copy Code'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Room settings sidebar */}
        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-surface-container-low border-l border-outline-variant/20 flex flex-col overflow-hidden shrink-0"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
                <span className="text-sm font-semibold text-on-surface">Room Settings</span>
                <button onClick={() => setSettingsOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface/40 hover:bg-surface-container transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <div>
                  <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Room Name</label>
                  <input
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    disabled={!isHost}
                    placeholder="Room name"
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface/30 outline-none focus:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface/50 mb-1.5">Tag</label>
                  <div className={`flex flex-wrap gap-1.5 ${!isHost ? 'pointer-events-none opacity-60' : ''}`}>
                    {ROOM_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        disabled={!isHost}
                        onClick={() => setSettingsTag(tag)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          settingsTag === tag
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-on-surface/60 hover:bg-surface-container hover:text-on-surface'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {!isHost && (
                  <p className="text-xs text-on-surface/40 leading-relaxed">
                    Only the host can edit these settings.
                  </p>
                )}

                {isHost && (
                  <>
                    {settingsError && <p className="text-xs text-error">{settingsError}</p>}
                    <button
                      onClick={handleSaveSettings}
                      disabled={savingSettings || !settingsName.trim()}
                      className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:shadow-md transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {savingSettings ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : settingsSaved ? (
                        <Check size={15} />
                      ) : (
                        <Settings size={15} />
                      )}
                      {savingSettings ? 'Saving...' : settingsSaved ? 'Saved!' : 'Save Changes'}
                    </button>

                    <div className="rounded-xl border border-error/30 bg-error-container/30 p-4">
                      <p className="text-sm font-semibold text-error mb-1">Danger Zone</p>
                      <p className="text-xs text-on-surface/50 leading-relaxed mb-3">
                        Deleting this room removes it for all members. This cannot be undone.
                      </p>
                      <button
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-error text-white text-xs font-semibold hover:shadow-md transition-shadow"
                      >
                        <Trash2 size={13} />
                        Delete Room
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating panels */}
      <AnimatePresence>
        {pomodoroOpen && (
          <PomodoroTimer isOpen={pomodoroOpen} onToggle={() => setPomodoroOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recorderOpen && (
          <ScreenRecorder
            canvasRef={whiteboardFullScreen ? fullScreenCanvasRef : halfScreenCanvasRef}
            isOpen={recorderOpen}
            onToggle={() => setRecorderOpen(false)}
            onRecordingChange={setRecording}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {filePreviewOpen && (
          <FilePreview
            roomId={roomId}
            files={roomFiles}
            setFiles={setRoomFiles}
            emitFileUploaded={emitFileUploaded}
            emitFileDeleted={emitFileDeleted}
            isOpen={filePreviewOpen}
            onToggle={() => setFilePreviewOpen(false)}
          />
        )}
      </AnimatePresence>

      <ConfirmationModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteRoom}
        title="Delete Room"
        message="This room will be permanently deleted for you and all members. This cannot be undone."
        confirmText="Delete Room"
        confirmVariant="danger"
        loading={deletingRoom}
      />

      {/* Bottom Control Bar */}
      <div className="flex items-center justify-center gap-3 px-6 py-4 bg-surface border-t border-outline-variant/20 shrink-0">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            micOn
              ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
              : 'bg-error text-white'
          }`}
          title={micOn ? 'Mute mic' : 'Unmute mic'}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button
          onClick={toggleCam}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            camOn
              ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
              : 'bg-error text-white'
          }`}
          title={camOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            screenSharing
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
          }`}
          title={screenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {screenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
        </button>

        <div className="w-px h-8 bg-outline-variant/30 mx-1" />

        <button
          onClick={() => {
            if (whiteboardOpen) { toggleWbPanel('chat'); return; }
            setChatOpen((v) => !v); setMembersOpen(false); setInviteOpen(false); setSettingsOpen(false);
          }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            whiteboardOpen ? (wbPanelTab === 'chat' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80')
              : (chatOpen ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80')
          }`}
          title="Chat"
        >
          <MessageCircle size={20} />
        </button>

        <button
          onClick={() => {
            if (whiteboardOpen) { toggleWbPanel('members'); return; }
            setMembersOpen((v) => !v); setChatOpen(false); setInviteOpen(false); setSettingsOpen(false);
          }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            whiteboardOpen ? (wbPanelTab === 'members' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80')
              : (membersOpen ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80')
          }`}
          title="Members"
        >
          <Users size={20} />
        </button>

        <button
          onClick={() => {
            if (whiteboardOpen) { toggleWbPanel('invite'); return; }
            setInviteOpen((v) => !v); setChatOpen(false); setMembersOpen(false); setSettingsOpen(false);
          }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            whiteboardOpen ? (wbPanelTab === 'invite' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80')
              : (inviteOpen ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80')
          }`}
          title="Invite"
        >
          <UserPlus size={20} />
        </button>

        <button
          onClick={() => {
            setFilePreviewOpen(false)
            setPomodoroOpen(false)
            setRecorderOpen(false)
            setWhiteboardOpen(true)
          }}
          className="w-12 h-12 rounded-2xl flex items-center justify-center bg-tertiary-container text-on-tertiary-container hover:shadow-md transition-all duration-200"
          title="Open Whiteboard"
        >
          <Pencil size={20} />
        </button>

        <div className="w-px h-8 bg-outline-variant/30 mx-1" />

        <button
          onClick={() => { setPomodoroOpen((v) => !v); setRecorderOpen(false); setFilePreviewOpen(false); }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            pomodoroOpen
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
          }`}
          title="Pomodoro Timer"
        >
          <Timer size={20} />
        </button>

        <button
          onClick={() => { setRecorderOpen((v) => !v); setPomodoroOpen(false); setFilePreviewOpen(false); }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            recorderOpen
              ? 'bg-error text-white'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
          }`}
          title="Screen Recording"
        >
          <Video size={20} />
        </button>

        <button
          onClick={() => {
            if (whiteboardOpen) { toggleWbPanel('files'); return; }
            setFilePreviewOpen((v) => !v); setPomodoroOpen(false); setRecorderOpen(false); setSettingsOpen(false);
          }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            whiteboardOpen ? (wbPanelTab === 'files' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80')
              : (filePreviewOpen ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80')
          }`}
          title="File Preview"
        >
          <FileText size={20} />
        </button>

        <div className="w-px h-8 bg-outline-variant/30 mx-1" />

        <ReactionPicker onReaction={sendReaction} onToggleHand={toggleHand} />

        {viewerCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-600/20 text-green-400 rounded-lg text-xs font-medium" title="Screen share viewers">
            👁 {viewerCount}
          </div>
        )}

        <button
          onClick={() => setBreakoutOpen(!breakoutOpen)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition text-sm ${
            breakoutOpen ? 'bg-primary text-on-primary' : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
          title="Breakout Rooms"
        >
          🔀
        </button>

        <div className="w-px h-8 bg-outline-variant/30 mx-1" />

        <button
          onClick={() => {
            if (confirm('Leave this room?')) {
              stopMedia()
              navigate('/dashboard')
            }
          }}
          className="w-12 h-12 rounded-2xl flex items-center justify-center bg-error text-white hover:bg-error/90 transition-all duration-200"
          title="Leave room"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  )
}
