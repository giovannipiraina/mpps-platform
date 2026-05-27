import { useState, useEffect } from 'react'
import { getClasses, getAssignmentsForClass, submitTest, gradeShortAnswer } from '../lib/supabase'
import { C, s, YEAR_COLORS } from '../lib/styles'
import { Spinner, ScoreCircle, ClassBadge } from '../components/UI'

// ── Grading ───────────────────────────────────────────────────
async function gradeAll(questions, answers) {
  let totalScore = 0
  const results = []

  for (const q of questions) {
    const studentAns = answers[q.id]
    let score = 0, correct = false, feedback = '', partResults = null, yesnoResult = null, given = null

    if (q.type === 'fill_multi') {
      const parts = studentAns || []
      partResults = q.answers.map((ans, i) => {
        const ok = (parts[i] || '').trim().toLowerCase() === ans.toLowerCase()
        if (ok) score += 1 / q.answers.length
        return { label: `Part ${i + 1}`, expected: ans, given: parts[i] || '(blank)', ok }
      })
      correct = score === 1
      feedback = correct ? 'All correct!' : q.explanation || ''
    } else if (q.type === 'compound') {
      const ans = studentAns || { parts: [], yesno: '' }
      let pts = 0
      partResults = (q.subParts || []).map((sp, i) => {
        const ok = (ans.parts[i] || '').replace(/\s/g, '') === sp.answer.replace(/\s/g, '')
        if (ok) pts++
        return { label: sp.label, expected: sp.answer, given: ans.parts[i] || '(blank)', ok }
      })
      const yesnoOk = ans.yesno === q.yesno?.answer
      if (yesnoOk) pts++
      score = pts / ((q.subParts?.length || 0) + 1)
      correct = score === 1
      yesnoResult = { question: q.yesno?.question, given: ans.yesno || '(not answered)', expected: q.yesno?.answer, ok: yesnoOk }
      feedback = correct ? 'Excellent!' : q.explanation || ''
    } else if (q.type === 'select_many') {
      const sel = studentAns || []
      const correctSet = new Set(q.answers)
      const tp = sel.filter(x => correctSet.has(x)).length
      const fp = sel.filter(x => !correctSet.has(x)).length
      score = Math.max(0, tp - fp) / q.answers.length
      correct = score === 1
      given = sel
      feedback = correct ? 'Perfect!' : `Correct answers: ${q.answers.join(', ')}. ${q.explanation || ''}`
    } else if (q.type === 'mcq' || q.type === 'truefalse') {
      const ans = (studentAns || '').trim()
      correct = ans === q.answer
      score = correct ? 1 : 0
      given = ans
      feedback = correct ? 'Correct!' : `The correct answer is: ${q.answer}. ${q.explanation || ''}`
    } else if (q.type === 'fill') {
      const ans = (studentAns || '').trim().toLowerCase()
      correct = ans === (q.answer || '').toLowerCase()
      score = correct ? 1 : 0
      given = studentAns || ''
      feedback = correct ? 'Correct!' : `Answer: ${q.answer}. ${q.explanation || ''}`
    } else if (q.type === 'short') {
      const text = (studentAns || '').trim()
      given = text
      if (!text) {
        feedback = 'No answer provided. ' + (q.explanation || '')
      } else {
        const graded = await gradeShortAnswer(q.question, text, q.answer, q.answerKeywords)
        score = graded.score
        correct = graded.correct
        feedback = graded.feedback + (!graded.correct ? ' ' + (q.explanation || '') : '')
      }
    }

    totalScore += score
    results.push({ ...q, score, correct, feedback, partResults, yesnoResult, given })
  }

  const total = questions.length
  return { score: totalScore, total, pct: Math.round((totalScore / total) * 100), results }
}

// ── Question Components ───────────────────────────────────────
function FillMultiQ({ q, answers, setAnswers }) {
  return (q.parts || []).map((part, i) => (
    <div key={i} style={{ marginBottom: '12px' }}>
      <label style={s.label}>{part}</label>
      <input style={{ ...s.input, maxWidth: '180px' }} placeholder="Answer"
        value={(answers[q.id] || [])[i] || ''}
        onChange={e => { const arr = [...(answers[q.id] || (q.parts || []).map(() => ''))]; arr[i] = e.target.value; setAnswers(a => ({ ...a, [q.id]: arr })) }} />
    </div>
  ))
}

function CompoundQ({ q, answers, setAnswers }) {
  const ans = answers[q.id] || { parts: (q.subParts || []).map(() => ''), yesno: '' }
  return (
    <div>
      <div style={{ marginBottom: '14px' }}>
        <label style={s.label}>Differences</label>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {(q.subParts || []).map((sp, i) => (
            <div key={i}>
              <div style={{ fontSize: '12px', color: C.muted, marginBottom: '4px' }}>{sp.label}</div>
              <input style={{ ...s.input, maxWidth: '80px', textAlign: 'center' }} placeholder="+/-?"
                value={ans.parts[i] || ''}
                onChange={e => { const parts = [...ans.parts]; parts[i] = e.target.value; setAnswers(a => ({ ...a, [q.id]: { ...ans, parts } })) }} />
            </div>
          ))}
        </div>
      </div>
      {q.yesno && (
        <>
          <label style={s.label}>{q.yesno.question}</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['Yes', 'No'].map(opt => (
              <div key={opt} style={s.chip(ans.yesno === opt)} onClick={() => setAnswers(a => ({ ...a, [q.id]: { ...ans, yesno: opt } }))}>{opt}</div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SelectManyQ({ q, answers, setAnswers }) {
  const sel = answers[q.id] || []
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {(q.options || []).map(opt => (
        <div key={opt} style={s.chip(sel.includes(opt))} onClick={() => {
          const next = sel.includes(opt) ? sel.filter(x => x !== opt) : [...sel, opt]
          setAnswers(a => ({ ...a, [q.id]: next }))
        }}>{opt}</div>
      ))}
    </div>
  )
}

function ChoiceQ({ q, answers, setAnswers }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {(q.options || []).map(opt => (
        <div key={opt} style={{ ...s.chip(answers[q.id] === opt), display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', margin: 0 }}
          onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${answers[q.id] === opt ? C.accent : C.border}`, background: answers[q.id] === opt ? C.accent : 'transparent', flexShrink: 0 }} />
          {opt}
        </div>
      ))}
    </div>
  )
}

// ── Screens ───────────────────────────────────────────────────

function HomeScreen({ onRole }) {
  return (
    <div style={{ ...s.containerNarrow }}>
      <div style={{ textAlign: 'center', margin: '24px 0 32px' }}>
        <div style={{ fontSize: '52px', marginBottom: '12px' }}>📚</div>
        <h1 style={s.h1}>MPPS Testing Platform</h1>
        <p style={{ color: C.muted, fontSize: '15px' }}>Melbourne Primary School</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ ...s.card, cursor: 'pointer', borderColor: C.accent, borderWidth: '2px' }} onClick={() => onRole('student')}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎒</div>
          <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '4px' }}>I'm a Student</div>
          <div style={{ color: C.muted, fontSize: '14px' }}>Take a test assigned by your teacher</div>
        </div>
        <div style={{ ...s.card, cursor: 'pointer' }} onClick={() => onRole('teacher')}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👩‍🏫</div>
          <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '4px' }}>I'm a Teacher</div>
          <div style={{ color: C.muted, fontSize: '14px' }}>Sign in to manage tests and view results</div>
        </div>
      </div>
    </div>
  )
}

function SelectClassScreen({ classes, onSelect }) {
  const [search, setSearch] = useState('')
  const filtered = classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.year_level.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={s.containerNarrow}>
      <h1 style={s.h1}>What's your class?</h1>
      <p style={{ color: C.muted, marginBottom: '20px', fontSize: '14px' }}>Pick your class to see your assigned tests</p>
      <input style={{ ...s.input, marginBottom: '16px' }} placeholder="Search classes…" value={search} onChange={e => setSearch(e.target.value)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(cls => {
          const col = YEAR_COLORS[cls.year_level] || { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' }
          return (
            <div key={cls.id} style={{ ...s.card, cursor: 'pointer', marginBottom: 0, borderLeft: `4px solid ${col.border}`, display: 'flex', alignItems: 'center', gap: '14px' }} onClick={() => onSelect(cls)}>
              <div style={{ background: col.bg, color: col.text, borderRadius: '10px', padding: '10px 14px', fontWeight: '900', fontSize: '18px' }}>{cls.name}</div>
              <div>
                <div style={{ fontWeight: '700' }}>{cls.name}</div>
                <div style={{ color: C.muted, fontSize: '13px' }}>{cls.year_level === 'Prep' ? 'Prep' : `Year ${cls.year_level}`}{cls.teachers?.name ? ` · ${cls.teachers.name}` : ''}</div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '24px' }}>No classes found</div>}
      </div>
    </div>
  )
}

function SelectTestScreen({ selectedClass, tests, onSelect, onBack }) {
  return (
    <div style={s.containerNarrow}>
      <button style={{ ...s.btnGhost, marginBottom: '20px' }} onClick={onBack}>← Back</button>
      <h1 style={s.h1}>Available Tests</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <ClassBadge name={selectedClass.name} yearLevel={selectedClass.year_level} />
        <span style={{ color: C.muted, fontSize: '14px' }}>Select a test to begin</span>
      </div>
      {tests.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
          <div style={{ fontWeight: '700', marginBottom: '6px' }}>No tests assigned yet</div>
          <div style={{ color: C.muted, fontSize: '14px' }}>Your teacher hasn't assigned any tests to your class yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tests.map(({ tests: test }) => (
            <div key={test.id} style={{ ...s.card, cursor: 'pointer', marginBottom: 0 }} onClick={() => onSelect(test)}>
              <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '4px' }}>{test.title}</div>
              <div style={{ color: C.muted, fontSize: '13px' }}>
                {test.subject && `${test.subject} · `}
                {test.questions?.length || 0} questions
                {test.curriculum_code && ` · ${test.curriculum_code}`}
              </div>
              <div style={{ marginTop: '12px', color: C.accent, fontWeight: '700', fontSize: '13px' }}>Start test →</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EnterNameScreen({ selectedClass, selectedTest, onStart, onBack }) {
  const [name, setName] = useState('')
  return (
    <div style={s.containerNarrow}>
      <button style={{ ...s.btnGhost, marginBottom: '20px' }} onClick={onBack}>← Back</button>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '44px', marginBottom: '10px' }}>📝</div>
        <h1 style={s.h1}>{selectedTest.title}</h1>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginTop: '8px' }}>
          <ClassBadge name={selectedClass.name} yearLevel={selectedClass.year_level} />
          <span style={{ color: C.muted, fontSize: '13px' }}>{selectedTest.questions?.length || 0} questions · AI-marked instantly</span>
        </div>
      </div>
      <div style={s.card}>
        <div style={{ background: C.accentLight, borderRadius: '8px', padding: '12px 14px', marginBottom: '18px', fontSize: '14px', color: C.accentDark }}>
          📚 {selectedTest.subject ? `Subject: ${selectedTest.subject}` : 'Read each question carefully and do your best!'}
        </div>
        <label style={s.label}>Your Full Name</label>
        <input style={{ ...s.input, marginBottom: '20px' }} placeholder="Type your name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && onStart(name.trim())} />
        <button style={{ ...s.btn, width: '100%', justifyContent: 'center', fontSize: '16px', padding: '14px', opacity: name.trim() ? 1 : 0.4 }} disabled={!name.trim()} onClick={() => onStart(name.trim())}>
          Start Test →
        </button>
      </div>
    </div>
  )
}

function TakingTestScreen({ test, studentName, selectedClass, onSubmit }) {
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const questions = test.questions || []
  const answered = Object.keys(answers).length
  const pct = Math.round((answered / questions.length) * 100)
  const col = YEAR_COLORS[selectedClass.year_level] || { border: C.accent }

  const handleSubmit = async () => {
    setSubmitting(true)
    const graded = await gradeAll(questions, answers)
    await submitTest(test.id, selectedClass.id, studentName, graded.score, graded.total, graded.pct, graded.results)
    onSubmit(graded)
    setSubmitting(false)
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <h1 style={{ ...s.h1, fontSize: '18px', marginBottom: 0 }}>{test.title}</h1>
          <ClassBadge name={selectedClass.name} yearLevel={selectedClass.year_level} />
        </div>
        <p style={{ color: C.muted, fontSize: '13px', marginBottom: '10px' }}>{studentName} · {answered}/{questions.length} answered</p>
        <div style={s.progressBar}>
          <div style={{ height: '100%', width: `${pct}%`, background: col.border, borderRadius: '3px', transition: 'width 0.3s' }} />
        </div>
      </div>

      {questions.map((q, idx) => (
        <div key={q.id} style={s.card}>
          <span style={{ display: 'inline-block', background: C.accent, color: '#fff', borderRadius: '6px', padding: '2px 9px', fontSize: '12px', fontWeight: '800', marginBottom: '10px' }}>Q{idx + 1}</span>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{q.question}</div>
          {q.type === 'fill_multi' && <FillMultiQ q={q} answers={answers} setAnswers={setAnswers} />}
          {q.type === 'compound' && <CompoundQ q={q} answers={answers} setAnswers={setAnswers} />}
          {q.type === 'select_many' && <SelectManyQ q={q} answers={answers} setAnswers={setAnswers} />}
          {(q.type === 'mcq' || q.type === 'truefalse') && <ChoiceQ q={q} answers={answers} setAnswers={setAnswers} />}
          {q.type === 'fill' && <input style={{ ...s.input, maxWidth: '240px' }} placeholder="Your answer" value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} />}
          {q.type === 'short' && <textarea style={s.textarea} placeholder="Write your answer here…" value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} />}
        </div>
      ))}

      <button style={{ ...s.btn, width: '100%', justifyContent: 'center', padding: '16px', fontSize: '16px', opacity: submitting ? 0.6 : 1 }} onClick={handleSubmit} disabled={submitting}>
        {submitting ? <><Spinner /> Marking your test…</> : 'Submit Test ✓'}
      </button>
    </div>
  )
}

function ResultsScreen({ graded, studentName, selectedClass, onDone }) {
  const grade = graded.pct >= 90 ? 'A' : graded.pct >= 80 ? 'B' : graded.pct >= 70 ? 'C' : graded.pct >= 60 ? 'D' : 'Keep going!'
  const msg = graded.pct >= 80 ? 'Fantastic work! 🌟' : graded.pct >= 60 ? 'Good effort! Keep going 💪' : "Don't give up — you'll get it! 📚"
  return (
    <div style={s.containerNarrow}>
      <div style={{ ...s.card, textAlign: 'center', borderColor: graded.pct >= 70 ? C.green : graded.pct >= 50 ? C.yellow : C.red, borderWidth: '2px' }}>
        <ScoreCircle pct={graded.pct} size={80} />
        <div style={{ fontSize: '20px', fontWeight: '800', margin: '14px 0 4px' }}>{msg}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: C.muted, fontSize: '14px' }}>{studentName}</span>
          <ClassBadge name={selectedClass.name} yearLevel={selectedClass.year_level} />
          <span style={{ color: C.muted, fontSize: '14px' }}>· {Math.round(graded.score * 10) / 10}/{graded.total} pts · Grade {grade}</span>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.sectionHead}>Question Breakdown</div>
        {graded.results.map((q, i) => {
          const sp = q.score * 100
          return (
            <div key={i} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontWeight: '800', color: C.accent, fontSize: '12px', minWidth: '22px' }}>Q{i + 1}</span>
                <span style={s.pill(sp >= 80)}>{sp >= 100 ? '✓ Correct' : sp > 0 ? `~ Partial (${Math.round(sp)}%)` : '✗ Incorrect'}</span>
              </div>
              {!q.correct && <div style={{ marginLeft: '32px', background: C.accentLight, borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: C.accentDark }}>💡 {q.feedback}</div>}
            </div>
          )
        })}
      </div>
      <button style={{ ...s.btnOutline, width: '100%', padding: '13px', textAlign: 'center' }} onClick={onDone}>← Back to Home</button>
    </div>
  )
}

// ── Main Student Portal ───────────────────────────────────────
export default function StudentPortal() {
  const [screen, setScreen] = useState('home')
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [assignedTests, setAssignedTests] = useState([])
  const [selectedTest, setSelectedTest] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [graded, setGraded] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadClasses = async () => {
    setLoading(true)
    try {
      const data = await getClasses()
      setClasses(data)
    } catch {}
    setLoading(false)
  }

  const handleRoleSelect = async (role) => {
    if (role === 'student') {
      await loadClasses()
      setScreen('select-class')
    } else {
      window.location.href = '/teacher'
    }
  }

  const handleClassSelect = async (cls) => {
    setSelectedClass(cls)
    setLoading(true)
    try {
      const data = await getAssignmentsForClass(cls.id)
      setAssignedTests(data || [])
    } catch {}
    setLoading(false)
    setScreen('select-test')
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Nunito', sans-serif", color: C.text }}>
      <div style={{ background: C.accent, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ color: '#fff', fontWeight: '900', fontSize: '16px' }}>MPPS </span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Testing Platform</span>
        </div>
        {screen !== 'home' && screen !== 'results' && (
          <button style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer' }} onClick={() => setScreen('home')}>
            🏠 Home
          </button>
        )}
      </div>

      {loading && screen !== 'taking-test' && (
        <div style={{ textAlign: 'center', padding: '60px', color: C.muted }}>
          <Spinner size={28} />
          <div style={{ marginTop: '12px' }}>Loading…</div>
        </div>
      )}

      {!loading && screen === 'home' && <HomeScreen onRole={handleRoleSelect} />}
      {!loading && screen === 'select-class' && <SelectClassScreen classes={classes} onSelect={handleClassSelect} />}
      {!loading && screen === 'select-test' && <SelectTestScreen selectedClass={selectedClass} tests={assignedTests} onSelect={t => { setSelectedTest(t); setScreen('enter-name') }} onBack={() => setScreen('select-class')} />}
      {screen === 'enter-name' && <EnterNameScreen selectedClass={selectedClass} selectedTest={selectedTest} onStart={name => { setStudentName(name); setScreen('taking-test') }} onBack={() => setScreen('select-test')} />}
      {screen === 'taking-test' && <TakingTestScreen test={selectedTest} studentName={studentName} selectedClass={selectedClass} onSubmit={g => { setGraded(g); setScreen('results') }} />}
      {screen === 'results' && graded && <ResultsScreen graded={graded} studentName={studentName} selectedClass={selectedClass} onDone={() => setScreen('home')} />}
    </div>
  )
}
