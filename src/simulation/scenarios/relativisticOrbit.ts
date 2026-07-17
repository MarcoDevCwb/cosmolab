/**
 * Cenário 3 — Órbita relativística em torno de massa ajustável.
 *
 * Física: perto de poucas dezenas de r_s, órbitas ligadas deixam de ser
 * elipses fechadas: o periastro precessa a cada volta (mesmo efeito dos
 * 43″/século de Mercúrio, amplificado). Precessão por órbita quase-elíptica
 * (Weinberg 1972, §8.6):
 *
 *   Δφ ≈ 6πGM / [c² a (1 - e²)]
 *
 * Parâmetros do experimento: r₀ (em r_s) e a fração da velocidade tangencial
 * LOCAL medida por um observador estático no raio inicial. 1,0 = velocidade
 * da órbita circular (Ω² = GM/r³ em tempo coordenado — MTW ex. 25.19);
 * < 1 produz uma órbita excêntrica ou, abaixo da barreira do potencial,
 * mergulho. Abaixo da ISCO (r = 3 r_s) não há órbita circular ESTÁVEL.
 */

import { GRAVITATIONAL_CONSTANT, SOLAR_MASS_KG, SPEED_OF_LIGHT } from "../../physics/constants"
import { keplerEllipse } from "../../physics/newtonian/kepler"
import { buildInitialState } from "../../physics/relativity/initialConditions"
import { createSchwarzschildMetric } from "../../physics/relativity/metrics/schwarzschild"
import { createPrecessionTracker } from "../observables"
import type { ExperimentParams, SimulationScenario } from "./types"

/** Duração-alvo de uma órbita na tela [s de tempo real]. */
const ORBIT_WALL_TIME_S = 6

/**
 * dφ/d(ct) da órbita circular: ω̃ = √(r_s / (2 r³)) [1/m], pois GM/c² = r_s/2.
 */
function circularAngularVelocityPerMeter(schwarzschildRadiusM: number, radiusM: number): number {
  return Math.sqrt(schwarzschildRadiusM / (2 * radiusM ** 3))
}

export function createRelativisticOrbitScenario(params: ExperimentParams): SimulationScenario {
  const massKg = params.massSolar * SOLAR_MASS_KG
  const metric = createSchwarzschildMetric(massKg)
  const rs = metric.schwarzschildRadiusM
  const r0 = params.startRadiusRs * rs

  // Velocidade circular LOCAL medida pela tétrade do observador estático:
  //   (v_circ/c)² = M/(r - 2M) = (r_s/2)/(r-r_s).
  // Para uma velocidade local v, u^(hat t)=γ e u^(hat φ)=γv; portanto,
  // nas coordenadas (ct,r,θ,φ), u^φ = γv/r. Essa construção faz o slider
  // representar exatamente a grandeza anunciada na UI, em vez de escalar
  // u^φ (ou L) e apenas aproximar a fração de velocidade.
  const omega = circularAngularVelocityPerMeter(rs, r0)
  const lapseMinusRotation = 1 - rs / r0 - r0 * r0 * omega * omega
  if (lapseMinusRotation <= 0) {
    throw new Error(
      "Não existe órbita circular (nem de referência) em r ≤ 1,5 r_s: escolha raio inicial maior.",
    )
  }
  const localCircularSpeedOverC = Math.sqrt(rs / (2 * (r0 - rs)))
  const localSpeedOverC = params.angularVelocityFraction * localCircularSpeedOverC
  if (!(Math.abs(localSpeedOverC) < 1)) {
    throw new Error(
      "A velocidade tangencial local deve ser menor que c: reduza a fração da órbita circular.",
    )
  }
  const lorentzFactor = 1 / Math.sqrt(1 - localSpeedOverC * localSpeedOverC)
  const uPhi = (lorentzFactor * localSpeedOverC) / r0

  // buildInitialState recuperará u^t = γ/√(1-r_s/r₀) pela normalização.

  // Período kepleriano coordenado T = 2π√(r³/GM) define as escalas de λ.
  const gm = GRAVITATIONAL_CONSTANT * massKg
  const coordinatePeriodS = 2 * Math.PI * Math.sqrt(r0 ** 3 / gm)
  const lambdaPerOrbitM = SPEED_OF_LIGHT * coordinatePeriodS

  // Contraste newtoniano: elipse fechada com a mesma FRAÇÃO da velocidade
  // circular newtoniana. As velocidades absolutas não são identificadas em
  // campo forte, pois "velocidade local" depende do observador na RG.
  const tangentialVelocity = params.angularVelocityFraction * Math.sqrt(gm / r0)
  const newtonianEllipse = keplerEllipse(gm, r0, tangentialVelocity)

  return {
    id: "relativistic-orbit",
    label: "Órbita relativística",
    scientificStatus: "validated",
    references: [
      "Weinberg, S. — Gravitation and Cosmology (1972), §8.6",
      "Misner, Thorne & Wheeler — Gravitation (1973), ex. 25.19",
      "Goldstein — Classical Mechanics (3ª ed.), cap. 3 (elipse de Kepler)",
    ],
    description:
      "Partícula massiva com raio e velocidade tangencial local ajustáveis: 100% = órbita circular; menos = roseta de precessão ou mergulho; a ISCO fica em 3 r_s.",
    expectation: "Roseta de precessão: Δφ ≈ 6πGM/[c²a(1-e²)] por órbita.",

    metric,
    kind: "timelike",
    centralMassKg: massKg,
    schwarzschildRadiusM: rs,

    initialState: buildInitialState(metric, [0, r0, Math.PI / 2, 0], [0, 0, uPhi], "timelike"),

    stepLambdaM: lambdaPerOrbitM / 4000,
    lambdaRateMPerSecond: lambdaPerOrbitM / ORBIT_WALL_TIME_S,
    sampleIntervalLambdaM: lambdaPerOrbitM / 280,
    maxSamples: 1400,
    renderScaleM: r0 / 4.7,

    // Escape (fração > 1): encerra ao sair da região de interesse.
    stopCondition: (state) => state[1] > 40 * r0,

    createObservables: () => createPrecessionTracker(metric, rs),

    comparisonPath: newtonianEllipse
      ? { label: "Órbita de Newton (fechada)", points: newtonianEllipse }
      : undefined,
  }
}
