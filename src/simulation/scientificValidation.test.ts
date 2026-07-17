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
import { specificAngularMomentum } from "../physics/relativity/validation"
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
  it("parâmetro de impacto satisfaz a definição formal b = L/E do fóton", () => {
    const metric = createSchwarzschildMetric(SOLAR_MASS_KG)
    const b = SOLAR_RADIUS_M
    const state = equatorialStateFromCartesian(metric, -1000 * SOLAR_RADIUS_M, b, 1, 0, "null")

    const impactFromConstants =
      Math.abs(specificAngularMomentum(metric, state)) / specificEnergy(metric, state)
    // b geométrico (offset assintótico) ≡ L/E a menos de correções O(r_s/r₀).
    expect(Math.abs(impactFromConstants - b) / b).toBeLessThan(1e-6)
  })

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

  it("o controle orbital representa a fração da velocidade tangencial LOCAL", () => {
    const fraction = 0.85
    const scenario = createScenario("relativistic-orbit", {
      massSolar: 10,
      impactParameterRs: 0,
      startRadiusRs: 8,
      angularVelocityFraction: fraction,
      spinFraction: 0,
    })
    const state = scenario.initialState
    const r = state[1]
    const lapse = 1 - scenario.schwarzschildRadiusM! / r

    // Na tétrade estática: u^(hat t)=√f u^t e u^(hat φ)=r u^φ;
    // logo v_local/c = u^(hat φ)/u^(hat t).
    const localSpeedOverC = (r * state[7]) / (Math.sqrt(lapse) * state[4])
    const circularLocalSpeedOverC = Math.sqrt(
      scenario.schwarzschildRadiusM! / (2 * (r - scenario.schwarzschildRadiusM!)),
    )

    expect(localSpeedOverC / circularLocalSpeedOverC).toBeCloseTo(fraction, 12)
    expect(normConservationError(scenario.metric, state, "timelike")).toBeLessThan(1e-14)
  })

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
    // r₀ = 200 r_s, quase circular: regime onde a fórmula de campo fraco de
    // Weinberg (Δφ = 6πGM/(c²p)) vale com correção de 2ª ordem ~(3/2)(6M/p) ≈ 2%.
    const scenario = createScenario("relativistic-orbit", {
      massSolar: 10,
      impactParameterRs: 0,
      startRadiusRs: 200,
      angularVelocityFraction: 0.98,
      spinFraction: 0,
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
    // Com periastro INTERPOLADO a resolução é sub-passo; a janela [1,00, 1,04]
    // reflete apenas a correção pós-newtoniana de 2ª ordem (sempre positiva).
    expect(precession!.value / precession!.reference!).toBeGreaterThan(0.99)
    expect(precession!.value / precession!.reference!).toBeLessThan(1.04)
  })

  it("RK4 converge em 4ª ordem: reduzir h à metade reduz o erro ~16×", () => {
    // Órbita EXCÊNTRICA (a circular preserva r em aritmética exata e mede
    // sobretudo arredondamento). Referência de Richardson: h/8 no mesmo λ.
    const r0 = 8 * rs
    const omega = Math.sqrt(rs / (2 * r0 ** 3))
    const uTime = 1 / Math.sqrt(1 - rs / r0 - r0 * r0 * omega * omega)
    const state0 = buildInitialState(
      metric,
      [0, r0, Math.PI / 2, 0],
      [0, 0, 0.9 * omega * uTime],
      "timelike",
    )
    const derivatives = createGeodesicDerivatives(metric)

    const totalLambdaM = 3e6
    const radiusAfter = (stepM: number) => {
      let state = state0
      const steps = Math.round(totalLambdaM / stepM)
      for (let i = 0; i < steps; i += 1) {
        state = rungeKutta4Step(derivatives, state, stepM)
      }
      return state[1]
    }

    const reference = radiusAfter(750)
    const coarseError = Math.abs(radiusAfter(6e3) - reference)
    const fineError = Math.abs(radiusAfter(3e3) - reference)

    // Erro global O(h⁴) ⇒ razão teórica 16; janela ampla cobre efeitos de
    // arredondamento e termos de ordem superior.
    expect(coarseError).toBeGreaterThan(0)
    expect(coarseError / fineError).toBeGreaterThan(8)
    expect(coarseError / fineError).toBeLessThan(32)
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

describe("cenário 9 — atraso de Shapiro (4º teste clássico)", () => {
  it("a baseline de corda reproduz (r_s/c)[ln(4x₁x₂/b²) − 1] dentro de 1%", () => {
    const runner = new GeodesicSimulationRunner(createScenario("shapiro-delay"))
    for (let i = 0; i < 400 && !runner.snapshot().halted; i += 1) {
      runner.advanceLambda(3e9)
    }
    const snapshot = runner.snapshot()
    expect(snapshot.halted).toBe(true)

    const shapiro = snapshot.observables.find((o) => o.id === "shapiro-delay")
    expect(shapiro).toBeDefined()
    expect(shapiro!.value).toBeGreaterThan(0)
    expect(shapiro!.reference).toBeDefined()
    // ~85 µs para o preset solar (b = R☉, x₁ = x₂ = 60·b), baseline de corda.
    expect(shapiro!.value / shapiro!.reference!).toBeGreaterThan(0.99)
    expect(shapiro!.value / shapiro!.reference!).toBeLessThan(1.01)
  })

  it("em 1PN, a diferença em b cancela o termo constante da baseline", () => {
    // Mede o coeficiente (t − corda/c)/(r_s/c) para dois parâmetros de
    // impacto com o MESMO alcance X: a diferença deve ser 2·ln(b₂/b₁),
    // pois as constantes aditivas desta convenção cancelam em ordem 1PN.
    const metric = createSchwarzschildMetric(SOLAR_MASS_KG)
    const rs = metric.schwarzschildRadiusM
    const derivatives = createGeodesicDerivatives(metric)
    const b1 = SOLAR_RADIUS_M
    const b2 = 2 * SOLAR_RADIUS_M
    const X = 60 * b2

    const coefficient = (b: number) => {
      let state = equatorialStateFromCartesian(metric, -X, b, 1, 0, "null")
      const start: [number, number] = [
        state[1] * Math.cos(state[3]),
        state[1] * Math.sin(state[3]),
      ]
      const h = b1 / 100
      for (let i = 0; i < 200000; i += 1) {
        state = rungeKutta4Step(derivatives, state, h)
        if (state[1] > X * 1.02 && state[5] > 0) {
          break
        }
      }
      const end: [number, number] = [
        state[1] * Math.cos(state[3]),
        state[1] * Math.sin(state[3]),
      ]
      const chord = Math.hypot(end[0] - start[0], end[1] - start[1])
      return (state[0] - chord) / rs
    }

    const difference = coefficient(b1) - coefficient(b2)
    expect(Math.abs(difference - 2 * Math.log(b2 / b1)) / (2 * Math.log(2))).toBeLessThan(0.01)
  })
})
