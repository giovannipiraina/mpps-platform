import { C, s, YEAR_COLORS } from '../lib/styles'

export function Spinner({ size = 18 }) {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ display: 'inline-block', width: size, height: size, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.accent}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
    </>
  )
}

export function YearBadge({ year }) {
  const col = YEAR_COLORS[year] || { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' }
  return <span style={s.badge(col)}>{year === 'Prep' ? 'Prep' : `Year ${year}`}</span>
}

export function ClassBadge({ name, yearLevel }) {
  const col = YEAR_COLORS[yearLevel] || { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' }
  return <span style={{ ...s.badge(col), fontWeight: '900' }}>{name}</span>
}

export function ScoreCircle({ pct, size = 56 }) {
  const color = pct >= 70 ? C.green : pct >= 50 ? C.yellow : C.red
  const bg = pct >= 70 ? C.greenLight : pct >= 50 ? C.yellowLight : C.redLight
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, border: `2.5px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ fontSize: size * 0.27, fontWeight: '900', color, lineHeight: 1 }}>{pct}%</div>
    </div>
  )
}

export function QAvgBar({ avgs }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {avgs.map((avg, i) => (
        <div key={i} style={{ textAlign: 'center', minWidth: '42px' }}>
          <div style={{ fontSize: '10px', color: C.muted, marginBottom: '3px' }}>Q{i + 1}</div>
          <div style={{ background: avg >= 80 ? C.greenLight : avg >= 50 ? C.yellowLight : C.redLight, color: avg >= 80 ? C.green : avg >= 50 ? C.yellow : C.red, borderRadius: '6px', padding: '5px 3px', fontSize: '12px', fontWeight: '800' }}>{avg}%</div>
        </div>
      ))}
    </div>
  )
}

export function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ ...s.card, textAlign: 'center', marginBottom: 0, padding: '16px', borderTop: `3px solid ${color || C.accent}` }}>
      <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '22px', fontWeight: '900', color: color || C.accent }}>{value}</div>
      <div style={{ fontSize: '11px', color: C.muted, fontWeight: '700' }}>{label}</div>
    </div>
  )
}

export function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: C.muted }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px', color: C.text }}>{title}</div>
      {sub && <div style={{ fontSize: '14px' }}>{sub}</div>}
    </div>
  )
}

export function Alert({ type = 'error', message }) {
  const styles = {
    error: { bg: C.redLight, color: C.red, border: C.red },
    success: { bg: C.greenLight, color: C.green, border: C.green },
    info: { bg: C.blueLight, color: C.blue, border: C.blue },
  }
  const st = styles[type]
  return (
    <div style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' }}>
      {message}
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ ...s.card, maxWidth: '560px', width: '100%', margin: 0, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ ...s.h2, marginBottom: 0 }}>{title}</h2>
          <button style={{ ...s.btnGhost, padding: '6px 12px' }} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function TopBar({ profile, onSignOut }) {
  return (
    <div style={{ background: C.accent, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', boxShadow: '0 2px 8px rgba(200,90,20,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '4px 10px' }}>
          <span style={{ color: '#fff', fontWeight: '900', fontSize: '15px', letterSpacing: '-0.3px' }}>MPPS</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: '13px', marginLeft: '6px' }}>Testing Platform</span>
        </div>
        {profile?.role === 'admin' && (
          <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '20px', letterSpacing: '1px' }}>ADMIN</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: '600' }}>{profile?.name}</span>
        <button onClick={onSignOut} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}

export function SideNav({ active, onChange, isAdmin }) {
  const teacherLinks = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'tests', icon: '📝', label: 'My Tests' },
    { id: 'classes', icon: '🏫', label: 'My Classes' },
    { id: 'results', icon: '📈', label: 'Results' },
  ]
  const adminLinks = [
    { id: 'dashboard', icon: '📊', label: 'Overview' },
    { id: 'tests', icon: '📝', label: 'All Tests' },
    { id: 'classes', icon: '🏫', label: 'All Classes' },
    { id: 'results', icon: '📈', label: 'All Results' },
    { id: 'teachers', icon: '👩‍🏫', label: 'Teachers' },
  ]
  const links = isAdmin ? adminLinks : teacherLinks

  return (
    <div style={{ width: '200px', flexShrink: 0, padding: '20px 12px', borderRight: `1px solid ${C.border}`, minHeight: 'calc(100vh - 56px)', background: '#fff' }}>
      {links.map(l => (
        <button key={l.id} style={{ ...s.btnNav(active === l.id), width: '100%', marginBottom: '4px', justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => onChange(l.id)}>
          <span>{l.icon}</span> {l.label}
        </button>
      ))}
    </div>
  )
}
