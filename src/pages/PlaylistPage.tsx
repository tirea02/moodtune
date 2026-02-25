import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { analyzeMood } from '../api/gemini'
import { searchVideos } from '../api/youtube'
import client from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { Track, Video, ItunesResult } from '../types'

const GENRE_COLORS: Record<string, string> = {
  'Indie Folk':  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  'Indie Rock':  'text-red-400 bg-red-400/10 border-red-400/20',
  'Art Rock':    'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Folk':        'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'R&B Soul':    'text-pink-400 bg-pink-400/10 border-pink-400/20',
  'R&B':         'text-pink-400 bg-pink-400/10 border-pink-400/20',
  'Pop':         'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Electronic':  'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  'Jazz':        'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'Classical':   'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'Hip-Hop':     'text-lime-400 bg-lime-400/10 border-lime-400/20',
  'Rock':        'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Lo-fi':       'text-teal-400 bg-teal-400/10 border-teal-400/20',
}

function TrackSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-xl border border-white/5 bg-white/5 px-4 py-3.5">
      <div className="h-3 w-5 rounded bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded bg-white/10" />
        <div className="h-2 w-1/3 rounded bg-white/[0.06]" />
      </div>
      <div className="h-4 w-16 rounded-full bg-white/10" />
    </div>
  )
}

function VideoSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-white/5 bg-white/5">
      <div className="h-48 bg-white/10 sm:h-28" />
      <div className="space-y-2 p-3">
        <div className="h-2.5 w-full rounded bg-white/10" />
        <div className="h-2.5 w-3/4 rounded bg-white/[0.06]" />
        <div className="mt-1 h-2 w-1/2 rounded bg-white/[0.04]" />
      </div>
    </div>
  )
}

export default function PlaylistPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const mood: string = state?.mood ?? ''

  const { firebaseUser } = useAuth()

  const [tracks, setTracks] = useState<Track[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  // iTunes 미리듣기 상태
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const [itunesLoading, setItunesLoading] = useState(false)
  const [itunesResult, setItunesResult] = useState<ItunesResult | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [manualPlayNeeded, setManualPlayNeeded] = useState(false)
  const [noPreview, setNoPreview] = useState(false)

  // 페이지 이탈 시 오디오 정리
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current.src = ''
      }
    }
  }, [])

  useEffect(() => {
    if (!mood) { navigate('/'); return }

    async function fetchData() {
      try {
        setLoading(true)
        setError('')

        // 1. Gemini: 감정 분석 + 트랙 추천 + 유튜브 검색 쿼리 생성
        const geminiResult = await analyzeMood(mood)

        const tracksWithId: Track[] = geminiResult.tracks.map((t, i) => ({
          ...t,
          id: String(i),
        }))
        setAnalysis(geminiResult.analysis)
        setTracks(tracksWithId)

        // 2. YouTube: Gemini가 제안한 쿼리로 영상 검색
        const youtubeVideos = await searchVideos(geminiResult.videoQueries)
        setVideos(youtubeVideos)
      } catch (err) {
        console.error(err)
        setError('AI 분석 중 오류가 발생했어요. 잠시 후 다시 시도해줘.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [mood, navigate])

  /** iTunes Search API로 트랙 미리듣기 */
  async function handleTrackClick(track: Track) {
    if (activeTrackId === track.id) {
      currentAudioRef.current?.pause()
      currentAudioRef.current && (currentAudioRef.current.src = '')
      currentAudioRef.current = null
      setActiveTrackId(null)
      setItunesResult(null)
      setIsPlaying(false)
      setNoPreview(false)
      return
    }

    currentAudioRef.current?.pause()
    currentAudioRef.current && (currentAudioRef.current.src = '')
    currentAudioRef.current = null
    setActiveTrackId(track.id)
    setItunesLoading(true)
    setItunesResult(null)
    setIsPlaying(false)
    setManualPlayNeeded(false)
    setNoPreview(false)

    try {
      const query = encodeURIComponent(`${track.title} ${track.artist}`)
      const res = await fetch(
        `https://itunes.apple.com/search?term=${query}&entity=song&limit=1&country=KR`,
      )
      const data = (await res.json()) as { resultCount: number; results: ItunesResult[] }
      const result = data.resultCount > 0 ? data.results[0] : null
      setItunesLoading(false)

      if (!result?.previewUrl) {
        setNoPreview(true)
        const q = encodeURIComponent(`${track.title} ${track.artist} lyrics`)
        window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank')
        return
      }

      setItunesResult(result)
      const audio = new Audio(result.previewUrl)
      currentAudioRef.current = audio
      audio.onended = () => { setIsPlaying(false); setActiveTrackId(null) }
      setIsPlaying(true)
      audio.play().catch(() => { setIsPlaying(false); setManualPlayNeeded(true) })
    } catch {
      setItunesLoading(false)
      setActiveTrackId(null)
    }
  }

  function handleManualPlay() {
    currentAudioRef.current?.play().catch(() => {})
    setIsPlaying(true)
    setManualPlayNeeded(false)
  }

  function openYouTubeLyrics(track: Track) {
    const q = encodeURIComponent(`${track.title} ${track.artist} lyrics`)
    window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank')
  }

  /**
   * 플레이리스트 저장
   * Gemini 결과(tracks, videos, analysis) + mood → POST /api/playlists
   * tags: 트랙 장르 중복 제거, category: 첫 번째 트랙 장르
   */
  async function handleSave() {
    if (!firebaseUser || saving || saved) return
    try {
      setSaving(true)
      setSaveError('')
      await client.post('/api/playlists', {
        name: `${mood.slice(0, 50)} 플레이리스트`,
        description: analysis,
        category: tracks[0]?.genre ?? 'mixed',
        tags: [...new Set(tracks.map((t) => t.genre))],
        tracks,
        videos,
        isPublic: true,
      })
      setSaved(true)
    } catch (err) {
      console.error(err)
      setSaveError('저장 실패. 다시 시도해줘.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080810]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
          >
            ← 다시 입력
          </button>
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-sm font-bold text-transparent">
            moodtune
          </span>
          {/* 저장 버튼: 로딩 중 숨김 / 비로그인 시 안내 / 로그인 시 저장 */}
          {loading ? (
            <div className="w-16" />
          ) : !firebaseUser ? (
            <span className="text-xs text-gray-600">로그인 후 저장</span>
          ) : saved ? (
            <span className="text-xs font-medium text-violet-400">✓ 저장됨</span>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400 transition-all hover:border-violet-400/50 hover:bg-violet-500/20 hover:text-violet-300 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Mood analysis card */}
        <div className="mb-8 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-900/30 to-blue-900/20 p-5 backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`rounded-full border border-violet-500/30 bg-violet-500/20 px-2.5 py-0.5 text-xs font-medium text-violet-300 ${
                loading ? 'animate-pulse' : ''
              }`}
            >
              {loading ? '✦ AI 분석 중...' : '✦ AI 분석 완료'}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-gray-300">"{mood}"</p>
          {loading ? (
            <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-white/[0.06]" />
          ) : (
            analysis && <p className="mt-3 text-xs text-gray-500">{analysis}</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {saveError && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {saveError}
          </div>
        )}

        {/* Playlist */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
            <span className="text-violet-400">♪</span> 추천 플레이리스트
          </h2>
          <div className="space-y-2">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <TrackSkeleton key={i} />)
              : tracks.map((track, idx) => {
                  const isActive = activeTrackId === track.id
                  const isThisLoading = isActive && itunesLoading
                  const isThisNoPreview = isActive && noPreview
                  return (
                    <div
                      key={track.id}
                      onClick={() => void handleTrackClick(track)}
                      className={`group flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all ${
                        isActive
                          ? 'border-violet-500/50 bg-violet-500/10'
                          : 'border-white/5 bg-white/5 hover:border-violet-500/30 hover:bg-white/[0.08]'
                      }`}
                    >
                      {/* 상태 아이콘 */}
                      <div className="w-5 shrink-0 text-center">
                        {isThisLoading ? (
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                        ) : isActive && isPlaying ? (
                          <span className="text-sm text-violet-400">■</span>
                        ) : isActive && manualPlayNeeded ? (
                          <span
                            className="text-sm text-violet-400"
                            onClick={(e) => { e.stopPropagation(); handleManualPlay() }}
                          >▶</span>
                        ) : isThisNoPreview ? (
                          <span className="text-xs text-gray-600">↗</span>
                        ) : (
                          <>
                            <span className="text-xs text-gray-600 group-hover:hidden">{idx + 1}</span>
                            <span className="hidden text-sm text-violet-400 group-hover:block">▶</span>
                          </>
                        )}
                      </div>

                      {/* 앨범아트 — iTunes 결과 있을 때만 */}
                      {isActive && itunesResult?.artworkUrl100 && (
                        <img
                          src={itunesResult.artworkUrl100}
                          alt={itunesResult.collectionName}
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      )}

                      {/* 제목 / 아티스트 / 앨범명 */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{track.title}</p>
                        <p className="truncate text-xs text-gray-500">{track.artist}</p>
                        {isActive && itunesResult?.collectionName && (
                          <p className="mt-0.5 truncate text-xs text-gray-600">{itunesResult.collectionName}</p>
                        )}
                      </div>

                      {/* 우측: 장르 배지 or 전체 듣기 or YouTube 링크 */}
                      {isThisNoPreview ? (
                        <span className="shrink-0 text-xs text-blue-400">YouTube에서 듣기 ↗</span>
                      ) : isActive && itunesResult ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); openYouTubeLyrics(track) }}
                          className="shrink-0 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-400 transition-all hover:bg-blue-500/20"
                        >
                          전체 듣기 ↗
                        </button>
                      ) : (
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                            GENRE_COLORS[track.genre] ?? 'border-gray-400/20 bg-gray-400/10 text-gray-400'
                          }`}
                        >
                          {track.genre}
                        </span>
                      )}
                    </div>
                  )
                })}
          </div>
        </section>

        {/* YouTube videos */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <span className="text-blue-400">▶</span> 추천 유튜브 영상
            </h2>
            {!loading && videos.length > 0 && (
              <button
                onClick={() =>
                  window.open(
                    `https://www.youtube.com/watch_videos?video_ids=${videos.map((v) => v.videoId).join(',')}`,
                    '_blank',
                  )
                }
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-all hover:border-blue-400/50 hover:bg-blue-500/20 hover:text-blue-300"
              >
                ▶ 전체 재생
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <VideoSkeleton key={i} />)
              : videos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() =>
                      window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')
                    }
                    className="group cursor-pointer overflow-hidden rounded-xl border border-white/5 bg-white/5 transition-all hover:border-blue-500/30 hover:bg-white/[0.08]"
                  >
                    <div className="relative h-48 overflow-hidden bg-gray-900 sm:h-28">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-all group-hover:scale-110 group-hover:bg-black/60">
                          <span className="pl-0.5 text-sm text-white">▶</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-xs font-medium leading-relaxed text-gray-200">
                        {video.title}
                      </p>
                      <p className="mt-1.5 text-xs text-gray-600">{video.channel}</p>
                    </div>
                  </div>
                ))}
          </div>
        </section>

        {!loading && (
          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-gray-400 transition-all hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300"
            >
              다른 기분으로 다시 찾기
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
