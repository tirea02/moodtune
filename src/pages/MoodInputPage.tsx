import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SUGGESTIONS = [
  '🌧️ 비 오는 날 혼자',
  '☀️ 기분 좋은 아침',
  '🌙 잠 못 드는 새벽',
  '💪 운동할 때',
  '😔 조금 외로운 밤',
  '🎉 신나는 파티 분위기',
]

export default function MoodInputPage() {
  const [mood, setMood] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mood.trim()) navigate('/playlist', { state: { mood: mood.trim() } })
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[300px] w-[300px] rounded-full bg-violet-700/20 blur-[80px] sm:-top-60 sm:-left-60 sm:h-[500px] sm:w-[500px] sm:blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[300px] w-[300px] rounded-full bg-blue-700/20 blur-[80px] sm:-bottom-60 sm:-right-60 sm:h-[500px] sm:w-[500px] sm:blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[250px] w-[350px] rounded-full bg-violet-900/10 blur-[70px] sm:h-[400px] sm:w-[600px] sm:blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="mb-12 text-center">
          <span className="mb-4 block text-3xl">🎵</span>
          <h1 className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
            moodtune
          </h1>
          <p className="mt-2 text-xs tracking-[0.3em] text-gray-500 uppercase">
            feel the music
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-3 block text-lg font-medium text-gray-200">
              지금 어떤 기분이야? <span className="text-violet-400">✦</span>
            </label>
            <p className="mb-3 text-sm text-gray-500">
              현재 상황이나 감정을 자유롭게 적어줘. AI가 딱 맞는 음악을 찾아줄게.
            </p>
            <textarea
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="예) 비 오는 밤, 혼자 있고 싶은 기분이야. 조금 우울하지만 차분한 음악이 듣고 싶어..."
              rows={5}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base leading-relaxed text-white placeholder-gray-600 backdrop-blur-sm transition-all duration-200 focus:border-violet-500/50 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-violet-500/30 sm:text-sm"
            />
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setMood(s)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400 transition-all hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300 sm:py-1.5"
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!mood.trim()}
            className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 py-4 font-semibold text-white shadow-lg shadow-violet-900/40 transition-all duration-200 hover:-translate-y-0.5 hover:from-violet-500 hover:to-blue-500 hover:shadow-violet-900/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            내 기분에 맞는 음악 찾기 →
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-600">
          AI가 감정을 분석해 최적의 플레이리스트와 영상을 추천해드려요
        </p>
      </div>
    </div>
  )
}
