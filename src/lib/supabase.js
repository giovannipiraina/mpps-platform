import { createClient } from '@supabase/supabase-js'

const ANTHROPIC_KEY = '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'
const AI_HEADERS = { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }

export const supabase = createClient(
  'https://nirsecbemmdilxxqcobt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcnNlY2JlbW1kaWx4eHFjb2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjU2OTYsImV4cCI6MjA5NTQwMTY5Nn0.uyDaqYRD0PlEzYxA_aEUv-8wqtLhRsegz5Cn-LPUvNc'
)

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getTeacherProfile(userId) {
  const { data, error } = await supabase.from('teachers').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function createTeacher(email, password, name, yearLevels) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: window.location.origin }
  })
  if (authError) throw authError
  const { error: profileError } = await supabase.from('teachers').insert({
    id: authData.user.id, email, name, role: 'teacher', year_levels: yearLevels
  })
  if (profileError) throw profileError
  return authData
}

export async function getAllTeachers() {
  const { data, error } = await supabase.from('teachers').select('*').order('name')
  if (error) throw error
  return data
}

export async function deleteTeacher(id) {
  const { error } = await supabase.from('teachers').delete().eq('id', id)
  if (error) throw error
}

export async function getClasses(teacherId = null) {
  let q = supabase.from('classes').select('*, teachers(name)').order('year_level').order('name')
  if (teacherId) q = q.eq('teacher_id', teacherId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function createClass(name, yearLevel, teacherId) {
  const { data, error } = await supabase.from('classes').insert({ name, year_level: yearLevel, teacher_id: teacherId }).select().single()
  if (error) throw error
  return data
}

export async function deleteClass(id) {
  const { error } = await supabase.from('classes').delete().eq('id', id)
  if (error) throw error
}

export async function getTests(teacherId = null) {
  let q = supabase.from('tests').select('*, teachers(name)').order('created_at', { ascending: false })
  if (teacherId) q = q.eq('created_by', teacherId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getTest(id) {
  const { data, error } = await supabase.from('tests').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createTest(title, subject, yearLevel, curriculumCode, questions, teacherId) {
  const { data, error } = await supabase.from('tests').insert({ title, subject, year_level: yearLevel, curriculum_code: curriculumCode, questions, created_by: teacherId }).select().single()
  if (error) throw error
  return data
}

export async function deleteTest(id) {
  const { error } = await supabase.from('tests').delete().eq('id', id)
  if (error) throw error
}

export async function assignTest(testId, classId, teacherId) {
  const { data, error } = await supabase.from('test_assignments').upsert({ test_id: testId, class_id: classId, assigned_by: teacherId, active: true }).select().single()
  if (error) throw error
  return data
}

export async function unassignTest(testId, classId) {
  const { error } = await supabase.from('test_assignments').delete().eq('test_id', testId).eq('class_id', classId)
  if (error) throw error
}

export async function getAssignmentsForClass(classId) {
  const { data, error } = await supabase.from('test_assignments').select('*, tests(*)').eq('class_id', classId).eq('active', true)
  if (error) throw error
  return data
}

export async function getAssignmentsForTest(testId) {
  const { data, error } = await supabase.from('test_assignments').select('*, classes(name, year_level)').eq('test_id', testId)
  if (error) throw error
  return data
}

export async function submitTest(testId, classId, studentName, score, total, pct, results) {
  const { data, error } = await supabase.from('submissions').insert({ test_id: testId, class_id: classId, student_name: studentName, score, total, pct, results }).select().single()
  if (error) throw error
  return data
}

export async function getSubmissions(filters = {}) {
  let q = supabase.from('submissions').select('*, tests(title), classes(name, year_level)').order('submitted_at', { ascending: false })
  if (filters.testId) q = q.eq('test_id', filters.testId)
  if (filters.classId) q = q.eq('class_id', filters.classId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getSubmissionsForTeacher(teacherId) {
  const { data: classes } = await supabase.from('classes').select('id').eq('teacher_id', teacherId)
  if (!classes?.length) return []
  const classIds = classes.map(c => c.id)
  const { data, error } = await supabase.from('submissions').select('*, tests(title), classes(name, year_level)').in('class_id', classIds).order('submitted_at', { ascending: false })
  if (error) throw error
  return data
}

export async function extractQuestionsFromPDF(base64Data) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: AI_HEADERS,
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', max_tokens: 4000,
      messages: [{ role: 'user', content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } },
        { type: 'text', text: 'Extract ALL questions. Return ONLY valid JSON: {"title":"","subject":"","year_level":"","curriculum_code":"","questions":[{"id":1,"type":"mcq","question":"","options":[],"answer":"","explanation":""}]}. Types: mcq,short,truefalse,fill,fill_multi. Infer answers if missing.' }
      ]}]
    })
  })
  const data = await res.json()
  const raw = data.content.map(b => b.text || '').join('')
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function extractQuestionsFromText(text) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: AI_HEADERS,
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', max_tokens: 4000,
      messages: [{ role: 'user', content: `Extract ALL questions. Return ONLY JSON: {"title":"","subject":"","year_level":"","curriculum_code":"","questions":[{"id":1,"type":"mcq","question":"","options":[],"answer":"","explanation":""}]}. Types: mcq,short,truefalse,fill,fill_multi.\n\n${text}` }]
    })
  })
  const data = await res.json()
  const raw = data.content.map(b => b.text || '').join('')
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function gradeShortAnswer(question, studentAns, expectedAnswer, keywords) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: AI_HEADERS,
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 300,
        messages: [{ role: 'user', content: `Mark this answer. Return ONLY JSON.\nQuestion: ${question}\nExpected: ${expectedAnswer}\nKeywords: ${(keywords||[]).join(', ')}\nStudent: "${studentAns}"\nReturn: {"correct":true/false,"score":0-1,"feedback":"1-2 encouraging sentences"}` }]
      })
    })
    const data = await res.json()
    const raw = data.content.map(b => b.text || '').join('')
    return JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    const hit = (keywords||[]).some(k => studentAns.toLowerCase().includes(k.toLowerCase()))
    return { correct: hit, score: hit ? 0.7 : 0, feedback: hit ? 'Good thinking!' : 'Have another look.' }
  }
}