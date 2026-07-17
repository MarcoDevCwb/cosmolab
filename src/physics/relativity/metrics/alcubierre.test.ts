/**
 * Alcubierre: o piloto é geodésico com dτ = dt exato; os Christoffels
 * analíticos batem com as diferenças finitas; o diagnóstico numérico de
 * matéria REDESCOBRE a densidade euleriana do artigo (eq. 19) e acusa a
 * violação da NEC na parede; a fatura escala como β²; e, com β > 1, a nave
 * chega antes do fóton de referência — em coordenadas.
 */

import { describe, expect, it } from "vitest"
import {
  GRAVITATIONAL_CONSTANT,
  SPEED_OF_LIGHT,
} from "../../constants"
import { christoffelFromMetric } from "../christoffel"
import { matterDiagnostic } from "../curvature"
import { buildInitialState } from "../initialConditions"
import { createAlcubierreMetric } from "./alcubierre"
import type { Vector4 } from "../tensor"

const R = 1.2e10 // raio da bolha [m]
const WALL = R / 8 // espessura da parede [m]

describe("métrica de Alcubierre", () => {
  it("f(0) = 1 exato, f decai na parede; g·g⁻¹ = 1 (det g = −1 em toda parte)", () => {
    const metric = createAlcubierreMetric(2, R, WALL)
    expect(metric.shapeAt(0)).toBeCloseTo(1, 12)
    expect(metric.shapeAt(R)).toBeCloseTo(0.5, 2)
    expect(metric.shapeAt(3 * R)).toBeLessThan(1e-8)

    const positions: Vector4[] = [
      [0, 0, 0, 0],
      [0, R, 0.3 * R, -0.2 * R],
      [R / 2, 0.9 * R, R, 0.1 * R],
      [2 * R, 5 * R, 0, 0],
    ]
    for (const position of positions) {
      const g = metric.metric(position)
      const gInv = metric.inverseMetric(position)
      for (let mu = 0; mu < 4; mu += 1) {
        for (let nu = 0; nu < 4; nu += 1) {
          let product = 0
          for (let rho = 0; rho < 4; rho += 1) {
            product += g[mu][rho] * gInv[rho][nu]
          }
          expect(Math.abs(product - (mu === nu ? 1 : 0))).toBeLessThan(1e-12)
        }
      }
    }
  })

  it("Christoffels analíticos ≡ diferenças finitas (ponto genérico fora do eixo)", () => {
    const metric = createAlcubierreMetric(1.7, R, WALL)
    const position: Vector4 = [0.13 * R, 0.85 * R, 0.4 * R, -0.25 * R]
    const analytic = metric.christoffel!(position)
    const numeric = christoffelFromMetric(metric, position, [R, R, R, R])

    let maxScale = 0
    for (let mu = 0; mu < 4; mu += 1) {
      for (let a = 0; a < 4; a += 1) {
        for (let b = 0; b < 4; b += 1) {
          maxScale = Math.max(maxScale, Math.abs(analytic[mu][a][b]))
        }
      }
    }
    expect(maxScale).toBeGreaterThan(0)
    for (let mu = 0; mu < 4; mu += 1) {
      for (let a = 0; a < 4; a += 1) {
        for (let b = 0; b < 4; b += 1) {
          expect(
            Math.abs(numeric[mu][a][b] - analytic[mu][a][b]) / maxScale,
          ).toBeLessThan(1e-5)
        }
      }
    }
  })

  it("o piloto no centro tem u = (1, β, 0, 0): norma −1 exata ⇒ dτ = dt (sem paradoxo)", () => {
    for (const beta of [0.5, 1, 2]) {
      const metric = createAlcubierreMetric(beta, R, WALL)
      const state = buildInitialState(metric, [0, 0, 0, 0], [beta, 0, 0], "timelike")
      expect(state[4]).toBeCloseTo(1, 12) // u⁰ = 1 ⇒ dτ/dt = 1
      expect(state[5]).toBeCloseTo(beta, 12)
    }
  })

  it("REDESCOBERTA: T(n,n) numérico ≡ densidade euleriana analítica (eq. 19), NEC violada", () => {
    // β = 2 no ponto lateral da parede (x = x_c, y = R): g_tt = β²f² − 1 = 0
    // ⇒ nem estático nem ZAMO existem — só o observador EULERIANO.
    const beta = 2
    const metric = createAlcubierreMetric(beta, R, WALL)
    const wallPoint: Vector4 = [0, 0, R, 0]

    const analytic = metric.eulerianDensityJm3(wallPoint)
    expect(analytic).toBeLessThan(0) // energia NEGATIVA na parede

    const matter = matterDiagnostic(metric, wallPoint, [R, R, R, R])
    expect(matter).not.toBeNull()
    expect(matter!.observer).toBe("eulerian")
    expect(Math.abs(matter!.energyDensityJm3 - analytic) / Math.abs(analytic)).toBeLessThan(1e-3)
    // Matéria exótica: NEC violada na parede (amostragem de 134 direções).
    expect(matter!.nullEnergyConditionOk).toBe(false)
    expect(matter!.necMinimumJm3).toBeLessThan(0)

    // Interior e exterior: quase-vácuo — o perfil tanh deixa curvatura
    // RESIDUAL no centro (f″(0) ∝ σ²·sech²(σR) ≠ 0), ordens de grandeza
    // abaixo da parede. A afirmação honesta é a razão, não vácuo exato.
    const inside = matterDiagnostic(metric, [0, 0, 0, 0], [R, R, R, R])
    expect(inside).not.toBeNull()
    expect(Math.abs(inside!.energyDensityJm3 / analytic)).toBeLessThan(1e-4)
    const outside = matterDiagnostic(metric, [0, 6 * R, 0, 0], [R, R, R, R])
    expect(outside).not.toBeNull()
    expect(Math.abs(outside!.energyDensityJm3 / analytic)).toBeLessThan(1e-4)
  })

  it("a fatura escala como β² e bate com a estimativa de parede fina −c⁴β²R²σ/(36G)", () => {
    const metricSlow = createAlcubierreMetric(1, R, WALL)
    const metricFast = createAlcubierreMetric(2, R, WALL)

    expect(metricSlow.exoticEnergyJ).toBeLessThan(0)
    expect(metricFast.exoticEnergyJ / metricSlow.exoticEnergyJ).toBeCloseTo(4, 6)

    // Estimativa analítica para σR ≫ 1: E ≈ −c⁴β²R²σ/(36G) (σR = 8 aqui).
    const sharpWall =
      -(SPEED_OF_LIGHT ** 4 * R * R) / (36 * GRAVITATIONAL_CONSTANT * WALL)
    expect(Math.abs(metricSlow.exoticEnergyJ - sharpWall) / Math.abs(sharpWall)).toBeLessThan(
      0.05,
    )
  })
})

describe("cenário 11 — bolha warp", () => {
  it("β = 1,8: a nave permanece no centro, dτ = dt, e chega ANTES do fóton (em coordenadas)", async () => {
    const { GeodesicSimulationRunner } = await import("../../../simulation/simulationRunner")
    const { createScenario, DEFAULT_EXPERIMENT_PARAMS } = await import(
      "../../../simulation/scenarios"
    )

    const params = DEFAULT_EXPERIMENT_PARAMS["warp-bubble"]
    const scenario = createScenario("warp-bubble", params)
    const journeyM = params.startRadiusRs * 60 * SPEED_OF_LIGHT
    const runner = new GeodesicSimulationRunner(scenario)

    const chunk = journeyM / params.spinFraction / 60
    for (let i = 0; i < 200 && !runner.snapshot().halted; i += 1) {
      runner.advanceLambda(chunk)
    }
    const snapshot = runner.snapshot()

    expect(snapshot.halted).toBe(true)
    expect(snapshot.haltReason).toBe("stop-condition")

    // Chegada em ct = D/β < D: em coordenadas, venceu o fóton de referência.
    expect(snapshot.position[0]).toBeLessThan(journeyM)
    expect((snapshot.position[0] * params.spinFraction) / journeyM).toBeCloseTo(1, 2)

    // A nave nunca saiu do centro da bolha (fração ínfima do raio R).
    const bubbleRadius = scenario.bubbleRadiusM!
    const offCenter = Math.abs(
      snapshot.position[1] - params.spinFraction * snapshot.position[0],
    )
    expect(offCenter / bubbleRadius).toBeLessThan(1e-6)

    // dτ = dt: o "salto ao futuro" é ZERO (contraste com buracos negros).
    expect(Math.abs(snapshot.futureTravelS!)).toBeLessThan(1e-6 * snapshot.coordinateTimeS)
    expect(snapshot.validation.normError).toBeLessThan(1e-8)

    // Observáveis: velocidade medida ≈ β; envelhecimento ≈ 1.
    const speed = snapshot.observables.find((o) => o.id === "warp-speed")!
    const aging = snapshot.observables.find((o) => o.id === "warp-aging")!
    const exotic = snapshot.observables.find((o) => o.id === "warp-exotic-mass")!
    expect(speed.value).toBeCloseTo(params.spinFraction, 6)
    expect(aging.value).toBeCloseTo(1, 8)
    expect(exotic.value).toBeLessThan(0)
  })
})
