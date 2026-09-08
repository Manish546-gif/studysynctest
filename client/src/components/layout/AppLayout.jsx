import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import TopNavbar from './TopNavbar'
import Sidebar from './Sidebar'

// Sidebar collapse context — shared between TopNavbar toggle and Sidebar
export const SidebarContext = createContext({ collapsed: false, setCollapsed: () => {} })
export const useSidebar = () => useContext(SidebarContext)

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
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
      </div>
    </SidebarContext.Provider>
  )
}
