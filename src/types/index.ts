/** 백엔드 DB에 저장된 유저 정보 (/api/auth/login 응답) */
export interface DbUser {
  id: string
  uid: string
  email: string
  displayName: string
  photoURL: string | null
}

export interface Track {
  id: string
  title: string
  artist: string
  duration?: string
  genre: string
}

export interface Video {
  id: string
  title: string
  channel: string
  videoId: string
  thumbnailUrl: string
}
