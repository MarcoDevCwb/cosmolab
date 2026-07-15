/**
 * Construção de geometria (Three.js) da superfície de imersão de Flamm.
 *
 * Camada de RENDERIZAÇÃO: toda a física vem de physics/ —
 * `flammEmbeddingHeight` (forma do funil) e `schwarzschildLapse`
 * (dilatação temporal que define as cores). Aqui só se constroem buffers.
 */

import { BufferGeometry, Float32BufferAttribute } from "three"
import { flammEmbeddingHeight } from "../../physics/relativity/embedding"
import { schwarzschildLapse } from "../../physics/relativity/metrics/schwarzschild"

/** Raio da malha de imersão, em unidades de cena. */
export const SURFACE_RIM_UNITS = 11

const SURFACE_RINGS = 44
const SURFACE_SPOKES = 72

/** Cor base da malha longe da massa (azul profundo). */
const SURFACE_BASE_RGB = [0.08, 0.23, 0.72] as const
/** Cor da malha onde a dilatação temporal é extrema (violeta quente). */
const SURFACE_HOT_RGB = [0.86, 0.5, 1.0] as const

/**
 * Malha de arame do paraboloide de Flamm: anéis (r constante) + raios
 * (φ constante), com amostragem radial quadrática (mais densa perto do
 * horizonte, onde a curvatura se concentra).
 *
 * A COR de cada vértice codifica a dilatação temporal gravitacional
 * 1 − √f(r): azul onde relógios correm normais, violeta brilhante onde o
 * tempo quase congela — um mapa de calor físico, não decorativo.
 * Para r_s = 0 a superfície é o plano (Minkowski/carta plana).
 */
export function buildFlammWireframe(
  schwarzschildRadiusM: number,
  renderScaleM: number,
): BufferGeometry {
  const rimRadiusM = SURFACE_RIM_UNITS * renderScaleM
  const rimHeightM = flammEmbeddingHeight(schwarzschildRadiusM, rimRadiusM)
  const innerRadiusM = Math.max(schwarzschildRadiusM * 1.0005, rimRadiusM * 1e-4)

  const radiusAt = (ringIndex: number) => {
    const t = ringIndex / SURFACE_RINGS
    return innerRadiusM + (rimRadiusM - innerRadiusM) * t * t
  }
  const heightAt = (radiusM: number) =>
    (flammEmbeddingHeight(schwarzschildRadiusM, radiusM) - rimHeightM) / renderScaleM

  // Dilatação 1 − √f realçada para leitura visual (γ 0,55 — apenas estética;
  // a grandeza física subjacente vem de schwarzschildLapse).
  const dilationAt = (radiusM: number) => {
    const lapse = schwarzschildLapse(schwarzschildRadiusM, radiusM)
    if (schwarzschildRadiusM <= 0) {
      return 0
    }
    return Math.min((1 - Math.sqrt(lapse)) ** 0.55 * 1.15, 1)
  }

  const positions: number[] = []
  const colors: number[] = []
  const pushVertex = (radiusM: number, phi: number) => {
    positions.push(
      (radiusM / renderScaleM) * Math.cos(phi),
      heightAt(radiusM),
      (radiusM / renderScaleM) * Math.sin(phi),
    )
    const mix = dilationAt(radiusM)
    const glow = 1 + mix * 1.6
    colors.push(
      (SURFACE_BASE_RGB[0] + (SURFACE_HOT_RGB[0] - SURFACE_BASE_RGB[0]) * mix) * glow,
      (SURFACE_BASE_RGB[1] + (SURFACE_HOT_RGB[1] - SURFACE_BASE_RGB[1]) * mix) * glow,
      (SURFACE_BASE_RGB[2] + (SURFACE_HOT_RGB[2] - SURFACE_BASE_RGB[2]) * mix) * glow,
    )
  }
  const pushSegment = (r1: number, phi1: number, r2: number, phi2: number) => {
    pushVertex(r1, phi1)
    pushVertex(r2, phi2)
  }

  for (let ring = 0; ring <= SURFACE_RINGS; ring += 1) {
    const r = radiusAt(ring)
    for (let spoke = 0; spoke < SURFACE_SPOKES; spoke += 1) {
      const phi1 = (spoke / SURFACE_SPOKES) * Math.PI * 2
      const phi2 = ((spoke + 1) / SURFACE_SPOKES) * Math.PI * 2
      pushSegment(r, phi1, r, phi2)
    }
  }

  for (let spoke = 0; spoke < SURFACE_SPOKES; spoke += 2) {
    const phi = (spoke / SURFACE_SPOKES) * Math.PI * 2
    for (let ring = 0; ring < SURFACE_RINGS; ring += 1) {
      pushSegment(radiusAt(ring), phi, radiusAt(ring + 1), phi)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3))
  return geometry
}

/**
 * Anel de raio constante desenhado SOBRE a superfície de imersão
 * (esfera de fótons, ISCO, ergosfera...).
 */
export function buildSurfaceRingPoints(
  schwarzschildRadiusM: number,
  renderScaleM: number,
  ringRadiusM: number,
  segments = 96,
): [number, number, number][] {
  const rimHeightM = flammEmbeddingHeight(schwarzschildRadiusM, SURFACE_RIM_UNITS * renderScaleM)
  const y =
    (flammEmbeddingHeight(schwarzschildRadiusM, ringRadiusM) - rimHeightM) / renderScaleM
  const radiusUnits = ringRadiusM / renderScaleM

  return Array.from({ length: segments + 1 }, (_, i) => {
    const phi = (i / segments) * Math.PI * 2
    return [radiusUnits * Math.cos(phi), y, radiusUnits * Math.sin(phi)] as [
      number,
      number,
      number,
    ]
  })
}
