import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MoodInputPage from './pages/MoodInputPage'
import PlaylistPage from './pages/PlaylistPage'

function App() {
  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MoodInputPage />} />
          <Route path="/playlist" element={<PlaylistPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
