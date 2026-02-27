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
 * 카드 클릭 → PlaylistModal (재사용)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import PlaylistModal from '../components/PlaylistModal'
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

// ─── 메인 컴포넌트 ─────────────────────────────────
export default function FeedPage() {
  const navigate = useNavigate()

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

  // Refs
  const sentinelRef   = useRef<HTMLDivElement>(null)
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageRef       = useRef(1)       // 현재 로드된 페이지 (state 불필요)
  const fetchIdRef    = useRef(0)       // stale 응답 무시용

  const hasMore = playlists.length < total

  // ── 페이지 진입 시 스크롤 초기화 ─────────────────
  // SPA 특성상 이전 페이지(보관함 등)의 스크롤 위치가 공유됨
  // → sentinel이 마운트 직후 viewport 안에 있어 이중 로드 발생하는 버그 방지
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

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
  useEffect(() => {
    pageRef.current = 1
    setPlaylists([])
    setTotal(0)
    void fetchPlaylists(1, false)
  }, [fetchPlaylists])

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
                  sort === s && !debouncedSearch
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

                {/* 하단: 좋아요 + 저장일 */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="text-rose-400">♥</span>
                    {pl.likeCount}
                  </span>
                  <span className="text-xs text-gray-600">{formatDate(pl.createdAt)}</span>
                </div>
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
    </div>
  )
}
