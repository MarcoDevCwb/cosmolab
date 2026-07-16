/**
 * Cenário 6 — Através do horizonte (coordenadas de Painlevé–Gullstrand).
 *
 * Física: a MESMA queda radial do cenário do horizonte, mas na carta
 * regular de Painlevé–Gullstrand. O contraste é a lição inteira:
 *
 * - Em coordenadas de Schwarzschild, t → ∞ no horizonte e a integração
 *   precisa parar em r ≈ r_s (a carta degenera).
 * - Em PG, NADA acontece em r = r_s: a partícula cruza o horizonte com
 *   tempo próprio finito e a integração continua até perto da
 *   singularidade de curvatura em r = 0 — o único limite REAL.
 *
 * No horizonte vale a identidade exata u^r = −E (da norma com f = 0),
 * verificada nos testes. As fatias T = const de PG são euclidianas, então
 * a grade plana da cena é a representação fiel desta carta.
 *
 * Referências: Painlevé (1921); Gullstrand (1922); Martel & Poisson,
 * Am. J. Phys. 69, 476 (2001).
 */

import { GRAVITATIONAL_CONSTANT, SOLAR_MASS_KG, SPEED_OF_LIGHT } from "../../physics/constants"
import { buildInitialState } from "../../physics/relativity/initialConditions"
import { createPainleveGullstrandMetric } from "../../physics/relativity/metrics/painleveGullstrand"
import { createHorizonCrossingTracker } from "../observables"
import type { ExperimentParams, SimulationScenario } from "./types"

/** Duração-alvo da queda na tela [s de tempo real]. */
const FALL_WALL_TIME_S = 25
/** Para perto da singularidade de curvatura (única fronteira real). */
const STOP_RADIUS_IN_RS = 0.05

export function createPainleveInfallScenario(params: ExperimentParams): SimulationScenario {
  const massKg = params.massSolar * SOLAR_MASS_KG
  const metric = createPainleveGullstrandMetric(massKg)
  const rs = metric.schwarzschildRadiusM
  const r0 = params.startRadiusRs * rs

  // Queda completa até r → 0: τ = (π/2)·√(r₀³/(2GM)) (resultado exato da
  // queda radial do repouso; igual à forma newtoniana).
  const properFallTimeS =
    (Math.PI / 2) * Math.sqrt(r0 ** 3 / (2 * GRAVITATIONAL_CONSTANT * massKg))
  const lambdaTotalM = SPEED_OF_LIGHT * properFallTimeS

  return {
    id: "painleve-infall",
    label: "Através do horizonte",
    scientificStatus: "validated",
    references: [
      "Painlevé, P. — C. R. Acad. Sci. 173, 677 (1921)",
      "Gullstrand, A. — Ark. Mat. Astron. Fys. 16, 1 (1922)",
      "Martel & Poisson — Am. J. Phys. 69, 476 (2001)",
    ],
    description:
      "A mesma queda radial, agora em coordenadas de Painlevé–Gullstrand: a partícula CRUZA o horizonte sem nada divergir e segue até perto de r = 0.",
    expectation:
      "O congelamento em r_s era artefato da carta de Schwarzschild; aqui τ segue finito através do horizonte (u^r = −E exato em r = r_s).",

    metric,
    kind: "timelike",
    centralMassKg: massKg,
    schwarzschildRadiusM: rs,

    // Repouso inicial em r₀: a normalização resolve u^T com o termo cruzado.
    initialState: buildInitialState(metric, [0, r0, Math.PI / 2, 0], [0, 0, 0], "timelike"),

    // Adaptativo: passos grandes na queda suave, minúsculos perto de r = 0
    // (curvatura de maré crescendo como 1/r³).
    integrator: { method: "dp54", relTol: 1e-10 },
    stepLambdaM: lambdaTotalM / 7000,
    lambdaRateMPerSecond: lambdaTotalM / FALL_WALL_TIME_S,
    sampleIntervalLambdaM: lambdaTotalM / 400,
    maxSamples: 600,
    renderScaleM: r0 / 5.9,

    // Fatias T = const de PG são EUCLIDIANAS: o plano é a representação fiel.
    surface: "flat",
    horizonRadiusM: rs,
    // Horizonte translúcido: a queda continua visível do lado de dentro.
    horizonOpacity: 0.45,
    stopCondition: (state) => state[1] <= STOP_RADIUS_IN_RS * rs,

    createObservables: () => createHorizonCrossingTracker(rs),
  }
}
