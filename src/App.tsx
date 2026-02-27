import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import MoodInputPage from './pages/MoodInputPage'
import PlaylistPage from './pages/PlaylistPage'
import MyPlaylistsPage from './pages/MyPlaylistsPage'
import FeedPage from './pages/FeedPage'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#080810] text-white">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MoodInputPage />} />
            <Route path="/playlist" element={<PlaylistPage />} />
            <Route path="/my-playlists" element={<MyPlaylistsPage />} />
            <Route path="/feed" element={<FeedPage />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  )
}

export default App
