/**
 * Gemini 감정 분석 — 백엔드 프록시를 통해 호출
 *
 * 데이터 흐름:
 *   analyzeMood(mood) → POST /api/proxy/analyze → 서버가 Gemini API 호출 → GeminiResult 반환
 *
 * GEMINI_API_KEY는 서버 환경변수에서만 사용 (프론트 번들 미포함)
 */
import client from './client'
import type { Track } from '../types'

export interface GeminiResult {
  analysis: string
  tracks: Omit<Track, 'id' | 'duration'>[]
  videoQueries: string[]
}

export async function analyzeMood(mood: string): Promise<GeminiResult> {
  const res = await client.post<GeminiResult>('/api/proxy/analyze', { mood })
  return res.data
}
