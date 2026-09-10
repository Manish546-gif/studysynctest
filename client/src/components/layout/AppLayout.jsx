import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { Volume2, Mic, MicOff, PhoneOff } from 'lucide-react'
import { useActiveCall } from '../../contexts/ActiveCallContext'
import TopNavbar from './TopNavbar'
import Sidebar from './Sidebar'

// Sidebar collapse context — shared between TopNavbar toggle and Sidebar
export const SidebarContext = createContext({ collapsed: false, setCollapsed: () => {} })
export const useSidebar = () => useContext(SidebarContext)

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const { activeCall, toggleMic, disconnectActiveCall, returnToCall } = useActiveCall()
  const isWorkspace = pathname.startsWith('/workspace')

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const sidebarW = collapsed ? 60 : 240

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen flex flex-col" style={{ background: '#0e0f13' }}>
        {/* Fixed 56px top navbar */}
        <TopNavbar
          onToggleSidebar={() => setMobileOpen((p) => !p)}
          sidebarOpen={mobileOpen}
        />

        <div className="flex flex-1" style={{ paddingTop: 56 }}>
          {/* Sidebar */}
          <Sidebar
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            collapsed={collapsed}
            onCollapseToggle={() => setCollapsed((p) => !p)}
          />

          {/* Main content shifts with sidebar width */}
          <main
            id="main-content"
            className="flex-1 min-h-[calc(100vh-56px)] transition-all duration-300"
            style={{
              marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 ? sidebarW : 0,
            }}
          >
            <Outlet />
          </main>
        </div>

        {/* Floating Mobile Voice Bar (visible when sidebar drawer is closed on mobile) */}
        {activeCall && !isWorkspace && (
          <div
            className="fixed bottom-4 left-4 right-4 z-50 lg:hidden flex items-center justify-between p-2.5 bg-[#13161c] border border-[#53fc18]/40 rounded-xl shadow-2xl backdrop-blur-md"
          >
            <div
              onClick={returnToCall}
              className="flex items-center gap-2 cursor-pointer min-w-0 flex-1 pr-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#53fc18] animate-pulse shadow-[0_0_8px_#53fc18] flex-shrink-0" />
              <Volume2 size={15} className="text-[#53fc18] flex-shrink-0" />
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{activeCall.roomName}</p>
                <p className="text-[10px] text-[#53fc18] font-medium">Voice Connected • Tap to open</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={toggleMic}
                className={`p-2 rounded-lg border text-xs font-semibold ${
                  activeCall.micOn ? 'bg-[#53fc18]/20 border-[#53fc18]/40 text-[#53fc18]' : 'bg-red-500/20 border-red-500/40 text-red-400'
                }`}
                title={activeCall.micOn ? 'Mute' : 'Unmute'}
              >
                {activeCall.micOn ? <Mic size={14} /> : <MicOff size={14} />}
              </button>
              <button
                onClick={disconnectActiveCall}
                className="p-2 rounded-lg bg-red-600/30 border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                title="Disconnect call"
              >
                <PhoneOff size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </SidebarContext.Provider>
  )
}
