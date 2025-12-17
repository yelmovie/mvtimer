import { NextResponse } from 'next/server'
import { STUDENT_SESSION_COOKIE_NAME } from '@/lib/student/session'

export async function POST() {
  const res = NextResponse.json({ success: true, redirectPath: '/enter' })
  res.cookies.set({
    name: STUDENT_SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 0,
  })
  return res
}


