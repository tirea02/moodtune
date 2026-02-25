/**
 * 플레이리스트 상세 모달
 *
 * 트랙 클릭 흐름:
 *   → iTunes Search API 호출 (encodeURIComponent, &country=KR)
 *   → previewUrl 있음: new Audio().play() + 앨범아트 표시 + "전체 듣기 ↗"
 *   → previewUrl null: YouTube lyrics 새 탭 즉시 오픈 + "YouTube에서 듣기 ↗" 표시
 *   → 같은 트랙 재클릭: 정지
 * 유튜브 영상 썸네일 클릭 → youtube.com/watch?v= 새 탭
 * ESC 키 / 닫기 버튼 / 오버레이 클릭 → onClose() + 오디오 중지
 */
import { useEffect, useRef, useState } from 'react'
import type { SavedPlaylist, Track, Video, ItunesResult } from '../types'

const GENRE_COLORS: Record<string, string> = {
  'Indie Folk': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  'Indie Rock': 'text-red-400 bg-red-400/10 border-red-400/20',
  'Art Rock':   'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Folk':       'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'R&B Soul':   'text-pink-400 bg-pink-400/10 border-pink-400/20',
  'R&B':        'text-pink-400 bg-pink-400/10 border-pink-400/20',
  'Pop':        'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Electronic': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  'Jazz':       'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'Classical':  'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'Hip-Hop':    'text-lime-400 bg-lime-400/10 border-lime-400/20',
  'Rock':       'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Lo-fi':      'text-teal-400 bg-teal-400/10 border-teal-400/20',
}

async function fetchItunes(track: Track): Promise<ItunesResult | null> {
  const query = encodeURIComponent(`${track.title} ${track.artist}`)
  const res = await fetch(
    `https://itunes.apple.com/search?term=${query}&entity=song&limit=1&country=KR`,
  )
  const data = (await res.json()) as { resultCount: number; results: ItunesResult[] }
  return data.resultCount > 0 ? data.results[0] : null
}

interface Props {
  playlist: SavedPlaylist
  onClose: () => void
}

export default function PlaylistModal({ playlist, onClose }: Props) {
  const tracks = playlist.tracks as Track[]
  const videos = playlist.videos as Video[]

  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const [itunesLoading, setItunesLoading] = useState(false)
  const [itunesResult, setItunesResult] = useState<ItunesResult | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [manualPlayNeeded, setManualPlayNeeded] = useState(false)
  const [noPreview, setNoPreview] = useState(false)

  // ESC 키로 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (currentAudioRef.current) {
          currentAudioRef.current.pause()
          currentAudioRef.current.src = ''
          currentAudioRef.current = null
        }
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // 모달 열릴 때 바디 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  function stopCurrentAudio() {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.src = ''
      currentAudioRef.current = null
    }
  }

  function handleClose() {
    stopCurrentAudio()
    onClose()
  }

  async function handleTrackClick(track: Track) {
    // 같은 트랙 재클릭 → 정지
    if (activeTrackId === track.id) {
      stopCurrentAudio()
      setActiveTrackId(null)
      setItunesResult(null)
      setIsPlaying(false)
      setNoPreview(false)
      return
    }

    stopCurrentAudio()
    setActiveTrackId(track.id)
    setItunesLoading(true)
    setItunesResult(null)
    setIsPlaying(false)
    setManualPlayNeeded(false)
    setNoPreview(false)

    try {
      const result = await fetchItunes(track)
      setItunesLoading(false)

      // previewUrl 없음 → YouTube lyrics 새 탭 즉시 오픈
      if (!result?.previewUrl) {
        setNoPreview(true)
        const query = encodeURIComponent(`${track.title} ${track.artist} lyrics`)
        window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank')
        return
      }

      setItunesResult(result)

      const audio = new Audio(result.previewUrl)
      currentAudioRef.current = audio
      audio.onended = () => {
        setIsPlaying(false)
        setActiveTrackId(null)
      }

      setIsPlaying(true)
      audio.play().catch(() => {
        setIsPlaying(false)
        setManualPlayNeeded(true)
      })
    } catch {
      setItunesLoading(false)
      setActiveTrackId(null)
    }
  }

  function handleManualPlay() {
    if (!currentAudioRef.current) return
    currentAudioRef.current.play().catch(() => {})
    setIsPlaying(true)
    setManualPlayNeeded(false)
  }

  function openYouTubeLyrics(track: Track) {
    const query = encodeURIComponent(`${track.title} ${track.artist} lyrics`)
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d0d18] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더: 이름 + 카테고리 + 태그 + 닫기 */}
        <div className="flex items-start justify-between border-b border-white/5 p-5">
          <div className="flex-1 pr-4">
            <span className="inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs text-violet-300">
              {playlist.category}
            </span>
            <h2 className="mt-2 text-base font-semibold text-white">{playlist.name}</h2>
            {playlist.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {playlist.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 p-5">
          {/* 트랙 리스트 */}
          {tracks.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <span className="text-violet-400">♪</span> 트랙 ({tracks.length})
              </h3>
              <div className="space-y-1.5">
                {tracks.map((track, idx) => {
                  const isActive = activeTrackId === track.id
                  const isThisLoading = isActive && itunesLoading
                  const isThisNoPreview = isActive && noPreview

                  return (
                    <div
                      key={track.id}
                      onClick={() => void handleTrackClick(track)}
                      className={`group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition-all ${
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
                            onClick={(e) => {
                              e.stopPropagation()
                              handleManualPlay()
                            }}
                          >
                            ▶
                          </span>
                        ) : isThisNoPreview ? (
                          <span className="text-xs text-gray-600">↗</span>
                        ) : (
                          <>
                            <span className="text-xs text-gray-600 group-hover:hidden">
                              {idx + 1}
                            </span>
                            <span className="hidden text-sm text-violet-400 group-hover:block">
                              ▶
                            </span>
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
                          <p className="mt-0.5 truncate text-xs text-gray-600">
                            {itunesResult.collectionName}
                          </p>
                        )}
                      </div>

                      {/* 우측: 장르 배지 or 전체 듣기 or YouTube 링크 */}
                      {isThisNoPreview ? (
                        <span className="shrink-0 text-xs text-blue-400">
                          YouTube에서 듣기 ↗
                        </span>
                      ) : isActive && itunesResult ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openYouTubeLyrics(track)
                          }}
                          className="shrink-0 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-400 transition-all hover:bg-blue-500/20"
                        >
                          전체 듣기 ↗
                        </button>
                      ) : (
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                            GENRE_COLORS[track.genre] ??
                            'border-gray-400/20 bg-gray-400/10 text-gray-400'
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
          )}

          {/* 유튜브 영상 */}
          {videos.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <span className="text-blue-400">▶</span> 유튜브 영상 ({videos.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() =>
                      window.open(
                        `https://www.youtube.com/watch?v=${video.videoId}`,
                        '_blank',
                      )
                    }
                    className="group cursor-pointer overflow-hidden rounded-xl border border-white/5 bg-white/5 transition-all hover:border-blue-500/30 hover:bg-white/[0.08]"
                  >
                    <div className="relative h-24 overflow-hidden bg-gray-900">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-all group-hover:scale-110 group-hover:bg-black/60">
                          <span className="pl-0.5 text-xs text-white">▶</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 text-xs leading-relaxed text-gray-300">
                        {video.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">{video.channel}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
