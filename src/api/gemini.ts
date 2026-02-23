import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Track } from '../types'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

export interface GeminiResult {
  analysis: string
  tracks: Omit<Track, 'id' | 'duration'>[]
  videoQueries: string[]
}

export async function analyzeMood(mood: string): Promise<GeminiResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `You are a music recommendation AI. Analyze the user's mood and recommend music.

User's mood/situation: "${mood}"

Respond ONLY with valid JSON (no markdown, no code blocks, no explanation):
{
  "analysis": "한국어로 작성한 감성 분석 (1-2문장, 따뜻하고 공감하는 톤으로)",
  "tracks": [
    { "title": "Song Title", "artist": "Artist Name", "genre": "Genre" },
    { "title": "Song Title", "artist": "Artist Name", "genre": "Genre" },
    { "title": "Song Title", "artist": "Artist Name", "genre": "Genre" },
    { "title": "Song Title", "artist": "Artist Name", "genre": "Genre" },
    { "title": "Song Title", "artist": "Artist Name", "genre": "Genre" },
    { "title": "Song Title", "artist": "Artist Name", "genre": "Genre" }
  ],
  "videoQueries": [
    "YouTube search query 1",
    "YouTube search query 2",
    "YouTube search query 3",
    "YouTube search query 4"
  ]
}

Recommend 6 diverse tracks that match the mood. VideoQueries should be specific YouTube search terms for playlists or mixes matching the mood (mix Korean and English queries naturally).`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Gemini가 markdown 코드블록으로 감쌀 경우 제거
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  return JSON.parse(cleaned) as GeminiResult
}
