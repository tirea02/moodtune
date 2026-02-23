import type { Video } from '../types'

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY
const BASE_URL = 'https://www.googleapis.com/youtube/v3'

export async function searchVideos(queries: string[]): Promise<Video[]> {
  const results = await Promise.all(
    queries.map(async (query, idx) => {
      const url = `${BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${API_KEY}`
      const res = await fetch(url)

      if (!res.ok) {
        throw new Error(`YouTube API error: ${res.status}`)
      }

      const data = await res.json()

      if (!data.items?.length) return null

      const item = data.items[0]
      const video: Video = {
        id: String(idx),
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        videoId: item.id.videoId,
        thumbnailUrl:
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          '',
      }
      return video
    }),
  )

  return results.filter(Boolean) as Video[]
}
