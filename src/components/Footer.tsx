/**
 * 공통 푸터
 *
 * - 모바일: pb-20 (하단 탭바 64px + 여유 공간)
 * - 데스크탑: pb-8
 */
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/5 pb-20 pt-8 sm:pb-10">
      <div className="mx-auto max-w-3xl px-4">
        {/* 로고 + 소개 */}
        <div className="mb-4 flex items-baseline gap-2">
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-sm font-bold text-transparent">
            MoodTune
          </span>
          <span className="text-xs text-gray-600">— AI 기반 감정 플레이리스트</span>
        </div>

        {/* 링크 */}
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <a
            href="mailto:tirea02@gmail.com"
            className="text-xs text-gray-500 transition-colors hover:text-gray-300"
          >
            tirea02@gmail.com
          </a>
          <span className="cursor-default text-xs text-gray-600 hover:text-gray-400 transition-colors">
            개인정보처리방침
          </span>
          <span className="cursor-default text-xs text-gray-600 hover:text-gray-400 transition-colors">
            이용약관
          </span>
        </div>

        {/* 고지 */}
        <p className="mb-1.5 text-xs text-gray-600">
          본 서비스는 포트폴리오 목적으로 제작되었습니다.
        </p>
        <p className="text-xs text-gray-700">© 2026 MoodTune. All rights reserved.</p>
      </div>
    </footer>
  )
}
