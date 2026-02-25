/**
 * Google 로그인/로그아웃 버튼 컴포넌트
 *
 * 상태별 렌더링:
 * - loading 중: null (깜빡임 방지)
 * - 로그인 전: "Google로 로그인" 버튼
 * - 로그인 후: 유저 아바타 + 이름 + 로그아웃 버튼
 */
import { useAuth } from '../hooks/useAuth'

export default function GoogleLoginButton() {
  const { firebaseUser, loading, login, logout } = useAuth()

  if (loading) return null

  if (firebaseUser) {
    return (
      <div className="flex items-center gap-2">
        {firebaseUser.photoURL && (
          <img
            src={firebaseUser.photoURL}
            alt={firebaseUser.displayName ?? '유저'}
            className="h-8 w-8 rounded-full ring-1 ring-white/20"
          />
        )}
        <span className="hidden text-sm text-gray-300 sm:block">
          {firebaseUser.displayName}
        </span>
        <button
          onClick={() => void logout()}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400 transition-all hover:border-white/20 hover:text-white"
        >
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => void login()}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 transition-all hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300"
    >
      {/* Google G 아이콘 */}
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Google로 로그인
    </button>
  )
}
