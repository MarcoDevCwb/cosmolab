/**
 * Construção de condições iniciais fisicamente consistentes.
 *
 * O integrador exige que a quadrivelocidade inicial satisfaça exatamente a
 * condição de normalização (assinatura -,+,+,+; λ = c·τ para massivas):
 *
 *   fóton (geodésica nula):        g_{μν} u^μ u^ν = 0
 *   partícula massiva (timelike):  g_{μν} u^μ u^ν = -1
 *
 * Dadas as componentes espaciais (u¹, u², u³), resolvemos g_{μν}u^μu^ν = ε
 * para u⁰ > 0 (movimento para o futuro). Para métricas diagonais nas
 * coordenadas usadas aqui (Minkowski, Schwarzschild) a equação é quadrática
 * pura em u⁰:
 *
 *   g_00 (u⁰)² + Σᵢ g_ii (uⁱ)² = ε   ⇒   u⁰ = √[(Σᵢ g_ii (uⁱ)² - ε)/(-g_00)]
 *
 * Métricas com termos cruzados g_{0i} (ex.: Kerr em Boyer–Lindquist) exigirão
 * a resolução da quadrática completa — o termo linear é incluído abaixo para
 * já suportar esse caso.
 */

import type { SpacetimeMetric } from "./metric"
import type { GeodesicState } from "./geodesic"
import { makeGeodesicState } from "./geodesic"
import type { Vector4 } from "./tensor"

export type GeodesicKind = "null" | "timelike"

/** Norma alvo ε: 0 para fótons, -1 para partículas massivas (λ = c·τ). */
export function targetNorm(kind: GeodesicKind): number {
  return kind === "null" ? 0 : -1
}

/**
 * Resolve u⁰ da condição g_{μν}u^μu^ν = ε e devolve o estado inicial completo.
 * Lança erro se as componentes espaciais forem incompatíveis com a condição
 * (ex.: velocidade espacial superluminal para uma partícula massiva).
 */
export function buildInitialState(
  metric: SpacetimeMetric,
  position: Vector4,
  spatialVelocity: [number, number, number],
  kind: GeodesicKind,
): GeodesicState {
  const g = metric.metric(position)
  const u: Vector4 = [0, spatialVelocity[0], spatialVelocity[1], spatialVelocity[2]]

  // g_00 (u⁰)² + 2 g_{0i} uⁱ u⁰ + g_{ij} uⁱ uʲ - ε = 0
  const a = g[0][0]
  let b = 0
  let c = -targetNorm(kind)
  for (let i = 1; i < 4; i += 1) {
    b += 2 * g[0][i] * u[i]
    for (let j = 1; j < 4; j += 1) {
      c += g[i][j] * u[i] * u[j]
    }
  }

  // Caso degenerado g_00 = 0 (ex.: PG no horizonte; Alcubierre com β·f = 1):
  // a quadrática vira linear e u⁰ = −c/b é a única solução.
  const scale = Math.abs(b) + Math.abs(c) + 1
  let root: number
  if (Math.abs(a) < 1e-14 * scale) {
    if (b === 0) {
      throw new Error(
        "Condições iniciais inconsistentes: nenhuma quadrivelocidade real satisfaz a norma exigida.",
      )
    }
    root = -c / b
  } else {
    const discriminant = b * b - 4 * a * c
    if (discriminant < 0) {
      throw new Error(
        "Condições iniciais inconsistentes: nenhuma quadrivelocidade real satisfaz a norma exigida.",
      )
    }
    // Com g_00 < 0, a raiz positiva (futuro-dirigida) é (−b − √Δ)/(2a).
    // Com g_00 > 0 (t espacial, ex.: bolha superluminal) ambas as raízes
    // podem ser futuras; tomamos a menor e, se não-positiva, a outra.
    root = (-b - Math.sqrt(discriminant)) / (2 * a)
    if (!(root > 0)) {
      root = (-b + Math.sqrt(discriminant)) / (2 * a)
    }
  }
  if (!(root > 0)) {
    throw new Error("Condições iniciais inválidas: quadrivelocidade não é futuro-dirigida.")
  }

  u[0] = root
  return makeGeodesicState(position, u)
}
