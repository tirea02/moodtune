/**
 * 커뮤니티 피드 페이지 (/feed)
 *
 * 데이터 흐름:
 * 최신순(기본)  → GET /api/playlists?category=...
 * 좋아요순      → GET /api/search?q=&category=...  (likeCount desc)
 * 검색어 입력   → GET /api/search?q={query}&category=...  (debounce 300ms)
 * 카드 클릭     → PlaylistModal (재사용)
 *
 * 카드 표시 항목: 이름 / 카테고리 배지 / 태그 칩 / 좋아요 수 / 곡수 / 저장일
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import PlaylistModal from '../components/PlaylistModal'
import type { SavedPlaylist } from '../types'

// ─── 상수 ─────────────────────────────────────────
const CATEGORIES = [
  '전체', 'chill', 'focus', 'workout', 'energetic',
  'happy', 'sad', 'jazz', 'k-pop', 'electronic',
]

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

  const [playlists, setPlaylists] = useState<SavedPlaylist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('전체')
  const [sort, setSort] = useState<SortOrder>('latest')
  const [selectedPlaylist, setSelectedPlaylist] = useState<SavedPlaylist | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 검색어 debounce (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  // 데이터 패치: category / sort / debouncedSearch 변경 시
  useEffect(() => {
    async function fetchFeed() {
      try {
        setLoading(true)
        setError('')

        const cat = category === '전체' ? '' : category

        let url: string
        if (debouncedSearch) {
          // 검색어 있음 → /api/search
          url = `/api/search?q=${encodeURIComponent(debouncedSearch)}`
          if (cat) url += `&category=${encodeURIComponent(cat)}`
        } else if (sort === 'likes') {
          // 좋아요순 → /api/search (빈 q, likeCount desc)
          url = `/api/search?q=`
          if (cat) url += `&category=${encodeURIComponent(cat)}`
        } else {
          // 최신순(기본) → /api/playlists
          url = `/api/playlists`
          if (cat) url += `?category=${encodeURIComponent(cat)}`
        }

        const res = await client.get<{ playlists: SavedPlaylist[] }>(url)
        setPlaylists(res.data.playlists)
      } catch {
        setError('피드를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      } finally {
        setLoading(false)
      }
    }

    void fetchFeed()
  }, [category, sort, debouncedSearch])

  // 검색어 입력 시 정렬을 '최신순'으로 초기화
  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (value && sort === 'likes') setSort('latest')
  }

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
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
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

        {/* 정렬 버튼 + 결과 수 */}
        <div className="mb-5 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            {!loading && `${playlists.length}개의 플레이리스트`}
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

        {/* 로딩 스켈레톤 */}
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
