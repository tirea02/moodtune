/**
 * 전역 Firebase 인증 상태 관리 Context
 *
 * 데이터 흐름:
 * onAuthStateChanged → firebaseUser 갱신 → syncWithBackend → dbUser 갱신
 *
 * 제공 값:
 * - firebaseUser: Firebase SDK 유저 객체 (null = 비로그인)
 * - dbUser: 백엔드 DB 유저 (id, displayName 등)
 * - loading: 초기 auth 상태 확인 중 (새로고침 시 깜빡임 방지)
 * - login(): Google signInWithPopup 실행
 * - logout(): Firebase signOut + dbUser 초기화
 */
import { createContext, useEffect, useState, type ReactNode } from 'react'
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import type { DbUser } from '../types'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  dbUser: DbUser | null
  loading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [loading, setLoading] = useState(true)

  /** Firebase 유저 → 백엔드 /api/auth/login으로 토큰 전송 → dbUser 저장 */
  async function syncWithBackend(user: FirebaseUser) {
    try {
      const idToken = await user.getIdToken()
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (res.ok) {
        const data = (await res.json()) as { user: DbUser }
        setDbUser(data.user)
      }
    } catch (err) {
      console.error('백엔드 인증 동기화 실패:', err)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        await syncWithBackend(user)
      } else {
        setDbUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function login() {
    // signInWithPopup 완료 후 onAuthStateChanged가 자동으로 syncWithBackend 호출
    await signInWithPopup(auth, googleProvider)
  }

  async function logout() {
    await signOut(auth)
    setDbUser(null)
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, dbUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
