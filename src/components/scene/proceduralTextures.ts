import { CanvasTexture, ClampToEdgeWrapping, SRGBColorSpace } from "three"
import type { CelestialBodyId } from "../../types/celestial"

type BodyTextureBundle = {
  surface: CanvasTexture
  clouds?: CanvasTexture
}

function createSeededRandom(seed: number) {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

function buildTextureCanvas(size = 1024) {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  return canvas
}

function finalizeTexture(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.needsUpdate = true
  return texture
}

function drawSunTexture() {
  const canvas = buildTextureCanvas()
  const context = canvas.getContext("2d")
  if (!context) {
    return finalizeTexture(canvas)
  }

  const gradient = context.createRadialGradient(512, 512, 40, 512, 512, 512)
  gradient.addColorStop(0, "#fff7a8")
  gradient.addColorStop(0.48, "#ffd866")
  gradient.addColorStop(0.8, "#fb923c")
  gradient.addColorStop(1, "#a16207")
  context.fillStyle = gradient
  context.fillRect(0, 0, 1024, 1024)

  const random = createSeededRandom(11)
  for (let index = 0; index < 140; index += 1) {
    const x = random() * 1024
    const y = random() * 1024
    const radius = 18 + random() * 80
    context.fillStyle = `rgba(255, ${180 + Math.floor(random() * 40)}, 80, ${0.05 + random() * 0.08})`
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  return finalizeTexture(canvas)
}

function drawEarthSurfaceTexture() {
  const canvas = buildTextureCanvas()
  const context = canvas.getContext("2d")
  if (!context) {
    return finalizeTexture(canvas)
  }

  const ocean = context.createLinearGradient(0, 0, 0, 1024)
  ocean.addColorStop(0, "#163b82")
  ocean.addColorStop(0.52, "#2563eb")
  ocean.addColorStop(1, "#082f49")
  context.fillStyle = ocean
  context.fillRect(0, 0, 1024, 1024)

  const random = createSeededRandom(42)
  const landColors = ["#285f34", "#3f7c41", "#5b8c35", "#768f3c", "#8f7a38"]

  for (let index = 0; index < 28; index += 1) {
    const x = random() * 1024
    const y = random() * 1024
    const width = 90 + random() * 220
    const height = 40 + random() * 130
    context.save()
    context.translate(x, y)
    context.rotate(random() * Math.PI * 2)
    context.fillStyle = landColors[index % landColors.length]
    context.beginPath()
    context.ellipse(0, 0, width, height, 0, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  context.fillStyle = "rgba(255,255,255,0.74)"
  context.fillRect(0, 0, 1024, 90)
  context.fillRect(0, 934, 1024, 90)

  return finalizeTexture(canvas)
}

function drawCloudTexture() {
  const canvas = buildTextureCanvas()
  const context = canvas.getContext("2d")
  if (!context) {
    return finalizeTexture(canvas)
  }

  const random = createSeededRandom(88)
  for (let index = 0; index < 120; index += 1) {
    const x = random() * 1024
    const y = random() * 1024
    const width = 20 + random() * 90
    const height = 8 + random() * 36
    context.save()
    context.translate(x, y)
    context.rotate((random() - 0.5) * 0.8)
    context.fillStyle = `rgba(255,255,255,${0.08 + random() * 0.12})`
    context.beginPath()
    context.ellipse(0, 0, width, height, 0, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  return finalizeTexture(canvas)
}

function drawMoonTexture() {
  const canvas = buildTextureCanvas()
  const context = canvas.getContext("2d")
  if (!context) {
    return finalizeTexture(canvas)
  }

  const gradient = context.createLinearGradient(0, 0, 0, 1024)
  gradient.addColorStop(0, "#f1f5f9")
  gradient.addColorStop(0.5, "#cbd5e1")
  gradient.addColorStop(1, "#94a3b8")
  context.fillStyle = gradient
  context.fillRect(0, 0, 1024, 1024)

  const random = createSeededRandom(7)
  for (let index = 0; index < 180; index += 1) {
    const x = random() * 1024
    const y = random() * 1024
    const radius = 4 + random() * 28
    context.fillStyle = `rgba(100,116,139,${0.08 + random() * 0.16})`
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
    context.strokeStyle = "rgba(248,250,252,0.12)"
    context.lineWidth = 1 + random() * 2
    context.stroke()
  }

  return finalizeTexture(canvas)
}

function drawMarsTexture() {
  const canvas = buildTextureCanvas()
  const context = canvas.getContext("2d")
  if (!context) {
    return finalizeTexture(canvas)
  }

  const gradient = context.createLinearGradient(0, 0, 0, 1024)
  gradient.addColorStop(0, "#f97316")
  gradient.addColorStop(0.5, "#c2410c")
  gradient.addColorStop(1, "#7c2d12")
  context.fillStyle = gradient
  context.fillRect(0, 0, 1024, 1024)

  const random = createSeededRandom(19)
  for (let index = 0; index < 90; index += 1) {
    const x = random() * 1024
    const y = random() * 1024
    const width = 40 + random() * 160
    const height = 18 + random() * 80
    context.save()
    context.translate(x, y)
    context.rotate(random() * Math.PI * 2)
    context.fillStyle = `rgba(120,53,15,${0.08 + random() * 0.16})`
    context.beginPath()
    context.ellipse(0, 0, width, height, 0, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  context.fillStyle = "rgba(255,245,240,0.6)"
  context.fillRect(0, 0, 1024, 56)
  context.fillRect(0, 968, 1024, 56)

  return finalizeTexture(canvas)
}

export function createBodyTextures(bodyId: CelestialBodyId): BodyTextureBundle {
  switch (bodyId) {
    case "sun":
      return { surface: drawSunTexture() }
    case "earth":
      return {
        surface: drawEarthSurfaceTexture(),
        clouds: drawCloudTexture(),
      }
    case "moon":
      return { surface: drawMoonTexture() }
    case "mars":
      return { surface: drawMarsTexture() }
    default:
      return { surface: drawMoonTexture() }
  }
}
