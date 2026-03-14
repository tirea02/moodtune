/**
 * YouTube 영상 검색 — 백엔드 프록시를 통해 호출
 *
 * 데이터 흐름:
 *   searchVideos(queries) → POST /api/proxy/youtube → 서버가 YouTube Data API v3 호출 → Video[] 반환
 *
 * YOUTUBE_API_KEY는 서버 환경변수에서만 사용 (프론트 번들 미포함)
 */
import client from './client'
import type { Video } from '../types'

export async function searchVideos(queries: string[]): Promise<Video[]> {
  const res = await client.post<Video[]>('/api/proxy/youtube', { queries })
  return res.data
}
