import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import TopNavbar from './TopNavbar'
import Sidebar from './Sidebar'
import Footer from './Footer'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const isWorkspace = pathname.startsWith('/workspace')

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopNavbar
        onToggleSidebar={() => setSidebarOpen((p) => !p)}
        sidebarOpen={sidebarOpen}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 lg:ml-64 pt-16">
        <div className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </div>
        {!isWorkspace && <Footer />}
      </main>
    </div>
  )
}
