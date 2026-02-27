/** 백엔드 DB에 저장된 유저 정보 (/api/auth/login 응답) */
export interface DbUser {
  id: string
  uid: string
  email: string
  displayName: string
  photoURL: string | null
}

/** iTunes Search API 응답 항목 */
export interface ItunesResult {
  artworkUrl100: string
  previewUrl: string | null
  trackViewUrl: string
  trackName: string
  artistName: string
  collectionName: string
}

/** GET /api/playlists/my 및 GET /api/playlists 응답의 플레이리스트 항목 */
export interface SavedPlaylist {
  id: number
  name: string
  description: string
  category: string
  tags: string[]
  tracks: unknown[]
  videos: unknown[]
  isPublic: boolean
  likeCount: number
  playCount: number
  createdAt: string
  /** 공개 피드에서만 포함 (GET /api/playlists) */
  user?: { id: string; displayName: string; photoUrl: string | null }
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
