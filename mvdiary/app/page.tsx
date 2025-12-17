import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingHero from '@/components/landing/LandingHero'
import { getDashboardPathByRole } from '@/lib/routing'
import { getUserRole } from '@/lib/auth/role'

/**
 * 루트 페이지
 * 인증 상태에 따라 자동 리다이렉트
 */
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // 역할 확인: One Source of Truth 사용
    const roleResult = await getUserRole()
    
    // role이 있으면 올바른 대시보드로 리다이렉트
    // role이 null이면 홈 페이지에 머물러서 로그인 유도
    if (roleResult.role) {
      redirect(getDashboardPathByRole(roleResult.role))
    }
  }

  return <LandingHero />
}

