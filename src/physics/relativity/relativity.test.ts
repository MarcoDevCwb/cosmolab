/**
 * Validação do núcleo geométrico: métricas, Christoffels e condições iniciais.
 */

import { describe, expect, it } from "vitest"
import { SOLAR_MASS_KG, schwarzschildRadius } from "../constants"
import { christoffelFromMetric } from "./christoffel"
import { equatorialStateFromCartesian } from "./equatorial"
import { buildInitialState } from "./initialConditions"
import { minkowskiMetric } from "./metrics/minkowski"
import { createSchwarzschildMetric } from "./metrics/schwarzschild"
import { fourVelocityNorm } from "./validation"
import type { Vector4 } from "./tensor"
import { invertMatrix4 } from "./tensor"

describe("métrica de Schwarzschild", () => {
  const massKg = 10 * SOLAR_MASS_KG
  const metric = createSchwarzschildMetric(massKg)
  const rs = metric.schwarzschildRadiusM

  it("tem raio de Schwarzschild r_s = 2GM/c²", () => {
    expect(rs).toBeCloseTo(schwarzschildRadius(massKg), 6)
    // 10 M☉ → r_s ≈ 29,5 km
    expect(rs / 1e3).toBeGreaterThan(29)
    expect(rs / 1e3).toBeLessThan(30)
  })

  it("inversa analítica coincide com inversão numérica de Gauss-Jordan", () => {
    const position: Vector4 = [0, 7.3 * rs, 1.1, 0.4]
    const analytic = metric.inverseMetric(position)
    const numeric = invertMatrix4(metric.metric(position))

    for (let mu = 0; mu < 4; mu += 1) {
      for (let nu = 0; nu < 4; nu += 1) {
        expect(numeric[mu][nu]).toBeCloseTo(analytic[mu][nu], 10)
      }
    }
  })

  it("Christoffels numéricos (diferenças finitas) reproduzem os analíticos", () => {
    const position: Vector4 = [0, 10 * rs, 1.0, 0.7]
    const analytic = metric.christoffel!(position)
    const numeric = christoffelFromMetric(metric, position, [rs, rs, 1, 1])

    for (let mu = 0; mu < 4; mu += 1) {
      for (let alpha = 0; alpha < 4; alpha += 1) {
        for (let beta = 0; beta < 4; beta += 1) {
          const reference = analytic[mu][alpha][beta]
          const scale = Math.max(Math.abs(reference), 1e-12)
          expect(Math.abs(numeric[mu][alpha][beta] - reference) / scale).toBeLessThan(1e-4)
        }
      }
    }
  })
})

describe("condições iniciais normalizadas", () => {
  it("fóton em Minkowski satisfaz g_{μν}u^μu^ν = 0 e u⁰ = 1", () => {
    const state = buildInitialState(minkowskiMetric, [0, -1e8, 3e7, 0], [1, 0, 0], "null")
    expect(state[4]).toBeCloseTo(1, 12)
    expect(Math.abs(fourVelocityNorm(minkowskiMetric, state))).toBeLessThan(1e-12)
  })

  it("partícula massiva em Schwarzschild satisfaz g_{μν}u^μu^ν = -1", () => {
    const metric = createSchwarzschildMetric(SOLAR_MASS_KG)
    const rs = metric.schwarzschildRadiusM
    const state = buildInitialState(metric, [0, 8 * rs, Math.PI / 2, 0], [0, 0, 1e-6 / rs], "timelike")
    expect(fourVelocityNorm(metric, state)).toBeCloseTo(-1, 10)
  })

  it("repouso em Schwarzschild dá u⁰ = 1/√f (dilatação gravitacional)", () => {
    const metric = createSchwarzschildMetric(SOLAR_MASS_KG)
    const rs = metric.schwarzschildRadiusM
    const r0 = 6 * rs
    const state = buildInitialState(metric, [0, r0, Math.PI / 2, 0], [0, 0, 0], "timelike")
    expect(state[4]).toBeCloseTo(1 / Math.sqrt(1 - rs / r0), 10)
  })

  it("montagem equatorial cartesiana preserva a norma nula", () => {
    const metric = createSchwarzschildMetric(SOLAR_MASS_KG)
    const state = equatorialStateFromCartesian(metric, -2e11, 6.957e8, 1, 0, "null")
    expect(Math.abs(fourVelocityNorm(metric, state))).toBeLessThan(1e-10)
  })

  it("velocidade coordenada permanece subluminal mesmo com u¹ > 1", () => {
    // u¹ = dx/dλ pode exceder 1 (é a "velocidade própria"); a velocidade
    // física dx/dt = u¹/u⁰ deve ficar abaixo de c para geodésicas timelike.
    const state = buildInitialState(minkowskiMetric, [0, 0, 0, 0], [1.5, 0, 0], "timelike")
    expect(Math.abs(fourVelocityNorm(minkowskiMetric, state) + 1)).toBeLessThan(1e-12)
    expect(state[4]).toBeCloseTo(Math.sqrt(1 + 1.5 * 1.5), 10)
    expect(state[5] / state[4]).toBeLessThan(1)
  })
})
