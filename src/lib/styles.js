export const C = {
  bg: '#f7f4ef',
  card: '#ffffff',
  border: '#e5ddd0',
  accent: '#c85a14',
  accentHover: '#a84810',
  accentLight: '#fdf0e8',
  accentDark: '#8c3a0c',
  text: '#1a1208',
  muted: '#7a6a58',
  green: '#1a7a3e',
  greenLight: '#eaf5ef',
  red: '#c0392b',
  redLight: '#fdecea',
  yellow: '#d97706',
  yellowLight: '#fef3c7',
  blue: '#1a4d8f',
  blueLight: '#e8f0fa',
  navy: '#1a2744',
}

export const YEAR_LEVELS = ['Prep', '1', '2', '3', '4', '5', '6']

export const YEAR_COLORS = {
  'Prep': { bg: '#fce7f3', border: '#db2777', text: '#9d174d' },
  '1':    { bg: '#ede9fe', border: '#7c3aed', text: '#5b21b6' },
  '2':    { bg: '#dbeafe', border: '#2563eb', text: '#1e40af' },
  '3':    { bg: '#dcfce7', border: '#16a34a', text: '#15803d' },
  '4':    { bg: '#fef9c3', border: '#ca8a04', text: '#854d0e' },
  '5':    { bg: '#ffedd5', border: '#ea580c', text: '#9a3412' },
  '6':    { bg: '#f1f5f9', border: '#475569', text: '#1e293b' },
}

export const s = {
  // Layout
  page: { minHeight: '100vh', background: C.bg, fontFamily: "'Nunito', 'Segoe UI', sans-serif", color: C.text },
  container: { maxWidth: '900px', margin: '0 auto', padding: '32px 20px' },
  containerNarrow: { maxWidth: '600px', margin: '0 auto', padding: '32px 20px' },

  // Cards
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  cardHover: { cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' },

  // Typography
  h1: { fontSize: '26px', fontWeight: '900', marginBottom: '6px', color: C.text, fontFamily: "'Nunito', sans-serif" },
  h2: { fontSize: '20px', fontWeight: '800', marginBottom: '6px', color: C.text },
  h3: { fontSize: '16px', fontWeight: '800', marginBottom: '4px', color: C.text },
  label: { fontSize: '11px', fontWeight: '800', color: C.muted, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' },
  muted: { color: C.muted, fontSize: '14px' },
  sectionHead: { fontSize: '11px', fontWeight: '800', color: C.muted, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' },

  // Inputs
  input: { background: '#faf7f2', border: `1.5px solid ${C.border}`, borderRadius: '8px', color: C.text, padding: '11px 14px', fontSize: '15px', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' },
  textarea: { background: '#faf7f2', border: `1.5px solid ${C.border}`, borderRadius: '8px', color: C.text, padding: '11px 14px', fontSize: '15px', outline: 'none', width: '100%', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', display: 'block' },
  select: { background: '#faf7f2', border: `1.5px solid ${C.border}`, borderRadius: '8px', color: C.text, padding: '11px 14px', fontSize: '15px', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer' },

  // Buttons
  btn: { background: C.accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' },
  btnSm: { background: C.accent, color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  btnOutline: { background: 'transparent', color: C.accent, border: `2px solid ${C.accent}`, borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  btnGhost: { background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnDanger: { background: 'transparent', color: C.red, border: `1px solid ${C.red}`, borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnNav: (active) => ({ background: active ? C.accentLight : 'transparent', color: active ? C.accent : C.muted, border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '14px', fontWeight: active ? '800' : '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }),

  // Misc
  chip: (sel) => ({ padding: '10px 18px', borderRadius: '8px', border: `2px solid ${sel ? C.accent : C.border}`, background: sel ? C.accentLight : C.card, cursor: 'pointer', fontSize: '15px', fontWeight: sel ? '700' : '400', color: sel ? C.accent : C.text, display: 'inline-block', margin: '4px', transition: 'all 0.12s' }),
  pill: (ok) => ({ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', fontWeight: '700', background: ok ? C.greenLight : C.redLight, color: ok ? C.green : C.red }),
  badge: (color) => ({ fontSize: '11px', fontWeight: '800', background: color?.bg || C.blueLight, color: color?.text || C.blue, border: `1.5px solid ${color?.border || C.blue}`, borderRadius: '6px', padding: '2px 9px', display: 'inline-block' }),
  progressBar: { height: '6px', background: C.border, borderRadius: '3px', overflow: 'hidden' },
  divider: { borderTop: `1px solid ${C.border}`, margin: '20px 0' },
  row: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' },
}
