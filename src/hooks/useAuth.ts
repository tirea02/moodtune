/**
 * AuthContext 접근 커스텀 훅
 * AuthProvider 외부에서 호출 시 명확한 에러 발생
 */
import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
