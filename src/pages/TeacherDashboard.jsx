import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { signOut, getTests, getClasses, getAllTeachers, getSubmissions, getSubmissionsForTeacher, createTest, deleteTest, createClass, deleteClass, assignTest, unassignTest, getAssignmentsForTest, getAssignmentsForClass, createTeacher, deleteTeacher, extractQuestionsFromPDF, extractQuestionsFromText } from '../lib/supabase'
import { C, s, YEAR_LEVELS, YEAR_COLORS } from '../lib/styles'
import { Spinner, YearBadge, ClassBadge, ScoreCircle, QAvgBar, StatCard, EmptyState, Alert, Modal, TopBar, SideNav } from '../components/UI'

// ── Helpers ───────────────────────────────────────────────────
function computeQAvgs(subs, qCount) {
  if (!subs.length || !qCount) return []
  return Array.from({ length: qCount }, (_, qi) => {
    const vals = subs.map(s => (s.results?.[qi]?.score || 0) * 100)
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  })
}

function exportCSV(subs, label) {
  if (!subs.length) return
  const maxQ = Math.max(...subs.map(s => s.results?.length || 0))
  const headers = ['Name', 'Class', 'Year Level', 'Test', 'Score %', 'Points', 'Time', ...Array.from({ length: maxQ }, (_, i) => `Q${i + 1} %`)]
  const rows = subs.map(s => [
    s.student_name, s.classes?.name || '', s.classes?.year_level || '', s.tests?.title || '',
    s.pct, `${Math.round((s.score || 0) * 10) / 10}/${s.total}`,
    new Date(s.submitted_at).toLocaleString(),
    ...(s.results || []).map(r => Math.round((r.score || 0) * 100))
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `mpps_results_${label}.csv`
  a.click()
}

// ── Dashboard Tab ─────────────────────────────────────────────
function DashboardTab({ submissions, tests, classes, isAdmin }) {
  const totalStudents = new Set(submissions.map(s => `${s.student_name}-${s.class_id}`)).size
  const avg = submissions.length ? Math.round(submissions.reduce((a, b) => a + (b.pct || 0), 0) / submissions.length) : 0

  const byClass = {}
  submissions.forEach(s => {
    const key = s.classes?.name || 'Unknown'
    if (!byClass[key]) byClass[key] = { subs: [], yearLevel: s.classes?.year_level }
    byClass[key].subs.push(s)
  })

  const recentSubs = [...submissions].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 8)

  return (
    <div>
      <h1 style={s.h1}>{isAdmin ? 'School Overview' : 'My Dashboard'}</h1>
      <p style={{ ...s.muted, marginBottom: '24px' }}>Welcome back — here's how things are looking</p>

      <div style={{ ...s.grid3, marginBottom: '20px' }}>
        <StatCard icon="👥" label="Total Submissions" value={submissions.length} color={C.accent} />
        <StatCard icon="📊" label="Average Score" value={avg + '%'} color={avg >= 70 ? C.green : avg >= 50 ? C.yellow : C.red} />
        <StatCard icon="📝" label={isAdmin ? 'Total Tests' : 'My Tests'} value={tests.length} color={C.blue} />
      </div>

      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.sectionHead}>Recent Submissions</div>
          {recentSubs.length === 0 && <EmptyState icon="📭" title="No submissions yet" />}
          {recentSubs.map((s2, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', marginBottom: '10px', borderBottom: `1px solid ${C.border}` }}>
              <ScoreCircle pct={s2.pct || 0} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s2.student_name}</div>
                <div style={{ color: C.muted, fontSize: '12px' }}>{s2.classes?.name} · {s2.tests?.title}</div>
              </div>
              <div style={{ color: C.muted, fontSize: '11px' }}>{new Date(s2.submitted_at).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>

        <div style={s.card}>
          <div style={s.sectionHead}>Classes at a Glance</div>
          {Object.keys(byClass).length === 0 && <EmptyState icon="🏫" title="No class data yet" />}
          {Object.entries(byClass).map(([name, { subs, yearLevel }]) => {
            const avg2 = Math.round(subs.reduce((a, b) => a + (b.pct || 0), 0) / subs.length)
            const col = YEAR_COLORS[yearLevel] || { border: C.muted, text: C.muted }
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <ClassBadge name={name} yearLevel={yearLevel} />
                <div style={{ flex: 1, height: '6px', background: C.border, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${avg2}%`, background: col.border, borderRadius: '3px' }} />
                </div>
                <span style={{ fontWeight: '800', fontSize: '13px', color: col.text, minWidth: '36px', textAlign: 'right' }}>{avg2}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Tests Tab ─────────────────────────────────────────────────
function TestsTab({ tests, classes, teacherId, isAdmin, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTest, setSelectedTest] = useState(null)
  const [assigning, setAssigning] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(false)

  const loadAssignments = async (testId) => {
    const data = await getAssignmentsForTest(testId)
    setAssignments(data || [])
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={s.h1}>{isAdmin ? 'All Tests' : 'My Tests'}</h1>
          <p style={s.muted}>{tests.length} test{tests.length !== 1 ? 's' : ''} available</p>
        </div>
        <button style={s.btn} onClick={() => setShowCreate(true)}>+ Upload New Test</button>
      </div>

      {tests.length === 0 && <EmptyState icon="📝" title="No tests yet" sub="Upload a PDF to create your first test" />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tests.map(test => (
          <div key={test.id} style={{ ...s.card, marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '4px' }}>{test.title}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {test.year_level && <YearBadge year={test.year_level.replace('Year ', '')} />}
                  {test.subject && <span style={{ fontSize: '12px', color: C.muted }}>{test.subject}</span>}
                  {test.curriculum_code && <span style={{ fontSize: '12px', color: C.muted }}>{test.curriculum_code}</span>}
                </div>
                <div style={{ color: C.muted, fontSize: '13px' }}>{test.questions?.length || 0} questions · Created {new Date(test.created_at).toLocaleDateString()}{isAdmin && test.teachers ? ` · ${test.teachers.name}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button style={s.btnSm} onClick={async () => { setAssigning(test); await loadAssignments(test.id) }}>Assign to Class</button>
                <button style={s.btnGhost} onClick={() => setSelectedTest(selectedTest?.id === test.id ? null : test)}>
                  {selectedTest?.id === test.id ? 'Hide' : 'Preview'}
                </button>
                <button style={s.btnDanger} onClick={async () => { if (window.confirm('Delete this test?')) { await deleteTest(test.id); onRefresh() } }}>Delete</button>
              </div>
            </div>
            {selectedTest?.id === test.id && (
              <div style={{ marginTop: '16px', borderTop: `1px solid ${C.border}`, paddingTop: '16px' }}>
                <div style={s.sectionHead}>Questions Preview</div>
                {(test.questions || []).map((q, i) => (
                  <div key={i} style={{ background: '#faf7f2', borderRadius: '8px', padding: '12px 14px', marginBottom: '8px', fontSize: '14px' }}>
                    <span style={{ fontWeight: '800', color: C.accent, marginRight: '8px' }}>Q{i + 1}</span>
                    <span style={{ background: C.border, borderRadius: '4px', padding: '1px 7px', fontSize: '11px', marginRight: '8px', fontWeight: '700' }}>{q.type}</span>
                    {q.question?.split('\n')[0]}
                    <div style={{ color: C.green, fontSize: '12px', marginTop: '4px' }}>✓ {q.answer || q.answers?.join(', ')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreate && <CreateTestModal teacherId={teacherId} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); onRefresh() }} />}
      {assigning && (
        <AssignTestModal
          test={assigning}
          classes={classes}
          assignments={assignments}
          teacherId={teacherId}
          onClose={() => setAssigning(null)}
          onChanged={async () => { await loadAssignments(assigning.id); onRefresh() }}
        />
      )}
    </div>
  )
}

function CreateTestModal({ teacherId, onClose, onCreated }) {
  const [tab, setTab] = useState('pdf')
  const [pasteText, setPasteText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [extracted, setExtracted] = useState(null)
  const [dragging, setDragging] = useState(false)

  const processFile = async (file) => {
    setLoading(true); setError('')
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1]
          const data = await extractQuestionsFromPDF(base64)
          setExtracted(data)
        } catch { setError('Could not parse PDF. Try the paste option.') }
        setLoading(false)
      }
      reader.onerror = () => { setError('Could not read file.'); setLoading(false) }
      reader.readAsDataURL(file)
    } catch { setError('Something went wrong.'); setLoading(false) }
  }

  const processText = async () => {
    if (!pasteText.trim()) return
    setLoading(true); setError('')
    try {
      const data = await extractQuestionsFromText(pasteText)
      setExtracted(data)
    } catch { setError('Could not extract questions.') }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!extracted) return
    setLoading(true)
    try {
      await createTest(extracted.title, extracted.subject, extracted.year_level, extracted.curriculum_code, extracted.questions, teacherId)
      onCreated()
    } catch (e) { setError('Could not save test: ' + e.message) }
    setLoading(false)
  }

  return (
    <Modal title="Upload New Test" onClose={onClose}>
      {error && <Alert type="error" message={error} />}
      {!extracted ? (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {['pdf', 'paste'].map(t => (
              <button key={t} style={{ ...s.btnOutline, borderColor: tab === t ? C.accent : C.border, color: tab === t ? C.accent : C.muted, background: tab === t ? C.accentLight : 'transparent' }} onClick={() => setTab(t)}>
                {t === 'pdf' ? '📎 Upload PDF' : '📋 Paste Text'}
              </button>
            ))}
          </div>
          {tab === 'pdf' ? (
            <div
              style={{ border: `2px dashed ${dragging ? C.accent : C.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center', cursor: 'pointer', background: dragging ? C.accentLight : 'transparent', marginBottom: '16px' }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
              onClick={() => document.getElementById('pdfInput').click()}
            >
              {loading ? <><Spinner size={28} /><div style={{ marginTop: '12px', color: C.muted }}>Reading PDF…</div></> : (
                <>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>📄</div>
                  <div style={{ fontWeight: '700', marginBottom: '6px' }}>Drop PDF here or click to browse</div>
                  <div style={{ color: C.muted, fontSize: '13px' }}>AI will extract all questions automatically</div>
                </>
              )}
              <input id="pdfInput" type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) processFile(f) }} />
            </div>
          ) : (
            <>
              <textarea style={{ ...s.textarea, minHeight: '160px', marginBottom: '16px' }} placeholder="Paste your test questions here…" value={pasteText} onChange={e => setPasteText(e.target.value)} />
              <button style={s.btn} onClick={processText} disabled={loading}>
                {loading ? <><Spinner /> Extracting…</> : '✨ Extract Questions'}
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <Alert type="success" message={`✓ Extracted ${extracted.questions?.length} questions from "${extracted.title}"`} />
          <div style={{ background: '#faf7f2', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontWeight: '800', marginBottom: '4px' }}>{extracted.title}</div>
            <div style={{ color: C.muted, fontSize: '13px' }}>{extracted.subject} · {extracted.year_level} · {extracted.curriculum_code}</div>
          </div>
          <div style={{ marginBottom: '20px', maxHeight: '240px', overflowY: 'auto' }}>
            {(extracted.questions || []).map((q, i) => (
              <div key={i} style={{ fontSize: '13px', padding: '8px 10px', background: i % 2 === 0 ? '#faf7f2' : '#fff', borderRadius: '6px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '800', color: C.accent, marginRight: '8px' }}>Q{i + 1}</span>
                {q.question?.split('\n')[0]?.substring(0, 80)}…
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={s.btn} onClick={handleSave} disabled={loading}>
              {loading ? <><Spinner /> Saving…</> : '💾 Save Test'}
            </button>
            <button style={s.btnGhost} onClick={() => setExtracted(null)}>Re-upload</button>
          </div>
        </>
      )}
    </Modal>
  )
}

function AssignTestModal({ test, classes, assignments, teacherId, onClose, onChanged }) {
  const assignedClassIds = new Set(assignments.map(a => a.class_id))
  const [loading, setLoading] = useState(null)

  const toggle = async (cls) => {
    setLoading(cls.id)
    try {
      if (assignedClassIds.has(cls.id)) {
        await unassignTest(test.id, cls.id)
      } else {
        await assignTest(test.id, cls.id, teacherId)
      }
      await onChanged()
    } catch {}
    setLoading(null)
  }

  return (
    <Modal title={`Assign "${test.title}"`} onClose={onClose}>
      <p style={{ ...s.muted, marginBottom: '16px' }}>Select which classes can take this test</p>
      {classes.map(cls => {
        const assigned = assignedClassIds.has(cls.id)
        return (
          <div key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', border: `1.5px solid ${assigned ? C.accent : C.border}`, background: assigned ? C.accentLight : '#fff', marginBottom: '8px', cursor: 'pointer' }} onClick={() => toggle(cls)}>
            <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${assigned ? C.accent : C.border}`, background: assigned ? C.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {assigned && <span style={{ color: '#fff', fontSize: '12px', fontWeight: '900' }}>✓</span>}
            </div>
            <ClassBadge name={cls.name} yearLevel={cls.year_level} />
            <span style={{ fontWeight: '600', fontSize: '14px' }}>{cls.name}</span>
            <span style={{ color: C.muted, fontSize: '13px' }}>{cls.year_level === 'Prep' ? 'Prep' : `Year ${cls.year_level}`}</span>
            {loading === cls.id && <Spinner size={14} />}
          </div>
        )
      })}
    </Modal>
  )
}

// ── Classes Tab ───────────────────────────────────────────────
function ClassesTab({ classes, teachers, teacherId, isAdmin, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newYear, setNewYear] = useState('3')
  const [newTeacher, setNewTeacher] = useState(teacherId)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true); setError('')
    try {
      await createClass(newName.trim(), newYear, newTeacher || teacherId)
      setShowCreate(false); setNewName(''); onRefresh()
    } catch (e) { setError(e.message) }
    setCreating(false)
  }

  const grouped = {}
  classes.forEach(c => {
    if (!grouped[c.year_level]) grouped[c.year_level] = []
    grouped[c.year_level].push(c)
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={s.h1}>{isAdmin ? 'All Classes' : 'My Classes'}</h1>
          <p style={s.muted}>{classes.length} class{classes.length !== 1 ? 'es' : ''}</p>
        </div>
        <button style={s.btn} onClick={() => setShowCreate(true)}>+ Add Class</button>
      </div>

      {showCreate && (
        <div style={{ ...s.card, borderColor: C.accent }}>
          <h3 style={s.h3}>New Class</h3>
          {error && <Alert type="error" message={error} />}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <label style={s.label}>Class Name</label>
              <input style={s.input} placeholder="e.g. 3A, Prep B" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Year Level</label>
              <select style={s.select} value={newYear} onChange={e => setNewYear(e.target.value)}>
                {YEAR_LEVELS.map(y => <option key={y} value={y}>{y === 'Prep' ? 'Prep' : `Year ${y}`}</option>)}
              </select>
            </div>
            {isAdmin && (
              <div style={{ flex: 1, minWidth: '160px' }}>
                <label style={s.label}>Teacher</label>
                <select style={s.select} value={newTeacher} onChange={e => setNewTeacher(e.target.value)}>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={s.btn} onClick={handleCreate} disabled={creating}>
              {creating ? <><Spinner /> Creating…</> : 'Create Class'}
            </button>
            <button style={s.btnGhost} onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {classes.length === 0 && <EmptyState icon="🏫" title="No classes yet" sub="Add your first class above" />}

      {YEAR_LEVELS.filter(y => grouped[y]?.length).map(year => (
        <div key={year} style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <YearBadge year={year} />
            <span style={{ color: C.muted, fontSize: '13px' }}>{grouped[year].length} class{grouped[year].length !== 1 ? 'es' : ''}</span>
          </div>
          <div style={s.grid2}>
            {grouped[year].map(cls => {
              const col = YEAR_COLORS[cls.year_level] || { border: C.muted, text: C.muted, bg: '#f9f9f9' }
              return (
                <div key={cls.id} style={{ ...s.card, marginBottom: 0, borderTop: `3px solid ${col.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: '900', fontSize: '20px', color: col.text }}>{cls.name}</div>
                    <button style={s.btnDanger} onClick={async () => { if (window.confirm(`Delete class ${cls.name}?`)) { await deleteClass(cls.id); onRefresh() } }}>Delete</button>
                  </div>
                  {isAdmin && cls.teachers && <div style={{ color: C.muted, fontSize: '13px', marginTop: '4px' }}>👩‍🏫 {cls.teachers.name}</div>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Results Tab ───────────────────────────────────────────────
function ResultsTab({ submissions, isAdmin }) {
  const [filterTest, setFilterTest] = useState('all')
  const [filterClass, setFilterClass] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const testNames = [...new Set(submissions.map(s => s.tests?.title).filter(Boolean))]
  const classNames = [...new Set(submissions.map(s => s.classes?.name).filter(Boolean))]

  const filtered = submissions.filter(s =>
    (filterTest === 'all' || s.tests?.title === filterTest) &&
    (filterClass === 'all' || s.classes?.name === filterClass)
  )

  const avg = filtered.length ? Math.round(filtered.reduce((a, b) => a + (b.pct || 0), 0) / filtered.length) : 0
  const qCount = filtered[0]?.results?.length || 0
  const qAvgs = computeQAvgs(filtered, qCount)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={s.h1}>Results</h1>
          <p style={s.muted}>{filtered.length} submission{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {filtered.length > 0 && <button style={s.btnGhost} onClick={() => exportCSV(filtered, 'export')}>⬇ Export CSV</button>}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={s.label}>Filter by Test</label>
          <select style={s.select} value={filterTest} onChange={e => setFilterTest(e.target.value)}>
            <option value="all">All Tests</option>
            {testNames.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '140px' }}>
          <label style={s.label}>Filter by Class</label>
          <select style={s.select} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="all">All Classes</option>
            {classNames.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {filtered.length > 0 && (
        <>
          <div style={{ ...s.grid3, marginBottom: '16px' }}>
            <StatCard icon="👥" label="Students" value={filtered.length} color={C.accent} />
            <StatCard icon="📊" label="Average" value={avg + '%'} color={avg >= 70 ? C.green : avg >= 50 ? C.yellow : C.red} />
            <StatCard icon="🏆" label="Top Score" value={Math.max(...filtered.map(s => s.pct || 0)) + '%'} color={C.green} />
          </div>
          {qAvgs.length > 0 && (
            <div style={{ ...s.card, marginBottom: '20px' }}>
              <div style={s.sectionHead}>Question Averages</div>
              <QAvgBar avgs={qAvgs} />
            </div>
          )}
        </>
      )}

      <div style={s.card}>
        {filtered.length === 0 && <EmptyState icon="📭" title="No results yet" sub="Results will appear here as students complete tests" />}
        {[...filtered].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).map((sub, i) => {
          const isOpen = expanded === i
          return (
            <div key={i} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : i)}>
                <ScoreCircle pct={sub.pct || 0} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', marginBottom: '2px' }}>{sub.student_name}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {sub.classes && <ClassBadge name={sub.classes.name} yearLevel={sub.classes.year_level} />}
                    <span style={{ color: C.muted, fontSize: '12px' }}>{sub.tests?.title} · {new Date(sub.submitted_at).toLocaleString()}</span>
                  </div>
                </div>
                <span style={{ color: C.muted }}>{isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen && sub.results && (
                <div style={{ marginTop: '12px', paddingLeft: '56px' }}>
                  {sub.results.map((r, qi) => (
                    <div key={qi} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '13px' }}>
                      <span style={{ color: C.muted, minWidth: '28px' }}>Q{qi + 1}</span>
                      <div style={{ flex: 1, height: '6px', background: C.border, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(r.score || 0) * 100}%`, background: r.score >= 0.8 ? C.green : r.score > 0 ? C.yellow : C.red, borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontWeight: '700', minWidth: '36px', textAlign: 'right', color: r.score >= 0.8 ? C.green : r.score > 0 ? C.yellow : C.red }}>{Math.round((r.score || 0) * 100)}%</span>
                    </div>
                  ))}
                  {sub.results.filter(r => r.type === 'short' && r.given).map((r, si) => (
                    <div key={si} style={{ marginTop: '8px', background: '#faf7f2', borderRadius: '8px', padding: '10px 12px', fontSize: '13px' }}>
                      <div style={{ fontWeight: '700', color: C.muted, marginBottom: '4px' }}>{r.question?.split('\n')[0]}</div>
                      <div>{r.given}</div>
                      {!r.correct && <div style={{ color: C.accentDark, marginTop: '6px', fontSize: '12px' }}>💡 {r.feedback}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Teachers Tab (admin only) ─────────────────────────────────
function TeachersTab({ teachers, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', yearLevels: [] })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const toggleYear = (y) => {
    setForm(f => ({ ...f, yearLevels: f.yearLevels.includes(y) ? f.yearLevels.filter(x => x !== y) : [...f.yearLevels, y] }))
  }

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) { setError('All fields required'); return }
    setCreating(true); setError('')
    try {
      await createTeacher(form.email, form.password, form.name, form.yearLevels)
      setShowCreate(false); setForm({ name: '', email: '', password: '', yearLevels: [] }); onRefresh()
    } catch (e) { setError(e.message) }
    setCreating(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={s.h1}>Teachers</h1>
          <p style={s.muted}>{teachers.length} teacher account{teachers.length !== 1 ? 's' : ''}</p>
        </div>
        <button style={s.btn} onClick={() => setShowCreate(true)}>+ Add Teacher</button>
      </div>

      {showCreate && (
        <div style={{ ...s.card, borderColor: C.accent }}>
          <h3 style={s.h3}>New Teacher Account</h3>
          {error && <Alert type="error" message={error} />}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <label style={s.label}>Full Name</label>
              <input style={s.input} placeholder="Ms Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" placeholder="jane@mpps.vic.edu.au" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={s.label}>Initial Password</label>
              <input style={s.input} type="password" placeholder="Temporary password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={s.label}>Year Levels (optional)</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {YEAR_LEVELS.map(y => (
                <div key={y} style={s.chip(form.yearLevels.includes(y))} onClick={() => toggleYear(y)}>
                  {y === 'Prep' ? 'Prep' : `Yr ${y}`}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={s.btn} onClick={handleCreate} disabled={creating}>
              {creating ? <><Spinner /> Creating…</> : 'Create Account'}
            </button>
            <button style={s.btnGhost} onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {teachers.map(t => (
          <div key={t.id} style={{ ...s.card, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: t.role === 'admin' ? C.accentLight : C.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
              {t.role === 'admin' ? '👑' : '👩‍🏫'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', marginBottom: '2px' }}>{t.name} {t.role === 'admin' && <span style={{ fontSize: '11px', background: C.accentLight, color: C.accentDark, borderRadius: '4px', padding: '1px 7px', fontWeight: '800' }}>ADMIN</span>}</div>
              <div style={{ color: C.muted, fontSize: '13px' }}>{t.email}</div>
              {t.year_levels?.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {t.year_levels.map(y => <YearBadge key={y} year={y} />)}
                </div>
              )}
            </div>
            {t.role !== 'admin' && (
              <button style={s.btnDanger} onClick={async () => { if (window.confirm(`Remove ${t.name}?`)) { await deleteTeacher(t.id); onRefresh() } }}>Remove</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Teacher Dashboard ─────────────────────────────────────
export default function TeacherDashboard() {
  const { user, profile, isAdmin } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [tests, setTests] = useState([])
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  const loadAll = async () => {
    if (!user || !profile) return
    setLoading(true)
    try {
      const [t, cl, subs] = await Promise.all([
        isAdmin ? getTests() : getTests(user.id),
        isAdmin ? getClasses() : getClasses(user.id),
        isAdmin ? getSubmissions() : getSubmissionsForTeacher(user.id),
      ])
      setTests(t || [])
      setClasses(cl || [])
      setSubmissions(subs || [])
      if (isAdmin) {
        const tea = await getAllTeachers()
        setTeachers(tea || [])
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [user, profile])

  return (
    <div style={{ ...s.page, display: 'flex', flexDirection: 'column' }}>
      <TopBar profile={profile} onSignOut={signOut} />
      <div style={{ display: 'flex', flex: 1 }}>
        <SideNav active={tab} onChange={setTab} isAdmin={isAdmin} />
        <div style={{ flex: 1, padding: '28px 24px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: C.muted }}>
              <Spinner size={28} /><span style={{ marginLeft: '12px' }}>Loading…</span>
            </div>
          ) : (
            <>
              {tab === 'dashboard' && <DashboardTab submissions={submissions} tests={tests} classes={classes} isAdmin={isAdmin} />}
              {tab === 'tests' && <TestsTab tests={tests} classes={classes} teacherId={user?.id} isAdmin={isAdmin} onRefresh={loadAll} />}
              {tab === 'classes' && <ClassesTab classes={classes} teachers={teachers} teacherId={user?.id} isAdmin={isAdmin} onRefresh={loadAll} />}
              {tab === 'results' && <ResultsTab submissions={submissions} isAdmin={isAdmin} />}
              {tab === 'teachers' && isAdmin && <TeachersTab teachers={teachers} onRefresh={loadAll} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
