/**
 * Khan–Penrose: as quatro regiões batem com as formas exatas; o VÁCUO da
 * região de interação é verificado numericamente — e foi o próprio motor
 * que ARBITROU o fator conforme (o candidato algébrico alternativo, com o
 * limite correto nas regiões I–III, falha o teste de vácuo por 7–9 ordens
 * de grandeza medidas); K diverge rumo à singularidade; o colapso chega em tempo
 * próprio finito com anisotropia de Kasner.
 */

import { describe, expect, it } from "vitest"
import { christoffelFromMetric } from "../christoffel"
import { curvatureInvariants, matterDiagnostic } from "../curvature"
import { buildInitialState } from "../initialConditions"
import { createKhanPenroseMetric } from "./khanPenrose"
import type { Vector4 } from "../tensor"

const A = 3e8 // escala focal [m]
const metric = createKhanPenroseMetric(A)
const scale: Vector4 = [0.05 * A, 0.05 * A, 0.05 * A, 0.05 * A]

/** 4-posição a partir das coordenadas nulas adimensionais (u, v). */
const positionAt = (u: number, v: number, x = 0, y = 0): Vector4 => [
  ((u + v) * A) / Math.SQRT2,
  x,
  y,
  ((v - u) * A) / Math.SQRT2,
]

describe("métrica de Khan–Penrose", () => {
  it("região I é Minkowski EXATO; região II é a onda impulsiva de Rosen", () => {
    const flat = metric.metric(positionAt(-0.3, -0.2))
    expect(flat[0][0]).toBe(-1)
    expect(flat[1][1]).toBe(1)
    expect(flat[2][2]).toBe(1)
    expect(flat[3][3]).toBe(1)

    // Região II (u = 0.4, v < 0): ds² = −dx⁰²+dz² + (1−u)²dx² + (1+u)²dy².
    const u = 0.4
    const g = metric.metric(positionAt(u, -0.1))
    expect(g[0][0]).toBeCloseTo(-1, 10)
    expect(g[3][3]).toBeCloseTo(1, 10)
    expect(g[1][1]).toBeCloseTo((1 - u) ** 2, 10)
    expect(g[2][2]).toBeCloseTo((1 + u) ** 2, 10)
  })

  it("Christoffels analíticos ≡ diferenças finitas na região de interação", () => {
    const position = positionAt(0.45, 0.3, 0.02 * A, -0.01 * A)
    const analytic = metric.christoffel!(position)
    const numeric = christoffelFromMetric(metric, position, scale)

    let maxScale = 0
    for (let m = 0; m < 4; m += 1)
      for (let a2 = 0; a2 < 4; a2 += 1)
        for (let b = 0; b < 4; b += 1)
          maxScale = Math.max(maxScale, Math.abs(analytic[m][a2][b]))
    expect(maxScale).toBeGreaterThan(0)
    for (let m = 0; m < 4; m += 1)
      for (let a2 = 0; a2 < 4; a2 += 1)
        for (let b = 0; b < 4; b += 1)
          expect(Math.abs(numeric[m][a2][b] - analytic[m][a2][b]) / maxScale).toBeLessThan(1e-6)
  })

  it("ARBITRAGEM PELO MOTOR: (pq+uv)² é vácuo na região IV; (pq−uv)² NÃO é", () => {
    const wrong = createKhanPenroseMetric(A, "minus")
    for (const [u, v] of [
      [0.25, 0.25],
      [0.5, 0.2],
      [0.6, 0.6],
    ] as const) {
      const position = positionAt(u, v, 0.05 * A, -0.03 * A)
      const good = matterDiagnostic(metric, position, scale)
      const bad = matterDiagnostic(wrong, position, scale)
      expect(good).not.toBeNull()
      expect(bad).not.toBeNull()
      // A forma de 1971 passa no selo de vácuo (tolerância de maré local);
      // a alternativa exige matéria 7–9 ordens acima do ruído (piso: ≥100×).
      expect(good!.vacuum).toBe(true)
      expect(bad!.vacuum).toBe(false)
      expect(Math.abs(bad!.energyDensityJm3 / good!.energyDensityJm3)).toBeGreaterThan(100)
    }
  })

  it("K (invariante) DIVERGE rumo à singularidade u² + v² → 1 — e aqui é real", () => {
    const kFar = Math.abs(curvatureInvariants(metric, positionAt(0.3, 0.3), scale).kretschmann)
    const kNear = Math.abs(curvatureInvariants(metric, positionAt(0.62, 0.62), scale).kretschmann)
    expect(kFar).toBeGreaterThan(0)
    expect(kNear / kFar).toBeGreaterThan(100)
  })

  it("anisotropia de Kasner: √g_xx cai e √g_yy cresce na interação", () => {
    const early = metric.transverseStretchAt(positionAt(0.2, 0.2))
    const late = metric.transverseStretchAt(positionAt(0.55, 0.55))
    expect(early.x).toBeLessThan(1)
    expect(late.x).toBeLessThan(early.x)
    expect(late.y).toBeGreaterThan(early.y)
    expect(late.y).toBeGreaterThan(1)
    // Área própria = W: produto = fator de área.
    const W = metric.areaFactorAt(positionAt(0.55, 0.55))
    expect(late.x * late.y).toBeCloseTo(W, 10)
  })

  it("p_x = g_xx·u^x é conservado (∂_x é Killing) através das DUAS frentes", async () => {
    const { rungeKutta4Step } = await import("../../../simulation/integrators/rungeKutta4")
    const { createGeodesicDerivatives } = await import("../geodesic")

    const derivatives = createGeodesicDerivatives(metric)
    // Partícula com velocidade transversal, partindo da região I.
    let state = buildInitialState(metric, [-0.35 * A, 0, 0, 0], [0.3, 0, 0], "timelike")
    const pX = () => metric.metric([state[0], state[1], state[2], state[3]])[1][1] * state[5]
    const p0 = pX()

    // Fase 1: cruza as duas frentes IMPULSIVAS (métrica C⁰: Γ salta e o
    // RK4 perde ordem localmente — custo ~1e-4 por cruzamento, do impulso,
    // não do interior).
    const step = A / 6000
    let insideP = Number.NaN
    for (let i = 0; i < 8000; i += 1) {
      state = rungeKutta4Step(derivatives, state, step)
      const W = metric.areaFactorAt([state[0], state[1], state[2], state[3]])
      if (Number.isNaN(insideP)) {
        const { u, v } = metric.nullCoordinatesAt([state[0], state[1], state[2], state[3]])
        if (u > 0.1 && v > 0.1) {
          insideP = pX() // referência já DENTRO da região IV
        }
      }
      if (W < 0.3) {
        break
      }
    }
    const { u, v } = metric.nullCoordinatesAt([state[0], state[1], state[2], state[3]])
    expect(u).toBeGreaterThan(0)
    expect(v).toBeGreaterThan(0)
    // Custo total do impulso limitado…
    expect(Math.abs(pX() - p0) / Math.abs(p0)).toBeLessThan(1e-3)
    // …e conservação LIMPA no interior suave da região de interação.
    expect(Math.abs(pX() - insideP) / Math.abs(insideP)).toBeLessThan(1e-8)
  })
})

describe("cenário 13 — colisão de ondas", () => {
  it("o observador central colapsa em τ finito; W cai monotonicamente; anel congelado em coordenadas", async () => {
    const { GeodesicSimulationRunner } = await import("../../../simulation/simulationRunner")
    const { createScenario, DEFAULT_EXPERIMENT_PARAMS } = await import(
      "../../../simulation/scenarios"
    )

    const scenario = createScenario(
      "colliding-waves",
      DEFAULT_EXPERIMENT_PARAMS["colliding-waves"],
    )
    const runner = new GeodesicSimulationRunner(scenario)

    let lastW = Infinity
    let monotoneAfterCollision = true
    for (let i = 0; i < 300 && !runner.snapshot().halted; i += 1) {
      runner.advanceLambda((1.45 * A) / 200)
      const snapshot = runner.snapshot()
      const wObservable = snapshot.observables.find((o) => o.id === "collision-area-factor")!
      if (snapshot.position[0] > 0.05 * A) {
        if (wObservable.value > lastW + 1e-12) {
          monotoneAfterCollision = false
        }
        lastW = wObservable.value
      }
    }

    const finalSnapshot = runner.snapshot()
    expect(finalSnapshot.halted).toBe(true)
    expect(finalSnapshot.haltReason).toBe("stop-condition")
    expect(monotoneAfterCollision).toBe(true)
    // Colapso: W chegou ao limiar de parada.
    const W = finalSnapshot.observables.find((o) => o.id === "collision-area-factor")!
    expect(W.value).toBeLessThan(0.05)
    // τ finito e da ordem de a/c (~1 s para a = 1 segundo-luz).
    expect(finalSnapshot.properTimeS!).toBeGreaterThan(0.3)
    expect(finalSnapshot.properTimeS!).toBeLessThan(2)
    // Norma conservada cruzando as frentes IMPULSIVAS: a métrica é C⁰ ali
    // (curvatura delta), então o RK4 perde ordem localmente — ~1e-5 é o
    // custo físico do impulso, não erro do integrador no interior.
    expect(finalSnapshot.validation.normError).toBeLessThan(1e-4)
    // Anel: coordenadas congeladas (Killing) a menos do chute numérico das
    // frentes impulsivas (~2e-4·a) — desprezível ante os fatores próprios,
    // que mudam por ×5–10.
    expect(finalSnapshot.companionPositions).toHaveLength(16)
    const ringRadius = 0.25 * A
    finalSnapshot.companionPositions.forEach((position, index) => {
      const angle = (2 * Math.PI * index) / 16
      expect(Math.abs(position[1] - ringRadius * Math.cos(angle))).toBeLessThan(1e-3 * A)
      expect(Math.abs(position[2] - ringRadius * Math.sin(angle))).toBeLessThan(1e-3 * A)
    })
    // Mas as DISTÂNCIAS PRÓPRIAS divergiram: estiramento em y ≫ compressão em x.
    const stretchX = finalSnapshot.observables.find((o) => o.id === "collision-stretch-x")!
    const stretchY = finalSnapshot.observables.find((o) => o.id === "collision-stretch-y")!
    expect(stretchX.value).toBeLessThan(0.2)
    expect(stretchY.value).toBeGreaterThan(2)
  })
})
