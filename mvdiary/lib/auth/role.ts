/**
 * 사용자 역할(role) 조회 및 검증
 * One Source of Truth: 모든 role 조회는 여기서 수행
 */

import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/routing'

export interface UserRoleResult {
  role: UserRole | null
  error: string | null
}

/**
 * 현재 인증된 사용자의 role 조회
 * @returns role 또는 null (프로필이 없는 경우)
 * @throws role이 없거나 유효하지 않은 경우 오류 반환하지 않고 null 반환
 */
export async function getUserRole(): Promise<UserRoleResult> {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { role: null, error: '인증되지 않은 사용자입니다.' }
    }

    // profiles 테이블에서 role 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return { role: null, error: '프로필 정보를 찾을 수 없습니다.' }
    }

    // role 유효성 검증
    const validRoles: UserRole[] = ['student', 'teacher', 'admin']
    if (!profile.role || !validRoles.includes(profile.role as UserRole)) {
      return { role: null, error: `유효하지 않은 역할입니다: ${profile.role}` }
    }

    return { role: profile.role as UserRole, error: null }
  } catch (error) {
    console.error('[getUserRole] error:', error)
    return { role: null, error: '역할 조회 중 오류가 발생했습니다.' }
  }
}

/**
 * 특정 사용자 ID의 role 조회 (서버 사이드 전용)
 */
export async function getUserRoleById(userId: string): Promise<UserRoleResult> {
  try {
    const supabase = await createClient()
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return { role: null, error: '프로필 정보를 찾을 수 없습니다.' }
    }

    const validRoles: UserRole[] = ['student', 'teacher', 'admin']
    if (!profile.role || !validRoles.includes(profile.role as UserRole)) {
      return { role: null, error: `유효하지 않은 역할입니다: ${profile.role}` }
    }

    return { role: profile.role as UserRole, error: null }
  } catch (error) {
    console.error('[getUserRoleById] error:', error)
    return { role: null, error: '역할 조회 중 오류가 발생했습니다.' }
  }
}

