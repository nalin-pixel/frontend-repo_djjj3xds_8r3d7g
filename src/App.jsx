import { useState } from 'react'
import Spline from '@splinetool/react-spline'

function App() {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      <header className="absolute top-0 left-0 w-full pointer-events-none select-none z-10">
        <div className="mx-auto max-w-5xl px-6 py-6 flex items-center justify-between opacity-90">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
            3D Scene
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">Powered by Spline</p>
        </div>
      </header>

      <main className="relative flex-1">
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center z-0">
            <div className="text-gray-300 text-sm">Loading 3D scene…</div>
          </div>
        )}
        <div className="relative h-full w-full">
          <Spline
            className="h-full w-full"
            scene="https://prod.spline.design/6ZJvLCYOtJk9gDC6/scene.splinecode"
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
