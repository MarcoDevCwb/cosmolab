/**
 * Cenário 11 — Bolha warp (Alcubierre): a geometria mais cara do universo.
 *
 * O piloto parte em x = 0 dentro de uma bolha warp rumo ao destino em x = D.
 * Quatro fatos honestos, todos medidos pelo motor (nenhum "efeito especial"):
 *
 * 1. O centro da bolha é uma GEODÉSICA: o piloto viaja em queda livre
 *    (aceleração própria zero) enquanto a bolha o carrega — até mais rápido
 *    que o fóton de referência quando β > 1;
 * 2. dτ = dt EXATO no centro: sem dilatação do tempo, sem paradoxo dos
 *    gêmeos — o card "salto ao futuro" marca zero, em contraste direto com
 *    os cenários de buraco negro;
 * 3. "Superluminal" é afirmação de COORDENADAS: localmente nenhum fóton é
 *    ultrapassado (a luz DENTRO da bolha continua mais rápida que o piloto);
 * 4. A FATURA: a parede exige densidade de energia NEGATIVA (NEC violada,
 *    verificada numericamente via G_μν nos testes) — a massa exótica total
 *    é exibida em M☉, e cresce com β² e com o tamanho da bolha.
 *
 * Status: TEÓRICO como solução das equações de Einstein (a métrica é exata);
 * a matéria-fonte requerida é considerada não-física (Ford & Roman 1996).
 *
 * Sliders: spinFraction → β = v_bolha/c; startRadiusRs → D em minutos-luz.
 * A bolha tem R = D/15 e parede R/8 (grande o bastante para aparecer em
 * cena; o custo exibido refere-se a ESTA bolha, não à de 100 m do artigo).
 */

import { SPEED_OF_LIGHT } from "../../physics/constants"
import { buildInitialState } from "../../physics/relativity/initialConditions"
import { createAlcubierreMetric } from "../../physics/relativity/metrics/alcubierre"
import { createWarpTracker } from "../observables"
import type { ExperimentParams, SimulationScenario } from "./types"

/** Um minuto-luz [m]. */
const LIGHT_MINUTE_M = 60 * SPEED_OF_LIGHT

export function createWarpBubbleScenario(params: ExperimentParams): SimulationScenario {
  const beta = Math.min(Math.max(params.spinFraction, 0.05), 3)
  const journeyM = Math.min(Math.max(params.startRadiusRs, 1), 60) * LIGHT_MINUTE_M
  const bubbleRadiusM = journeyM / 15
  const wallWidthM = bubbleRadiusM / 8

  const metric = createAlcubierreMetric(beta, bubbleRadiusM, wallWidthM)

  // Piloto no centro da bolha com u = (1, β, 0, 0) — norma −1 exata; o
  // solver quadrático devolve u⁰ = 1 (verificado nos testes).
  const initialState = buildInitialState(metric, [0, 0, 0, 0], [beta, 0, 0], "timelike")

  // Como dτ = dt no centro: λ = c·τ = x⁰, e a viagem dura λ = D/β.
  const lambdaTotalM = journeyM / beta
  const playbackSeconds = 26

  return {
    id: "warp-bubble",
    label: "Warp — Alcubierre",
    scientificStatus: "theoretical",
    references: [
      "Alcubierre, M. — Class. Quantum Grav. 11, L73 (1994)",
      "Ford, L. & Roman, T. — Phys. Rev. D 53, 5496 (1996)",
      "Everett, A. — Phys. Rev. D 53, 7365 (1996)",
      "van den Broeck, C. — Class. Quantum Grav. 16, 3973 (1999)",
      "Lentz, E. — Class. Quantum Grav. 38, 075015 (2021)",
    ],
    description:
      "O piloto cruza a distância em queda livre DENTRO da bolha: dτ = dt (sem paradoxo dos gêmeos) e, com β > 1, chega antes do fóton de referência — em coordenadas. O preço, medido pelo motor: densidade de energia NEGATIVA na parede (NEC violada).",
    expectation:
      "Chegada em t = D/(βc); envelhecimento do piloto 1:1; fatura de massa exótica ∝ β² e ao tamanho da bolha.",

    metric,
    kind: "timelike",
    centralMassKg: null,
    schwarzschildRadiusM: null,

    initialState,

    integrator: { method: "dp54", relTol: 1e-10 },
    stepLambdaM: lambdaTotalM / 4000,
    lambdaRateMPerSecond: lambdaTotalM / playbackSeconds,
    sampleIntervalLambdaM: lambdaTotalM / 380,
    maxSamples: 900,
    renderScaleM: journeyM / 6,

    surface: "flat",
    bubbleRadiusM,
    // FD dos diagnósticos na escala da bolha (não em |x| ~ minutos-luz).
    diagnosticScaleM: [bubbleRadiusM, bubbleRadiusM, bubbleRadiusM, bubbleRadiusM],

    // Corrida contra a luz: fóton de referência partindo junto, em linha
    // reta no vácuo distante (x = c·t), parando no destino.
    comovingMarkers: [
      { xM: 0, yM: 0, label: "partida" },
      { xM: journeyM, yM: 0, label: "chegada" },
      {
        xM: 0,
        yM: 0,
        label: "fóton",
        worldline: (ct: number) => [Math.min(Math.max(ct, 0), journeyM), 0],
      },
    ],

    stopCondition: (state) => state[1] >= journeyM,

    createObservables: () => createWarpTracker(metric, [...initialState]),
  }
}
