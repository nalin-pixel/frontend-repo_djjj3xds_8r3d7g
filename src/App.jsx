import { useEffect, useRef, useState } from 'react'
import Spline from '@splinetool/react-spline'

function App() {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const timeoutRef = useRef(null)

  useEffect(() => {
    // Failsafe: if scene doesn't load within 8s, show message
    timeoutRef.current = setTimeout(() => {
      if (!loaded) setError('The 3D scene is taking longer than usual to load. This can happen if the Spline CDN is blocked on your network. Try refreshing or using a different connection.')
    }, 8000)
    return () => clearTimeout(timeoutRef.current)
  }, [loaded])

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      <header className="absolute top-0 left-0 w-full pointer-events-none select-none z-10">
        <div className="mx-auto max-w-5xl px-6 py-6 flex items-center justify-between opacity-90">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
            Interactive 3D
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">Powered by Spline</p>
        </div>
      </header>

      <main className="relative flex-1 min-h-[80vh]">
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center z-0">
            <div className="flex flex-col items-center gap-3 text-gray-300">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
              <div className="text-sm">Loading 3D scene…</div>
              {error && <div className="max-w-md text-center text-xs text-gray-400">{error}</div>}
            </div>
          </div>
        )}
        <div className="absolute inset-0">
          <Spline
            className="h-full w-full"
            // Demo public scene. Replace with your own for a custom model.
            scene="https://prod.spline.design/UZbZ9L5r0qT3q3dF/scene.splinecode"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </main>

      <footer className="w-full py-4 text-center text-xs text-gray-400">
        Drag to orbit • Scroll to zoom • Double‑click to focus
      </footer>
    </div>
  )
}

export default App
