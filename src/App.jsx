import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import LoginPage from './pages/Login'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentPortal from './pages/StudentPortal'
import { Spinner } from './components/UI'
import { C } from './lib/styles'

function AppInner() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ textAlign: 'center', color: C.muted }}>
          <Spinner size={32} />
          <div style={{ marginTop: '16px', fontSize: '15px' }}>Loading MPPS Testing Platform…</div>
        </div>
      </div>
    )
  }

  const isTeacherRoute = window.location.pathname.startsWith('/teacher')

  if (isTeacherRoute) {
    if (!user) return <LoginPage />
    if (!profile) return <LoginPage />
    return <TeacherDashboard />
  }

  return <StudentPortal />
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}