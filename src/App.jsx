import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

function ThreeScene() {
  const containerRef = useRef(null)
  const rendererRef = useRef(null)
  const animationRef = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Sizes
    const width = container.clientWidth
    const height = container.clientHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Scene
    const scene = new THREE.Scene()

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(3, 2, 5)
    scene.add(camera)

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)

    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(3, 5, 4)
    dir.castShadow = true
    dir.shadow.mapSize.set(1024, 1024)
    scene.add(dir)

    // Ground
    const groundGeo = new THREE.PlaneGeometry(20, 20)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f0f12, metalness: 0.2, roughness: 0.8 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1
    ground.receiveShadow = true
    scene.add(ground)

    // Cylinder (replacement for previous custom canvas cylinder)
    const cylGeo = new THREE.CylinderGeometry(0.9, 0.9, 2.2, 128, 1, false)
    const cylMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#6ee7ff'),
      metalness: 0.95,
      roughness: 0.1,
      transmission: 0.0,
      reflectivity: 1.0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.2
    })
    const cylinder = new THREE.Mesh(cylGeo, cylMat)
    cylinder.castShadow = true
    cylinder.receiveShadow = true
    scene.add(cylinder)

    // Decorative ring
    const ringGeo = new THREE.TorusGeometry(1.1, 0.03, 32, 200)
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x1b1f3b, metalness: 0.6, roughness: 0.2 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.y = 0.8
    ring.castShadow = true
    scene.add(ring)

    // Background gradient via big sphere
    const bgGeo = new THREE.SphereGeometry(50, 64, 64)
    const bgMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color('#0b0b0e') },
        bottomColor: { value: new THREE.Color('#0f172a') }
      },
      vertexShader: `
        varying vec3 vPos;
        void main(){
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor; uniform vec3 bottomColor;
        varying vec3 vPos;
        void main(){
          float t = smoothstep(-50.0, 50.0, vPos.y);
          vec3 col = mix(bottomColor, topColor, t);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    })
    const bg = new THREE.Mesh(bgGeo, bgMat)
    scene.add(bg)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 0, 0)
    controls.minDistance = 2
    controls.maxDistance = 12

    // Resize
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
    window.addEventListener('resize', onResize)

    // Animation loop
    const clock = new THREE.Clock()
    const tick = () => {
      const t = clock.getElapsedTime()
      cylinder.rotation.y = t * 0.4
      ring.rotation.x = Math.sin(t * 0.6) * 0.2
      ring.rotation.z = t * 0.3
      controls.update()
      renderer.render(scene, camera)
      animationRef.current = requestAnimationFrame(tick)
    }
    tick()

    // Cleanup
    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      cylGeo.dispose(); cylMat.dispose()
      ringGeo.dispose(); ringMat.dispose()
      groundGeo.dispose(); groundMat.dispose()
      bgGeo.dispose(); bgMat.dispose()
      renderer.dispose()
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="h-full w-full" />
  )
}

function App() {
  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      <header className="absolute top-0 left-0 w-full pointer-events-none select-none z-10">
        <div className="mx-auto max-w-5xl px-6 py-6 flex items-center justify-between opacity-90">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
            Interactive 3D (Three.js)
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">Drag to orbit • Scroll to zoom • Double‑click to focus</p>
        </div>
      </header>

      <main className="relative flex-1 min-h-[80vh]">
        <div className="absolute inset-0">
          <ThreeScene />
        </div>
      </main>

      <footer className="w-full py-4 text-center text-xs text-gray-400">
        Built with Three.js and OrbitControls
      </footer>
    </div>
  )
}

export default App
