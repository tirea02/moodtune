/**
 * 커뮤니티 피드 페이지 (/feed)
 *
 * 데이터 흐름:
 * 최신순(기본)  → GET /api/playlists?category=...&page=...&limit=12
 * 좋아요순      → GET /api/search?q=&category=...&page=...&limit=12  (likeCount desc)
 * 검색어 입력   → GET /api/search?q={query}&category=...&page=...&limit=12  (debounce 300ms)
 *
 * 인피니티 스크롤 전략:
 *   - sentinel div: !loading && !loadingMore && hasMore 일 때만 렌더링
 *   - IntersectionObserver(rootMargin 200px): sentinel 진입 시 다음 페이지 요청
 *   - sentinel 언마운트 시 observer 자동 해제 → 로드 중 이중 요청 방지
 *   - currentFetchId ref: 필터 변경 시 진행 중인 응답 무시 (stale 방지)
 *
 * 좋아요/북마크 debounce 전략 (300ms):
 *   - interactions (state): 현재 UI가 보여주는 낙관적 상태
 *   - committedRef (ref): 마지막으로 서버에서 확인된 상태
 *   - interactionsRef (ref): interactions와 동기화된 ref (timer 클로저에서 최신값 읽기용)
 *   - likeTimersRef / bookmarkTimersRef: 플레이리스트 ID별 debounce timer
 *   → 빠른 클릭 시 API 1회만 호출, 409 Already liked loop 버그 방지
 *
 * 카드 클릭 → PlaylistModal (재사용)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import PlaylistModal from '../components/PlaylistModal'
import { useAuth } from '../hooks/useAuth'
import type { SavedPlaylist } from '../types'

// ─── 상수 ─────────────────────────────────────────
const CATEGORIES = [
  '전체', 'chill', 'focus', 'workout', 'energetic',
  'happy', 'sad', 'jazz', 'k-pop', 'electronic',
]
const LIMIT = 12

type SortOrder = 'latest' | 'likes'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// ─── 스켈레톤 ──────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/5 bg-white/5 p-4">
      <div className="mb-3 h-3.5 w-14 rounded-full bg-white/10" />
      <div className="mb-1.5 h-4 w-4/5 rounded bg-white/10" />
      <div className="mb-3 h-3 w-1/2 rounded bg-white/[0.06]" />
      <div className="mb-3 flex gap-1.5">
        <div className="h-4 w-10 rounded-full bg-white/10" />
        <div className="h-4 w-14 rounded-full bg-white/10" />
        <div className="h-4 w-8 rounded-full bg-white/10" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 w-12 rounded bg-white/[0.06]" />
        <div className="h-3 w-16 rounded bg-white/[0.06]" />
      </div>
    </div>
  )
}

// ─── 좋아요/북마크 인터랙션 상태 타입 ──────────────
interface Interaction {
  liked: boolean
  likeCount: number
  bookmarked: boolean
}

// ─── 메인 컴포넌트 ─────────────────────────────────
export default function FeedPage() {
  const navigate = useNavigate()
  const { firebaseUser, login, loading: authLoading } = useAuth()

  // 필터 상태
  const [searchInput, setSearchInput]     = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory]           = useState('전체')
  const [sort, setSort]                   = useState<SortOrder>('latest')

  // 데이터 상태
  const [playlists, setPlaylists]         = useState<SavedPlaylist[]>([])
  const [total, setTotal]                 = useState(0)
  const [loading, setLoading]             = useState(true)
  const [loadingMore, setLoadingMore]     = useState(false)
  const [error, setError]                 = useState('')
  const [selectedPlaylist, setSelectedPlaylist] = useState<SavedPlaylist | null>(null)

  // 좋아요/북마크 optimistic 상태 (카드 ID 기준)
  const [interactions, setInteractions]   = useState<Record<number, Interaction>>({})

  // 토스트 메시지
  const [toast, setToast] = useState<string | null>(null)

  // Refs
  const sentinelRef         = useRef<HTMLDivElement>(null)
  const debounceRef         = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageRef             = useRef(1)       // 현재 로드된 페이지 (state 불필요)
  const fetchIdRef          = useRef(0)       // stale 응답 무시용
  const committedRef        = useRef<Record<number, Interaction>>({})    // 서버 확인된 상태
  const interactionsRef     = useRef<Record<number, Interaction>>({})    // timer 클로저용
  const likeTimersRef       = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const bookmarkTimersRef   = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const hasMore = playlists.length < total

  // 3초 후 자동 소멸하는 토스트 표시
  function showToast(msg: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => setToast(null), 3000)
  }

  // ── 검색어 debounce (300ms) ──────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchInput])

  // ── fetch 함수 (필터 변경 시 재생성) ─────────────
  const fetchPlaylists = useCallback(async (targetPage: number, append: boolean) => {
    const id = ++fetchIdRef.current

    if (append) setLoadingMore(true)
    else { setLoading(true); setError('') }

    try {
      const cat = category === '전체' ? '' : category
      const params = new URLSearchParams({ page: String(targetPage), limit: String(LIMIT) })
      if (cat) params.set('category', cat)

      let url: string
      if (debouncedSearch) {
        params.set('q', debouncedSearch)
        url = `/api/search?${params.toString()}`
      } else if (sort === 'likes') {
        params.set('q', '')
        url = `/api/search?${params.toString()}`
      } else {
        url = `/api/playlists?${params.toString()}`
      }

      const res = await client.get<{ playlists: SavedPlaylist[]; total: number }>(url)

      // 필터 변경 등으로 더 최신 fetch가 있으면 무시
      if (id !== fetchIdRef.current) return

      setTotal(res.data.total)
      setPlaylists((prev) =>
        append ? [...prev, ...res.data.playlists] : res.data.playlists,
      )

      // interactions 초기화 (isLiked/isBookmarked는 로그인 시에만 포함)
      const newInteractions: Record<number, Interaction> = {}
      for (const pl of res.data.playlists) {
        const ia: Interaction = {
          liked: pl.isLiked ?? false,
          likeCount: pl.likeCount,
          bookmarked: pl.isBookmarked ?? false,
        }
        newInteractions[pl.id] = ia
        committedRef.current[pl.id] = ia  // 서버 확인 상태 동기화
      }
      interactionsRef.current = append
        ? { ...interactionsRef.current, ...newInteractions }
        : newInteractions
      setInteractions((prev) => append ? { ...prev, ...newInteractions } : newInteractions)
    } catch {
      if (id === fetchIdRef.current && !append) {
        setError('피드를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      if (id === fetchIdRef.current) {
        if (append) setLoadingMore(false)
        else setLoading(false)
      }
    }
  }, [category, sort, debouncedSearch])

  // ── 필터 변경 → 리셋 후 1페이지 로드 ─────────────
  // authLoading: true 동안 대기 → false가 된 후 실행 (Firebase 초기화 완료 보장)
  // firebaseUser를 deps에 포함:
  //   StrictMode 재마운트 시 Firebase 재구독 콜백이 setFirebaseUser를 호출
  //   → firebaseUser dep 변화 → 이 effect 재발화
  //   → 이 시점엔 auth.currentUser 세팅 완료 → 토큰 정상 포함
  //   (authLoading=true 가드가 syncWithBackend 전 조기 발화 차단)
  useEffect(() => {
    if (authLoading) return
    pageRef.current = 1
    setPlaylists([])
    setTotal(0)
    void fetchPlaylists(1, false)
  }, [fetchPlaylists, authLoading, firebaseUser])

  // ── IntersectionObserver (인피니티 스크롤) ────────
  // sentinel이 !loading && !loadingMore && hasMore 일 때만 DOM에 존재
  // → loadingMore=true가 되면 sentinel이 언마운트 → observer 자동 해제 → 이중 로드 방지
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || loadingMore) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const next = pageRef.current + 1
          pageRef.current = next
          void fetchPlaylists(next, true)
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchPlaylists, hasMore, loadingMore])

  // ── 좋아요 핸들러 (debounce 300ms + committedRef 패턴) ─────────────
  // 빠른 클릭 시 최종 상태 기준 API 1회 호출 → 409 Already liked loop 방지
  function handleLike(pl: SavedPlaylist) {
    if (!firebaseUser) { login(); return }

    // 1. 즉시 optimistic update
    const cur = interactionsRef.current[pl.id] ?? committedRef.current[pl.id]
                ?? { liked: false, likeCount: pl.likeCount, bookmarked: false }
    const next: Interaction = { ...cur, liked: !cur.liked, likeCount: cur.likeCount + (!cur.liked ? 1 : -1) }
    interactionsRef.current[pl.id] = next
    setInteractions((prev) => ({ ...prev, [pl.id]: next }))

    // 2. 기존 timer 취소 + 새 timer 세팅 (300ms debounce)
    if (likeTimersRef.current[pl.id]) clearTimeout(likeTimersRef.current[pl.id])
    likeTimersRef.current[pl.id] = setTimeout(async () => {
      const latest    = interactionsRef.current[pl.id]
      const committed = committedRef.current[pl.id]
      if (!latest || !committed) return
      if (latest.liked === committed.liked) return  // 제자리 → API 불필요

      try {
        latest.liked
          ? await client.post(`/api/playlists/${pl.id}/like`)
          : await client.delete(`/api/playlists/${pl.id}/like`)
        committedRef.current[pl.id] = { ...committed, liked: latest.liked, likeCount: latest.likeCount }
      } catch {
        // rollback to committed + 사용자 피드백
        const rb = committedRef.current[pl.id]
        if (!rb) return
        interactionsRef.current[pl.id] = { ...interactionsRef.current[pl.id], liked: rb.liked, likeCount: rb.likeCount }
        setInteractions((prev) => ({
          ...prev,
          [pl.id]: { ...prev[pl.id], liked: rb.liked, likeCount: rb.likeCount },
        }))
        showToast('좋아요 처리에 실패했어요. 잠시 후 다시 시도해주세요.')
      }
    }, 300)
  }

  // ── 북마크 핸들러 (debounce 300ms + committedRef 패턴) ─────────────
  function handleBookmark(pl: SavedPlaylist) {
    if (!firebaseUser) { login(); return }

    // 1. 즉시 optimistic update
    const cur = interactionsRef.current[pl.id] ?? committedRef.current[pl.id]
                ?? { liked: false, likeCount: pl.likeCount, bookmarked: false }
    const next: Interaction = { ...cur, bookmarked: !cur.bookmarked }
    interactionsRef.current[pl.id] = next
    setInteractions((prev) => ({ ...prev, [pl.id]: next }))

    // 2. 기존 timer 취소 + 새 timer 세팅 (300ms debounce)
    if (bookmarkTimersRef.current[pl.id]) clearTimeout(bookmarkTimersRef.current[pl.id])
    bookmarkTimersRef.current[pl.id] = setTimeout(async () => {
      const latest    = interactionsRef.current[pl.id]
      const committed = committedRef.current[pl.id]
      if (!latest || !committed) return
      if (latest.bookmarked === committed.bookmarked) return  // 제자리 → API 불필요

      try {
        latest.bookmarked
          ? await client.post(`/api/playlists/${pl.id}/bookmark`)
          : await client.delete(`/api/playlists/${pl.id}/bookmark`)
        committedRef.current[pl.id] = { ...committed, bookmarked: latest.bookmarked }
      } catch {
        // rollback to committed + 사용자 피드백
        const rb = committedRef.current[pl.id]
        if (!rb) return
        interactionsRef.current[pl.id] = { ...interactionsRef.current[pl.id], bookmarked: rb.bookmarked }
        setInteractions((prev) => ({
          ...prev,
          [pl.id]: { ...prev[pl.id], bookmarked: rb.bookmarked },
        }))
        showToast('북마크 처리에 실패했어요. 잠시 후 다시 시도해주세요.')
      }
    }, 300)
  }

  // ── 검색어 입력 핸들러 ─────────────────────────────
  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (value && sort === 'likes') setSort('latest')
  }

  // ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* Sticky 헤더 */}
      <header className="sticky top-0 sm:top-14 z-40 border-b border-white/5 bg-[#080810]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
          >
            ← 홈
          </button>
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-sm font-bold text-transparent">
            커뮤니티 피드
          </span>
          <div className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* 검색창 */}
        <div className="relative mb-4">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            &#x1F50D;
          </span>
          <input
            type="text"
            placeholder="플레이리스트 검색..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:bg-white/[0.08]"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setDebouncedSearch('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              aria-label="검색 초기화"
            >
              ✕
            </button>
          )}
        </div>

        {/* 카테고리 필터 */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                category === cat
                  ? 'border-violet-500/60 bg-violet-500/20 text-violet-300'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 정렬 + 결과 수 */}
        <div className="mb-5 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            {!loading && total > 0 && `${total}개 중 ${playlists.length}개 표시`}
          </span>
          <div className="flex gap-1">
            {(['latest', 'likes'] as SortOrder[]).map((s) => (
              <button
                key={s}
                onClick={() => { setSort(s); setSearchInput(''); setDebouncedSearch('') }}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                  sort === s
                    ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
                    : 'border-white/10 bg-white/5 text-gray-500 hover:text-gray-300'
                }`}
              >
                {s === 'latest' ? '최신순' : '좋아요순'}
              </button>
            ))}
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* 초기 로딩 스켈레톤 */}
        {loading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* 플레이리스트 그리드 */}
        {!loading && playlists.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => setSelectedPlaylist(pl)}
                className="cursor-pointer rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:border-violet-500/20 hover:bg-white/[0.08]"
              >
                {/* 카테고리 배지 */}
                <span className="mb-2.5 inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs text-violet-300">
                  {pl.category}
                </span>

                {/* 이름 */}
                <h3 className="mb-1 text-sm font-semibold leading-snug text-white line-clamp-2">
                  {pl.name}
                </h3>

                {/* 곡수 */}
                <p className="mb-2.5 text-xs text-gray-600">
                  {pl.tracks.length}곡 · 영상 {pl.videos.length}개
                </p>

                {/* 태그 칩 */}
                {pl.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {pl.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 하단: 좋아요 + 북마크 + 저장일 */}
                {(() => {
                  const ia = interactions[pl.id] ?? { liked: false, likeCount: pl.likeCount, bookmarked: false }
                  return (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* 좋아요 버튼 */}
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleLike(pl) }}
                          title={firebaseUser ? (ia.liked ? '좋아요 취소' : '좋아요') : '로그인 후 이용 가능'}
                          className={`flex items-center gap-1 text-xs transition-colors ${
                            ia.liked
                              ? 'text-rose-400 hover:text-rose-300'
                              : 'text-gray-500 hover:text-rose-400'
                          }`}
                        >
                          <span>{ia.liked ? '♥' : '♡'}</span>
                          <span>{ia.likeCount}</span>
                        </button>
                        {/* 북마크 버튼 */}
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleBookmark(pl) }}
                          title={firebaseUser ? (ia.bookmarked ? '북마크 취소' : '북마크') : '로그인 후 이용 가능'}
                          className={`text-xs transition-colors ${
                            ia.bookmarked
                              ? 'text-violet-400 hover:text-violet-300'
                              : 'text-gray-500 hover:text-violet-400'
                          }`}
                        >
                          {ia.bookmarked ? '🔖' : '🔗'}
                        </button>
                        {/* 댓글 수 */}
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <span>💬</span>
                          <span>{pl.commentCount ?? 0}</span>
                        </span>
                      </div>
                      <span className="text-xs text-gray-600">{formatDate(pl.createdAt)}</span>
                    </div>
                  )
                })()}
              </div>
            ))}
          </div>
        )}

        {/* 추가 로딩 스피너 (인피니티 스크롤) */}
        {loadingMore && (
          <div className="mt-4 flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
          </div>
        )}

        {/* 모두 로드 완료 */}
        {!loading && !loadingMore && !hasMore && playlists.length > 0 && (
          <p className="mt-6 pb-2 text-center text-xs text-gray-700">
            모든 플레이리스트를 불러왔어요
          </p>
        )}

        {/* sentinel — !loading && !loadingMore && hasMore 일 때만 렌더 */}
        {!loading && !loadingMore && hasMore && (
          <div ref={sentinelRef} className="h-4" aria-hidden="true" />
        )}

        {/* 빈 상태 */}
        {!loading && playlists.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="mb-4 text-4xl">🎵</span>
            <h2 className="mb-2 text-base font-semibold text-white">
              {debouncedSearch
                ? `"${debouncedSearch}"에 대한 결과가 없어요`
                : '아직 공개된 플레이리스트가 없어요'}
            </h2>
            <p className="mb-6 text-sm text-gray-500">
              {debouncedSearch
                ? '다른 검색어를 시도해보세요.'
                : '기분을 입력하고 첫 번째 플레이리스트를 만들어보세요.'}
            </p>
            {debouncedSearch ? (
              <button
                onClick={() => { setSearchInput(''); setDebouncedSearch('') }}
                className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-gray-400 transition-all hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300"
              >
                검색 초기화
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-gray-400 transition-all hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300"
              >
                음악 찾으러 가기 →
              </button>
            )}
          </div>
        )}
      </main>

      {/* 플레이리스트 상세 모달 */}
      {selectedPlaylist && (
        <PlaylistModal
          playlist={selectedPlaylist}
          onClose={() => setSelectedPlaylist(null)}
        />
      )}

      {/* 토스트 메시지 — 모바일 탭바 위, 데스크탑 하단 */}
      {toast && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-gray-900/95 px-4 py-2.5 text-xs text-gray-200 shadow-xl backdrop-blur-sm">
          {toast}
        </div>
      )}
    </div>
  )
}
