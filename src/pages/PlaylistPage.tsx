import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { analyzeMood } from '../api/gemini'
import { searchVideos } from '../api/youtube'
import type { Track, Video } from '../types'

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

  const [tracks, setTracks] = useState<Track[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
          <div className="w-16" />
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

        {/* Playlist */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
            <span className="text-violet-400">♪</span> 추천 플레이리스트
          </h2>
          <div className="space-y-2">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <TrackSkeleton key={i} />)
              : tracks.map((track, idx) => (
                  <div
                    key={track.id}
                    className="group flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 px-4 py-3.5 transition-all hover:border-violet-500/30 hover:bg-white/[0.08]"
                  >
                    <div className="w-5 shrink-0 text-center">
                      <span className="text-xs text-gray-600 group-hover:hidden">{idx + 1}</span>
                      <span className="hidden text-sm text-violet-400 group-hover:block">▶</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{track.title}</p>
                      <p className="truncate text-xs text-gray-500">{track.artist}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                        GENRE_COLORS[track.genre] ?? 'border-gray-400/20 bg-gray-400/10 text-gray-400'
                      }`}
                    >
                      {track.genre}
                    </span>
                  </div>
                ))}
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
