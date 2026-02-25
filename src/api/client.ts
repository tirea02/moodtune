/**
 * axios 공통 인스턴스
 *
 * 데이터 흐름:
 * 요청 → interceptor → auth.currentUser?.getIdToken() → Authorization 헤더 주입 → 백엔드
 *
 * 사용법:
 *   import client from './client'
 *   const res = await client.post('/api/playlists', data)
 *
 * 비로그인 상태에서는 헤더 없이 요청 (공개 API는 그대로 동작)
 */
import axios from 'axios'
import { auth } from '../lib/firebase'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

client.interceptors.request.use(async (config) => {
  const token = await auth.currentUser?.getIdToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default client
