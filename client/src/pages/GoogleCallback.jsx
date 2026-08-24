import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function GoogleCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { googleExchange } = useAuth()
  const [error, setError] = useState('')
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    const errParam = params.get('error')
    const code = params.get('code')
    const state = params.get('state')
    const savedState = sessionStorage.getItem('google_oauth_state')
    sessionStorage.removeItem('google_oauth_state')

    if (errParam) {
      setError(errParam === 'access_denied' ? 'Sign-in was cancelled' : `Google error: ${errParam}`)
      return
    }
    if (!code) {
      setError('Missing authorization code')
      return
    }
    if (savedState && state !== savedState) {
      setError('Invalid sign-in state. Please try again.')
      return
    }

    const redirectUri = `${window.location.origin}/google-callback`
    googleExchange(code, redirectUri)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((e) => setError(e.message || 'Google sign-in failed'))
  }, [params, googleExchange, navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      {error ? (
        <>
          <AlertCircle size={36} className="text-error" />
          <p className="text-on-surface/70 text-sm">{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="px-5 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold"
          >
            Back to login
          </button>
        </>
      ) : (
        <>
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-on-surface/50">Signing you in with Google…</p>
        </>
      )}
    </div>
  )
}
