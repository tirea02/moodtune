/**
 * 공통 레이아웃 컴포넌트
 *
 * 모바일(<sm):
 *   - 고정 하단 탭바 (홈 / 피드 / 보관함 / 프로필)
 *   - 프로필 탭: 비로그인 → login() 팝업, 로그인 → 아바타 + /my-playlists 이동
 *   - 콘텐츠에 pb-16 (탭바 높이만큼 여백)
 *
 * 데스크탑(sm+):
 *   - 고정 상단 헤더 (MoodTune 로고 / 네비 링크 / GoogleLoginButton)
 *   - Auth loading 중 → 스켈레톤으로 깜빡임 방지
 *   - 콘텐츠에 pt-14 (헤더 높이만큼 여백)
 *
 * Per-page 헤더(sticky)는 데스크탑에서 sm:top-14 사용해 레이아웃 헤더 아래에 붙음
 */
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import GoogleLoginButton from './GoogleLoginButton'
import Footer from './Footer'

// ─── 네비게이션 항목 ────────────────────────────────
const NAV_ITEMS = [
  { label: '홈',    emoji: '🏠', path: '/'            },
  { label: '피드',  emoji: '📻', path: '/feed'        },
  { label: '보관함', emoji: '🔖', path: '/my-playlists' },
  { label: '프로필', emoji: '👤', path: null           }, // Auth 게이트
] as const

type NavItem = (typeof NAV_ITEMS)[number]

function isActive(item: NavItem, pathname: string): boolean {
  if (!item.path) return false
  return item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
}

interface Props {
  children: ReactNode
}

export default function Layout({ children }: Props) {
  const location = useLocation()
  const navigate  = useNavigate()
  const { firebaseUser, loading, login } = useAuth()

  // 프로필 탭: 비로그인 → login(), 로그인 → /my-playlists
  function handleProfileTab() {
    if (firebaseUser) {
      navigate('/my-playlists')
    } else {
      void login()
    }
  }

  return (
    <>
      {/* ── 데스크탑 상단 헤더 (sm+) ── */}
      <header className="hidden sm:flex fixed top-0 left-0 right-0 z-50 h-14 items-center border-b border-white/5 bg-[#080810]/90 px-6 backdrop-blur-xl">
        {/* 로고 */}
        <Link
          to="/"
          className="mr-8 shrink-0 bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-sm font-bold text-transparent"
        >
          MoodTune
        </Link>

        {/* 중앙 네비 */}
        <nav className="flex flex-1 items-center gap-1">
          {NAV_ITEMS.filter((item) => item.path !== null).map((item) => (
            <Link
              key={item.path}
              to={item.path!}
              className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
                isActive(item, location.pathname)
                  ? 'bg-white/10 font-medium text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 우측: 로그인 상태 (loading → 스켈레톤) */}
        <div className="flex shrink-0 items-center">
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded-xl bg-white/10" />
          ) : (
            <GoogleLoginButton />
          )}
        </div>
      </header>

      {/* ── 콘텐츠 영역 ── */}
      <div className="min-h-screen pb-16 sm:pb-0 sm:pt-14">
        {children}
        <Footer />
      </div>

      {/* ── 모바일 하단 탭바 (<sm) ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-white/5 bg-[#080810]/95 backdrop-blur-xl">
        {NAV_ITEMS.map((item) => {
          // ── 프로필 탭: Auth 게이트 ──
          if (item.path === null) {
            const label = loading
              ? '...'
              : firebaseUser
              ? (firebaseUser.displayName?.split(' ')[0] ?? '나')
              : '로그인'

            return (
              <button
                key="profile"
                onClick={handleProfileTab}
                className="flex flex-1 items-center justify-center"
              >
                <div className="flex flex-col items-center gap-0.5 py-2">
                  {/* 아바타 또는 이모지 */}
                  {loading ? (
                    <div className="h-6 w-6 animate-pulse rounded-full bg-white/10" />
                  ) : firebaseUser?.photoURL ? (
                    <img
                      src={firebaseUser.photoURL}
                      alt={firebaseUser.displayName ?? ''}
                      className="h-6 w-6 rounded-full ring-1 ring-violet-400/60"
                    />
                  ) : (
                    <span className="text-xl leading-none">{item.emoji}</span>
                  )}
                  <span className="text-[10px] font-medium text-gray-500 transition-colors">
                    {label}
                  </span>
                </div>
              </button>
            )
          }

          // ── 일반 링크 탭 ──
          const active = isActive(item, location.pathname)
          return (
            <Link
              key={item.path}
              to={item.path!}
              className="flex flex-1 items-center justify-center"
            >
              <div className="flex flex-col items-center gap-0.5 py-2">
                <span className="text-xl leading-none">{item.emoji}</span>
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    active ? 'text-violet-400' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
