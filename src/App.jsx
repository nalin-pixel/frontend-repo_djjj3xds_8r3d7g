import { useEffect, useRef } from 'react'

function App() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    let width = 0
    let height = 0
    let rafId
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const rect = containerRef.current.getBoundingClientRect()
      width = Math.max(320, Math.floor(rect.width))
      height = Math.max(360, Math.floor(rect.height))
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const onResize = () => {
      resize()
    }

    window.addEventListener('resize', onResize)
    resize()

    // Cylinder parameters
    const segments = 200 // ultra-smooth
    const radius = Math.min(width, height) * 0.22
    const halfH = Math.min(width, height) * 0.28

    // Camera setup
    const camDist = radius * 3.2
    const fov = 1.2 // projection scale factor

    // Lights (cinematic environment): warm key, cool fill, rim
    const lights = [
      { dir: normalize([ 0.5, -0.2,  1.0]), color: [1.0, 0.92, 0.85], intensity: 1.0 }, // warm key
      { dir: normalize([-0.6, -0.1,  0.3]), color: [0.82, 0.90, 1.0], intensity: 0.55 }, // cool fill
      { dir: normalize([ 0.0,  0.4, -1.0]), color: [0.95, 0.98, 1.0], intensity: 0.35 }, // back rim
    ]

    const ambient = [0.08, 0.09, 0.1]

    // Specular parameters for brushed metal
    const specularStrength = 0.9
    const shininess = 80 // high for tight highlight

    let start = performance.now()

    function loop(now) {
      const t = (now - start) / 1000
      // Dynamic rotation
      const rotY = t * 0.6
      const rotX = Math.sin(t * 0.3) * 0.15

      // Clear background with cinematic gradient
      const g = ctx.createLinearGradient(0, 0, 0, height)
      g.addColorStop(0, '#0f172a') // slate-900
      g.addColorStop(1, '#111827') // gray-900
      ctx.fillStyle = g
      ctx.fillRect(0, 0, width, height)

      // soft vignette
      vignette(ctx, width, height)

      // draw ground reflection hint
      groundGlow(ctx, width, height)

      // Build faces
      const faces = []
      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2
        const a1 = ((i + 1) / segments) * Math.PI * 2

        // 3D vertices of a vertical quad (side surface)
        const v00 = rotate([ radius * Math.cos(a0), -halfH, radius * Math.sin(a0) ], rotX, rotY)
        const v01 = rotate([ radius * Math.cos(a0),  halfH, radius * Math.sin(a0) ], rotX, rotY)
        const v10 = rotate([ radius * Math.cos(a1), -halfH, radius * Math.sin(a1) ], rotX, rotY)
        const v11 = rotate([ radius * Math.cos(a1),  halfH, radius * Math.sin(a1) ], rotX, rotY)

        // Face center and normal (before rotation normal is [cos(mid), 0, sin(mid)])
        const amid = (a0 + a1) * 0.5
        const n = rotate([ Math.cos(amid), 0, Math.sin(amid) ], rotX, rotY)

        // Back-face culling lightly (only draw if facing camera somewhat)
        if (n[2] > -0.2) {
          // Depth for painter's algorithm
          const depth = (v00[2] + v01[2] + v10[2] + v11[2]) * 0.25

          // Lighting
          const pos = [
            (v00[0] + v01[0] + v10[0] + v11[0]) * 0.25,
            (v00[1] + v01[1] + v10[1] + v11[1]) * 0.25,
            depth,
          ]
          const viewDir = normalize([ -pos[0], -pos[1], camDist - pos[2] ])

          const lambertColor = [...ambient]
          let spec = 0
          for (const L of lights) {
            const ndotl = Math.max(0, dot(n, negate(L.dir)))
            // tonal metal response with slight anisotropy along height using brushed factor
            const brushed = 0.85 + 0.15 * Math.abs(Math.sin((i / segments) * Math.PI * 8))
            lambertColor[0] += L.color[0] * L.intensity * ndotl * brushed
            lambertColor[1] += L.color[1] * L.intensity * ndotl * brushed
            lambertColor[2] += L.color[2] * L.intensity * ndotl * brushed

            // Blinn-Phong specular
            const h = normalize(add(negate(L.dir), viewDir))
            const ndoth = Math.max(0, dot(n, h))
            spec += Math.pow(ndoth, shininess) * L.intensity
          }
          spec = Math.min(1, spec) * specularStrength

          // Metal base color (brushed aluminum)
          const base = [0.78, 0.80, 0.84]

          // Mix base with lambert
          const col = [
            base[0] * lambertColor[0],
            base[1] * lambertColor[1],
            base[2] * lambertColor[2],
          ]

          // Metallic specular tinting (slightly colored by lights sum)
          const specTint = [0,0,0]
          for (const L of lights) {
            specTint[0] += L.color[0] * L.intensity
            specTint[1] += L.color[1] * L.intensity
            specTint[2] += L.color[2] * L.intensity
          }
          const specCol = [
            col[0] + spec * (0.6 * specTint[0] + 0.4),
            col[1] + spec * (0.6 * specTint[1] + 0.4),
            col[2] + spec * (0.6 * specTint[2] + 0.4),
          ]

          // Subtle vertical brush lines using noise based on angle and height
          const lineNoise = 0.04 * Math.sin(amid * 40 + t * 2) * (0.3 + 0.7 * Math.abs(n[0]))
          const finalCol = [
            clamp(specCol[0] + lineNoise, 0, 1),
            clamp(specCol[1] + lineNoise, 0, 1),
            clamp(specCol[2] + lineNoise, 0, 1),
          ]

          // Project to screen
          const p00 = project(v00, camDist, fov, width, height)
          const p01 = project(v01, camDist, fov, width, height)
          const p10 = project(v10, camDist, fov, width, height)
          const p11 = project(v11, camDist, fov, width, height)

          // store face
          faces.push({ depth, p: [p00, p10, p11, p01], color: finalCol })
        }
      }

      // Sort faces by depth (far to near)
      faces.sort((a, b) => a.depth - b.depth)

      // Draw faces
      for (const f of faces) {
        const [r, g, b] = f.color.map(v => Math.round(v * 255))
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.beginPath()
        ctx.moveTo(f.p[0][0], f.p[0][1])
        for (let i = 1; i < f.p.length; i++) ctx.lineTo(f.p[i][0], f.p[i][1])
        ctx.closePath()
        ctx.fill()
      }

      // Top and bottom ellipses for realism with slight rim light
      drawCaps(ctx, radius, halfH, rotX, rotY, camDist, fov, width, height, lights)

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      <header className="absolute top-0 left-0 w-full pointer-events-none select-none">
        <div className="mx-auto max-w-5xl px-6 py-6 flex items-center justify-between opacity-90">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
            Photoreal Metal Cylinder
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">200 faces • PBR-style lighting • Dynamic highlights</p>
        </div>
      </header>
      <div ref={containerRef} className="flex-1 grid place-items-center p-4">
        <canvas ref={canvasRef} className="rounded-xl shadow-2xl ring-1 ring-white/10 bg-black/60"/>
      </div>
      <footer className="w-full py-4 text-center text-xs text-gray-400">
        Drag to rotate (coming next) • Auto animated
      </footer>
    </div>
  )
}

// ---------- Math utils ----------
function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2] }
function add(a, b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]] }
function negate(a) { return [-a[0], -a[1], -a[2]] }
function len(a) { return Math.hypot(a[0], a[1], a[2]) }
function normalize(a) { const L = len(a) || 1; return [a[0]/L, a[1]/L, a[2]/L] }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function rotate(v, rx, ry) {
  // rotate around X, then Y
  const cx = Math.cos(rx), sx = Math.sin(rx)
  const cy = Math.cos(ry), sy = Math.sin(ry)
  // X rotation
  let y = v[1] * cx - v[2] * sx
  let z = v[1] * sx + v[2] * cx
  let x = v[0]
  // Y rotation
  const x2 = x * cy + z * sy
  const z2 = -x * sy + z * cy
  return [x2, y, z2]
}

function project(v, camDist, fov, width, height) {
  const z = v[2] + camDist
  const s = fov * camDist / (z)
  const x = width / 2 + v[0] * s
  const y = height / 2 + v[1] * s
  return [x, y]
}

function vignette(ctx, w, h) {
  const rad = Math.max(w, h)
  const g = ctx.createRadialGradient(w/2, h/2, rad*0.2, w/2, h/2, rad*0.9)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = g
  ctx.fillRect(0,0,w,h)
}

function groundGlow(ctx, w, h) {
  const g = ctx.createLinearGradient(0, h*0.6, 0, h)
  g.addColorStop(0, 'rgba(50,120,255,0.0)')
  g.addColorStop(1, 'rgba(50,120,255,0.12)')
  ctx.fillStyle = g
  ctx.fillRect(0, h*0.6, w, h*0.4)
}

function drawCaps(ctx, radius, halfH, rx, ry, camDist, fov, width, height, lights) {
  // approximate ellipse by sampling points
  const steps = 64
  const caps = [
    { y: -halfH, rim: 0.35 }, // top
    { y:  halfH, rim: 0.20 }, // bottom
  ]

  for (const cap of caps) {
    const pts = []
    const nTop = rotate([0, cap === caps[0] ? -1 : 1, 0], rx, ry) // normal pointing out

    // compute simple lighting for cap
    let shade = 0.12
    for (const L of lights) {
      const ndotl = Math.max(0, dot(nTop, negate(L.dir)))
      shade += ndotl * L.intensity * 0.6
    }
    shade = clamp(shade, 0, 1)

    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2
      const v = rotate([ radius * Math.cos(a), cap.y, radius * Math.sin(a) ], rx, ry)
      pts.push(project(v, camDist, fov, width, height))
    }

    // subtle rim light color
    const c = Math.round(180 + 40 * shade)
    ctx.strokeStyle = `rgba(${c}, ${c}, ${c}, ${cap.rim})`
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.stroke()
  }
}

export default App
