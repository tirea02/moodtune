import { useLocation, useNavigate } from 'react-router-dom'
import type { Track, Video } from '../types'

const mockTracks: Track[] = [
  { id: '1', title: 'The Night We Met',          artist: 'Lord Huron',        duration: '3:28', genre: 'Indie Folk' },
  { id: '2', title: 'Sweater Weather',            artist: 'The Neighbourhood', duration: '4:02', genre: 'Indie Rock' },
  { id: '3', title: 'Motion Picture Soundtrack',  artist: 'Radiohead',         duration: '4:50', genre: 'Art Rock'   },
  { id: '4', title: 'Lua',                        artist: 'Bright Eyes',       duration: '4:30', genre: 'Folk'       },
  { id: '5', title: 'Blue Light',                 artist: 'Jhené Aiko',        duration: '3:15', genre: 'R&B Soul'   },
  { id: '6', title: 'Holocene',                   artist: 'Bon Iver',          duration: '5:37', genre: 'Indie Folk' },
]

const mockVideos: Video[] = [
  { id: '1', title: 'Sad Indie playlist for rainy nights 🌧️',   channel: 'lofi vibes',    videoId: 'v1' },
  { id: '2', title: '밤에 혼자 듣기 좋은 감성 팝 모음 2024',          channel: 'Mood Music KR', videoId: 'v2' },
  { id: '3', title: 'Melancholic Bedroom Pop Mix',               channel: 'chill collective', videoId: 'v3' },
  { id: '4', title: '비 오는 날 듣는 재즈 피아노 1시간',               channel: 'Jazz Lounge',   videoId: 'v4' },
]

const VIDEO_GRADIENTS = [
  'from-violet-900 via-purple-900 to-slate-900',
  'from-blue-900 via-indigo-900 to-slate-900',
  'from-fuchsia-900 via-violet-900 to-slate-900',
  'from-cyan-900 via-blue-900 to-slate-900',
]

const GENRE_COLORS: Record<string, string> = {
  'Indie Folk': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  'Indie Rock': 'text-red-400 bg-red-400/10 border-red-400/20',
  'Art Rock':   'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Folk':       'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'R&B Soul':   'text-pink-400 bg-pink-400/10 border-pink-400/20',
}

export default function PlaylistPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const mood: string = state?.mood ?? ''
  const onBack = () => navigate('/')

  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080810]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <button
            onClick={onBack}
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
            <span className="rounded-full border border-violet-500/30 bg-violet-500/20 px-2.5 py-0.5 text-xs font-medium text-violet-300">
              ✦ AI 분석 완료
            </span>
          </div>
          <p className="text-sm leading-relaxed text-gray-300">"{mood}"</p>
          <p className="mt-3 text-xs text-gray-500">
            감성적이고 잔잔한 분위기의 인디 팝 · 포크 계열 음악을 추천해드려요
          </p>
        </div>

        {/* Playlist */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
            <span className="text-violet-400">♪</span> 추천 플레이리스트
          </h2>
          <div className="space-y-2">
            {mockTracks.map((track, idx) => (
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
                <span className="shrink-0 text-xs text-gray-600">{track.duration}</span>
              </div>
            ))}
          </div>
        </section>

        {/* YouTube videos */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
            <span className="text-blue-400">▶</span> 추천 유튜브 영상
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {mockVideos.map((video, idx) => (
              <div
                key={video.id}
                className="group cursor-pointer overflow-hidden rounded-xl border border-white/5 bg-white/5 transition-all hover:border-blue-500/30 hover:bg-white/[0.08]"
              >
                {/* Thumbnail */}
                <div className={`relative h-28 bg-gradient-to-br ${VIDEO_GRADIENTS[idx % VIDEO_GRADIENTS.length]}`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-all group-hover:bg-black/50 group-hover:scale-110">
                      <span className="pl-0.5 text-sm text-white">▶</span>
                    </div>
                  </div>
                </div>
                {/* Info */}
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

        {/* Retry */}
        <div className="text-center">
          <button
            onClick={onBack}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-gray-400 transition-all hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300"
          >
            다른 기분으로 다시 찾기
          </button>
        </div>
      </main>
    </div>
  )
}
