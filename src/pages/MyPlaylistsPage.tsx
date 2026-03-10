/**
 * 내 플레이리스트 페이지 (/my-playlists)
 *
 * 탭 구조:
 *   - 내 플레이리스트: GET /api/playlists/my
 *   - 북마크:          GET /api/bookmarks → bookmarks[].playlist 추출
 *
 * 데이터 흐름:
 * authLoading → 스켈레톤
 * 비로그인     → 로그인 유도 화면
 * 로그인 + mine 탭      → GET /api/playlists/my → 카드 목록 렌더링
 * 로그인 + bookmarks 탭 → GET /api/bookmarks    → 카드 목록 렌더링
 *
 * 카드 표시 항목: 이름 / 카테고리 배지 / 태그 칩 / 곡수·영상수 / 저장일
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import client from '../api/client'
import PlaylistModal from '../components/PlaylistModal'
import type { SavedPlaylist } from '../types'

type Tab = 'mine' | 'bookmarks'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/5 bg-white/5 p-5">
      <div className="mb-3 h-4 w-16 rounded-full bg-white/10" />
      <div className="mb-2 h-4 w-2/3 rounded bg-white/10" />
      <div className="mb-4 h-3 w-1/2 rounded bg-white/[0.06]" />
      <div className="flex gap-2">
        <div className="h-5 w-12 rounded-full bg-white/10" />
        <div className="h-5 w-16 rounded-full bg-white/10" />
        <div className="h-5 w-10 rounded-full bg-white/10" />
      </div>
    </div>
  )
}

function PlaylistCard({ pl, onClick }: { pl: SavedPlaylist; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-2xl border border-white/5 bg-white/5 p-5 transition-all hover:border-violet-500/20 hover:bg-white/[0.08]"
    >
      {/* 카테고리 배지 */}
      <span className="mb-3 inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs text-violet-300">
        {pl.category}
      </span>

      {/* 이름 */}
      <h3 className="mb-1 text-sm font-semibold text-white">{pl.name}</h3>

      {/* 곡수 · 영상수 */}
      <p className="mb-3 text-xs text-gray-600">
        {pl.tracks.length}곡 · 영상 {pl.videos.length}개
      </p>

      {/* 태그 칩 */}
      {pl.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {pl.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 저장일 */}
      <p className="text-right text-xs text-gray-600">{formatDate(pl.createdAt)}</p>
    </div>
  )
}

export default function MyPlaylistsPage() {
  const navigate = useNavigate()
  const { firebaseUser, loading: authLoading, login } = useAuth()

  const [activeTab, setActiveTab] = useState<Tab>('mine')

  // mine 탭 상태
  const [playlists, setPlaylists]     = useState<SavedPlaylist[]>([])
  const [fetching, setFetching]       = useState(false)
  const [fetchError, setFetchError]   = useState('')

  // bookmarks 탭 상태
  const [bookmarks, setBookmarks]               = useState<SavedPlaylist[]>([])
  const [bookmarkFetching, setBookmarkFetching] = useState(false)
  const [bookmarkError, setBookmarkError]       = useState('')

  const [selectedPlaylist, setSelectedPlaylist] = useState<SavedPlaylist | null>(null)

  // mine 탭 fetch
  useEffect(() => {
    if (authLoading || !firebaseUser) return

    async function fetchPlaylists() {
      try {
        setFetching(true)
        setFetchError('')
        const res = await client.get<{ playlists: SavedPlaylist[] }>('/api/playlists/my')
        setPlaylists(res.data.playlists)
      } catch {
        setFetchError('플레이리스트를 불러오지 못했어요. 다시 시도해주세요.')
      } finally {
        setFetching(false)
      }
    }

    fetchPlaylists()
  }, [firebaseUser, authLoading])

  // bookmarks 탭 fetch (탭 전환 또는 로그인 변경 시)
  useEffect(() => {
    if (authLoading || !firebaseUser || activeTab !== 'bookmarks') return

    async function fetchBookmarks() {
      try {
        setBookmarkFetching(true)
        setBookmarkError('')
        const res = await client.get<{ bookmarks: Array<{ playlist: SavedPlaylist }> }>('/api/bookmarks')
        setBookmarks(res.data.bookmarks.map((b) => b.playlist))
      } catch {
        setBookmarkError('북마크를 불러오지 못했어요. 다시 시도해주세요.')
      } finally {
        setBookmarkFetching(false)
      }
    }

    fetchBookmarks()
  }, [firebaseUser, authLoading, activeTab])

  const isLoading = authLoading || (activeTab === 'mine' ? fetching : bookmarkFetching)

  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <header className="sticky top-0 sm:top-14 z-40 border-b border-white/5 bg-[#080810]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
          >
            ← 홈
          </button>
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-sm font-bold text-transparent">
            보관함
          </span>
          <div className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* 비로그인 상태 */}
        {!authLoading && !firebaseUser && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="mb-4 text-4xl">🔐</span>
            <h2 className="mb-2 text-lg font-semibold text-white">로그인이 필요해요</h2>
            <p className="mb-6 text-sm text-gray-500">
              저장한 플레이리스트를 보려면 Google 로그인이 필요해요.
            </p>
            <button
              onClick={() => void login()}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:from-violet-500 hover:to-blue-500"
            >
              Google로 로그인
            </button>
          </div>
        )}

        {/* 로그인 후 탭 + 콘텐츠 */}
        {(authLoading || firebaseUser) && (
          <>
            {/* 탭 네비게이션 */}
            <div className="mb-6 flex border-b border-white/10">
              <button
                onClick={() => setActiveTab('mine')}
                className={`px-4 pb-3 text-sm font-medium transition-colors ${
                  activeTab === 'mine'
                    ? 'border-b-2 border-violet-500 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                내 플레이리스트
              </button>
              <button
                onClick={() => setActiveTab('bookmarks')}
                className={`px-4 pb-3 text-sm font-medium transition-colors ${
                  activeTab === 'bookmarks'
                    ? 'border-b-2 border-violet-500 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                북마크
              </button>
            </div>

            {/* 에러 */}
            {(activeTab === 'mine' ? fetchError : bookmarkError) && (
              <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {activeTab === 'mine' ? fetchError : bookmarkError}
              </div>
            )}

            {/* 스켈레톤 */}
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* mine 탭: 플레이리스트 목록 */}
            {!isLoading && firebaseUser && activeTab === 'mine' && playlists.length > 0 && (
              <div className="space-y-3">
                <p className="mb-4 text-xs text-gray-600">{playlists.length}개의 플레이리스트</p>
                {playlists.map((pl) => (
                  <PlaylistCard key={pl.id} pl={pl} onClick={() => setSelectedPlaylist(pl)} />
                ))}
              </div>
            )}

            {/* mine 탭: 빈 상태 */}
            {!isLoading && firebaseUser && activeTab === 'mine' && playlists.length === 0 && !fetchError && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="mb-4 text-4xl">🎵</span>
                <h2 className="mb-2 text-base font-semibold text-white">
                  아직 저장된 플레이리스트가 없어요
                </h2>
                <p className="mb-6 text-sm text-gray-500">
                  기분을 입력하고 AI 추천 플레이리스트를 저장해보세요.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-gray-400 transition-all hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300"
                >
                  음악 찾으러 가기 →
                </button>
              </div>
            )}

            {/* bookmarks 탭: 목록 */}
            {!isLoading && firebaseUser && activeTab === 'bookmarks' && bookmarks.length > 0 && (
              <div className="space-y-3">
                <p className="mb-4 text-xs text-gray-600">{bookmarks.length}개의 북마크</p>
                {bookmarks.map((pl) => (
                  <PlaylistCard key={pl.id} pl={pl} onClick={() => setSelectedPlaylist(pl)} />
                ))}
              </div>
            )}

            {/* bookmarks 탭: 빈 상태 */}
            {!isLoading && firebaseUser && activeTab === 'bookmarks' && bookmarks.length === 0 && !bookmarkError && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="mb-4 text-4xl">🔖</span>
                <h2 className="mb-2 text-base font-semibold text-white">
                  아직 북마크한 플레이리스트가 없어요
                </h2>
                <p className="mb-6 text-sm text-gray-500">
                  피드에서 마음에 드는 플레이리스트를 북마크해보세요.
                </p>
                <button
                  onClick={() => navigate('/feed')}
                  className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-gray-400 transition-all hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300"
                >
                  피드 보러 가기 →
                </button>
              </div>
            )}
          </>
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
