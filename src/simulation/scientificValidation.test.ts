/**
 * Validação científica ponta a ponta do integrador de geodésicas.
 *
 * Cada teste compara a integração numérica (RK4) com um resultado analítico
 * clássico da relatividade geral:
 *
 * 1. Espaço plano: geodésica nula é reta exata.
 * 2. Deflexão da luz pelo Sol: α = 4GM☉/(c²b) ≈ 1,75″ (Weinberg 1972, §8.5).
 * 3. Órbita circular em Schwarzschild: relação kepleriana exata em tempo
 *    coordenado, Ω² = GM/r³ (MTW, ex. 25.19).
 * 4. Queda radial: conservação de E = √f(r₀) e relação (dr/dλ)² = E² - f(r).
 */

import { describe, expect, it } from "vitest"
import {
  GRAVITATIONAL_CONSTANT,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
  SPEED_OF_LIGHT,
} from "../physics/constants"
import {
  angleBetween2D,
  equatorialCartesianDirection,
  equatorialStateFromCartesian,
} from "../physics/relativity/equatorial"
import { createGeodesicDerivatives } from "../physics/relativity/geodesic"
import { buildInitialState } from "../physics/relativity/initialConditions"
import { createSchwarzschildMetric } from "../physics/relativity/metrics/schwarzschild"
import { normConservationError, specificEnergy } from "../physics/relativity/validation"
import { rungeKutta4Step } from "./integrators/rungeKutta4"
import { GeodesicSimulationRunner } from "./simulationRunner"
import { createScenario } from "./scenarios"

describe("cenário 1 — espaço plano", () => {
  it("fóton segue linha reta com norma conservada ao erro de máquina", () => {
    const runner = new GeodesicSimulationRunner(createScenario("flat-space-photon"))
    runner.advanceLambda(8e8)
    const snapshot = runner.snapshot()

    // y e z permanecem exatamente constantes (Christoffels nulos).
    expect(snapshot.position[2]).toBeCloseTo(1e8, 6)
    expect(snapshot.position[3]).toBeCloseTo(0, 12)
    expect(snapshot.validation.normError).toBeLessThan(1e-10)
    // Em Minkowski, x⁰ = λ para fóton com direção unitária: t = λ/c.
    expect(snapshot.coordinateTimeS).toBeCloseTo(snapshot.lambdaM / SPEED_OF_LIGHT, 8)
  })
})

describe("cenário 2 — deflexão da luz pelo Sol", () => {
  it("reproduz α = 4GM☉/(c²b) ≈ 1,75″ dentro de 1%", () => {
    const metric = createSchwarzschildMetric(SOLAR_MASS_KG)
    const b = SOLAR_RADIUS_M
    const startDistance = 1000 * SOLAR_RADIUS_M

    let state = equatorialStateFromCartesian(metric, -startDistance, b, 1, 0, "null")
    const derivatives = createGeodesicDerivatives(metric)
    const initialDirection = equatorialCartesianDirection(state)
    const startRadius = state[1]

    const step = b / 50
    const maxSteps = 400_000
    let steps = 0
    for (; steps < maxSteps; steps += 1) {
      state = rungeKutta4Step(derivatives, state, step)
      // Sai quando volta a ficar mais distante que o ponto de partida, afastando-se.
      if (state[1] > startRadius && state[5] > 0) {
        break
      }
    }
    expect(steps).toBeLessThan(maxSteps)

    const deflection = angleBetween2D(initialDirection, equatorialCartesianDirection(state))
    const theoretical = (2 * metric.schwarzschildRadiusM) / b // = 4GM/(c²b)

    expect(deflection / theoretical).toBeGreaterThan(0.99)
    expect(deflection / theoretical).toBeLessThan(1.01)

    // 1,75 segundos de arco
    const arcseconds = (deflection * 180 * 3600) / Math.PI
    expect(arcseconds).toBeGreaterThan(1.73)
    expect(arcseconds).toBeLessThan(1.77)

    expect(normConservationError(metric, state, "null")).toBeLessThan(1e-8)
  })
})

describe("cenário 3 — órbitas em Schwarzschild", () => {
  const massKg = 10 * SOLAR_MASS_KG
  const metric = createSchwarzschildMetric(massKg)
  const rs = metric.schwarzschildRadiusM

  it("órbita circular em r = 8 r_s obedece Ω² = GM/r³ em tempo coordenado", () => {
    const r0 = 8 * rs
    const omega = Math.sqrt(rs / (2 * r0 ** 3)) // dφ/d(ct)
    const uTime = 1 / Math.sqrt(1 - rs / r0 - r0 * r0 * omega * omega)
    const state0 = buildInitialState(metric, [0, r0, Math.PI / 2, 0], [0, 0, omega * uTime], "timelike")

    const derivatives = createGeodesicDerivatives(metric)
    const step = 2e3
    let state = state0
    let previous = state0
    while (state[3] < 2 * Math.PI) {
      previous = state
      state = rungeKutta4Step(derivatives, state, step)
      // Raio deve permanecer constante (órbita circular).
      expect(Math.abs(state[1] - r0) / r0).toBeLessThan(1e-8)
    }

    // Interpola x⁰ no cruzamento exato de φ = 2π.
    const fraction = (2 * Math.PI - previous[3]) / (state[3] - previous[3])
    const ctAtFullOrbit = previous[0] + fraction * (state[0] - previous[0])
    const coordinatePeriodS = ctAtFullOrbit / SPEED_OF_LIGHT

    const keplerPeriodS =
      2 * Math.PI * Math.sqrt(r0 ** 3 / (GRAVITATIONAL_CONSTANT * massKg))

    expect(coordinatePeriodS / keplerPeriodS).toBeGreaterThan(0.9999)
    expect(coordinatePeriodS / keplerPeriodS).toBeLessThan(1.0001)
  })

  it("precessão medida converge para 6πGM/(c²p) em campo fraco", () => {
    // r₀ = 60 r_s, quase circular: regime onde a fórmula de campo fraco de
    // Weinberg (Δφ = 6πGM/(c²p)) vale com correções O(M/p) ~ 1%.
    const scenario = createScenario("relativistic-orbit", {
      massSolar: 10,
      impactParameterRs: 0,
      startRadiusRs: 60,
      angularVelocityFraction: 0.98,
    })
    const runner = new GeodesicSimulationRunner(scenario)
    const lambdaPerOrbit = scenario.stepLambdaM * 4000

    let precession: { value: number; reference?: number } | undefined
    for (let orbit = 0; orbit < 5 && !precession; orbit += 1) {
      runner.advanceLambda(lambdaPerOrbit)
      const measured = runner
        .snapshot()
        .observables.find(
          (observable) => observable.id === "precession" && Number.isFinite(observable.value),
        )
      if (measured) {
        precession = measured
      }
    }

    expect(precession).toBeDefined()
    expect(precession!.reference).toBeDefined()
    expect(precession!.value).toBeGreaterThan(0)
    // Medição por detecção de periastro tem resolução de ~1 passo de φ;
    // tolerância de 10% cobre isso + as correções pós-newtonianas.
    expect(precession!.value / precession!.reference!).toBeGreaterThan(0.9)
    expect(precession!.value / precession!.reference!).toBeLessThan(1.1)
  })

  it("órbita excêntrica do cenário conserva E, L e norma por várias voltas", () => {
    const runner = new GeodesicSimulationRunner(createScenario("relativistic-orbit"))
    runner.advanceLambda(3e7) // ~5 órbitas
    const snapshot = runner.snapshot()

    expect(snapshot.halted).toBe(false)
    expect(snapshot.validation.normError).toBeLessThan(1e-8)
    expect(snapshot.energyDriftRelative).toBeLessThan(1e-9)
    expect(snapshot.angularMomentumDriftRelative).toBeLessThan(1e-9)
    // Plano equatorial preservado.
    expect(snapshot.position[2]).toBeCloseTo(Math.PI / 2, 10)
  })
})

describe("cenário 4 — horizonte de Schwarzschild", () => {
  it("queda radial conserva E = √f(r₀) e satisfaz (dr/dλ)² = E² - f(r)", () => {
    const runner = new GeodesicSimulationRunner(createScenario("schwarzschild-horizon"))
    const scenario = runner.scenario
    const rs = scenario.schwarzschildRadiusM!
    const r0 = 6 * rs
    const expectedEnergy = Math.sqrt(1 - rs / r0)

    // Avança até parar perto do horizonte (stopCondition em r = 1,02 r_s).
    for (let i = 0; i < 200 && !runner.snapshot().halted; i += 1) {
      runner.advanceLambda(1e5)
    }
    const snapshot = runner.snapshot()

    expect(snapshot.halted).toBe(true)
    expect(snapshot.position[1] / rs).toBeLessThan(1.03)

    // Tempo próprio de queda finito (milissegundos nesta escala de massa).
    expect(snapshot.properTimeS).not.toBeNull()
    expect(snapshot.properTimeS!).toBeGreaterThan(0)
    expect(snapshot.properTimeS!).toBeLessThan(0.1)

    // Constante de Killing conservada durante a queda. Tolerância reflete a
    // rigidez numérica perto do horizonte (f → 0) com RK4 de passo fixo;
    // longe do horizonte a conservação é ~1e-9 (ver teste da órbita).
    expect(Math.abs(snapshot.validation.energy - expectedEnergy)).toBeLessThan(5e-5)

    // Relação analítica da queda radial: (dr/dλ)² = E² - f(r).
    const state = runner.currentState
    const f = 1 - rs / state[1]
    const analyticalRadialSpeed = Math.sqrt(expectedEnergy ** 2 - f)
    expect(Math.abs(-state[5] - analyticalRadialSpeed)).toBeLessThan(1e-4)

    // Congelamento coordenado: dt/dτ = u⁰ = E/f cresce ao se aproximar do horizonte.
    const energyCheck = specificEnergy(scenario.metric, state)
    expect(state[4]).toBeCloseTo(energyCheck / f, 6)
  })
})
