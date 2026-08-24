import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import AppLayout from './components/layout/AppLayout'
import SyncBanner from './components/common/SyncBanner'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Workspace from './pages/Workspace'
import History from './pages/History'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Calendar from './pages/Calendar'
import MyWhiteboards from './pages/MyWhiteboards'
import WhiteboardEditor from './pages/WhiteboardEditor'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-8 h-8 border-2 border-primary-container border-t-primary rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-xl focus:shadow-lg focus:outline-none">
        Skip to content
      </a>
      <SyncBanner />
      <Routes>
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route element={<ProtectedRoute><NotificationProvider><AppLayout /></NotificationProvider></ProtectedRoute>}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/whiteboards" element={<MyWhiteboards />} />
          <Route path="/whiteboards/:id" element={<WhiteboardEditor />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/calendar" element={<Calendar />} />
        </Route>
        <Route
          path="/workspace/:roomId"
          element={
            <ProtectedRoute>
              <NotificationProvider>
                <Workspace />
              </NotificationProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

export default App
