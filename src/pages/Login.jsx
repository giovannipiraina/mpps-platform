import { useState } from 'react'
import { signIn } from '../lib/supabase'
import { C, s } from '../lib/styles'
import { Alert, Spinner } from '../components/UI'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    try {
      await signIn(email, password)
    } catch (e) {
      setError('Incorrect email or password. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif", padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: '16px', padding: '16px 28px', marginBottom: '16px' }}>
            <div style={{ color: '#fff', fontWeight: '900', fontSize: '28px', letterSpacing: '-0.5px' }}>MPPS</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: '14px' }}>Testing Platform</div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Sign in to your teacher account</p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          {error && <Alert type="error" message={error} />}

          <div style={{ marginBottom: '16px' }}>
            <label style={s.label}>Email address</label>
            <input
              style={s.input}
              type="email"
              placeholder="you@mpps.vic.edu.au"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button
            style={{ ...s.btn, width: '100%', justifyContent: 'center', fontSize: '16px', padding: '14px', opacity: loading ? 0.7 : 1 }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? <><Spinner /> Signing in…</> : 'Sign In →'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '20px' }}>
          Contact your admin to get an account
        </p>
      </div>
    </div>
  )
}
