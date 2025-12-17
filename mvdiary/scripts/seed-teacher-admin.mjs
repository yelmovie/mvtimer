import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

function loadEnvFromDotenvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    const rawKey = trimmed.slice(0, idx).trim()
    const key = rawKey.replace(/^\uFEFF/, '') // handle UTF-8 BOM
    let val = trimmed.slice(idx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!key) continue
    if (process.env[key] == null) process.env[key] = val
  }
}

async function ensureSchool(supabaseAdmin, schoolName) {
  const { data: existing, error: selectErr } = await supabaseAdmin
    .from('schools')
    .select('id,name')
    .eq('name', schoolName)
    .limit(1)
    .maybeSingle()

  if (selectErr) throw selectErr
  if (existing?.id) return existing

  const { data: created, error: insertErr } = await supabaseAdmin
    .from('schools')
    .insert({ name: schoolName })
    .select('id,name')
    .single()

  if (insertErr) throw insertErr
  return created
}

async function ensureClass(supabaseAdmin, { schoolId, className, schoolYear }) {
  const { data: existing, error: selectErr } = await supabaseAdmin
    .from('classes')
    .select('id,name,school_year,school_id')
    .eq('school_id', schoolId)
    .eq('name', className)
    .eq('school_year', schoolYear)
    .limit(1)
    .maybeSingle()

  if (selectErr) throw selectErr
  if (existing?.id) return existing

  const { data: created, error: insertErr } = await supabaseAdmin
    .from('classes')
    .insert({ school_id: schoolId, name: className, school_year: schoolYear })
    .select('id,name,school_year,school_id')
    .single()

  if (insertErr) throw insertErr
  return created
}

async function ensureAuthUser(supabaseAdmin, { email, password }) {
  const { data: found, error: findErr } = await supabaseAdmin.auth.admin.getUserByEmail(email)
  if (findErr) throw findErr
  if (found?.user) return found.user

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr) throw createErr
  if (!created?.user) throw new Error('Failed to create user.')
  return created.user
}

async function upsertProfile(supabaseAdmin, { userId, role, displayName, schoolId }) {
  const { error } = await supabaseAdmin.from('profiles').upsert(
    {
      user_id: userId,
      role,
      display_name: displayName,
      school_id: schoolId,
    },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

async function ensureTeacherClass(supabaseAdmin, { teacherId, classId, role }) {
  const { error } = await supabaseAdmin.from('teacher_classes').upsert(
    {
      teacher_id: teacherId,
      class_id: classId,
      role,
    },
    { onConflict: 'teacher_id,class_id' }
  )
  if (error) throw error
}

async function ensureStudentClass(supabaseAdmin, { studentId, classId }) {
  const { error } = await supabaseAdmin.from('student_classes').upsert(
    {
      student_id: studentId,
      class_id: classId,
    },
    { onConflict: 'student_id,class_id' }
  )
  if (error) throw error
}

async function main() {
  loadEnvFromDotenvLocal()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) {
    console.error(
      [
        'Missing env vars.',
        '- NEXT_PUBLIC_SUPABASE_URL',
        '- SUPABASE_SERVICE_ROLE_KEY (server secret; get it from Supabase Dashboard > Project Settings > API)',
      ].join('\n')
    )
    process.exit(1)
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@mvdiary.local'
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin!2345'
  const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || '관리자'

  const seedSchoolName = process.env.SEED_SCHOOL_NAME || '샘플학교'
  const seedClassName = process.env.SEED_CLASS_NAME || '1-1'
  const seedSchoolYear = Number(process.env.SEED_SCHOOL_YEAR || String(new Date().getFullYear()))

  const createSampleStudent = (process.env.SEED_CREATE_STUDENT || 'true').toLowerCase() === 'true'
  const studentEmail = process.env.STUDENT_EMAIL || 'student1@mvdiary.local'
  const studentPassword = process.env.STUDENT_PASSWORD || 'Student!2345'
  const studentDisplayName = process.env.STUDENT_DISPLAY_NAME || '샘플학생1'

  const supabaseAdmin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const school = await ensureSchool(supabaseAdmin, seedSchoolName)
  const clazz = await ensureClass(supabaseAdmin, {
    schoolId: school.id,
    className: seedClassName,
    schoolYear: seedSchoolYear,
  })

  const adminUser = await ensureAuthUser(supabaseAdmin, {
    email: adminEmail,
    password: adminPassword,
  })

  await upsertProfile(supabaseAdmin, {
    userId: adminUser.id,
    role: 'admin',
    displayName: adminDisplayName,
    schoolId: school.id,
  })

  await ensureTeacherClass(supabaseAdmin, {
    teacherId: adminUser.id,
    classId: clazz.id,
    role: 'admin',
  })

  if (createSampleStudent) {
    const studentUser = await ensureAuthUser(supabaseAdmin, {
      email: studentEmail,
      password: studentPassword,
    })

    await upsertProfile(supabaseAdmin, {
      userId: studentUser.id,
      role: 'student',
      displayName: studentDisplayName,
      schoolId: school.id,
    })

    await ensureStudentClass(supabaseAdmin, {
      studentId: studentUser.id,
      classId: clazz.id,
    })
  }

  console.log('Seed completed.')
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`)
  if (createSampleStudent) console.log(`Student login: ${studentEmail} / ${studentPassword}`)
  console.log(`School: ${seedSchoolName} | Class: ${seedClassName} (${seedSchoolYear})`)
}

main().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})


