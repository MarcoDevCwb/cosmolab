/**
 * Cenário 13 — Colisão de ondas gravitacionais (Khan–Penrose 1971).
 *
 * A não-linearidade da gravidade em estado puro: duas ondas planas
 * impulsivas, cada uma INOFENSIVA sozinha (as regiões atravessadas por uma
 * onda só são planas), colidem e criam uma SINGULARIDADE de curvatura —
 * sem massa, sem matéria, gravidade gerando gravidade até o colapso.
 *
 * O que se vê e se mede:
 *
 * 1. Um anel de 16 geodésicas no plano transverso (as ondas viajam pelo
 *    eixo vertical da cena). Nas coordenadas de Rosen usadas as posições
 *    coordenadas CONGELAM (∂_x, ∂_y são Killing) — o que muda é a métrica;
 *    a cena desenha DISTÂNCIAS PRÓPRIAS (√g_xx·x, √g_yy·y), como no FLRW;
 * 2. A CONTAGEM REGRESSIVA: o fator de área W = 1 − u² − v² cai de 1 a 0;
 *    o painel também estima o tempo próprio restante até a singularidade;
 * 3. O aperto ANISOTRÓPICO (tipo Kasner): √g_xx → 0 (compressão em x)
 *    enquanto √g_yy → ∞ (estiramento em y) — espaguetificação por pura
 *    gravidade;
 * 4. K (Kretschmann) divergindo ao vivo no painel de invariantes — aqui,
 *    ao contrário do horizonte de Schwarzschild, a divergência é REAL.
 *
 * Curiosidade profunda: a região de interação é localmente isométrica ao
 * INTERIOR de Schwarzschild (Ferrari & Ibañez 1987) — colidir duas ondas
 * fabrica, geometricamente, o interior de um buraco negro.
 */

import { SPEED_OF_LIGHT } from "../../physics/constants"
import { buildInitialState } from "../../physics/relativity/initialConditions"
import { createKhanPenroseMetric } from "../../physics/relativity/metrics/khanPenrose"
import type { KhanPenroseMetric } from "../../physics/relativity/metrics/khanPenrose"
import type { GeodesicState } from "../../physics/relativity/geodesic"
import type { ObservableTracker, ScenarioObservable } from "../observables"
import type { ExperimentParams, SimulationScenario } from "./types"

/** Escala focal a [m]: 1 segundo-luz (toda a física escala com a). */
const FOCAL_SCALE_M = SPEED_OF_LIGHT
const RING_COUNT = 16
/** Início antes da colisão (região I na origem). */
const START_CT_M = -0.4 * FOCAL_SCALE_M
/** Parada perto da singularidade (W abaixo disso ⇒ halt). */
const STOP_AREA_FACTOR = 0.03

export function createCollidingWavesScenario(params: ExperimentParams): SimulationScenario {
  const ringRadiusM =
    Math.min(Math.max(params.startRadiusRs, 0.05), 0.4) * FOCAL_SCALE_M

  const metric = createKhanPenroseMetric(FOCAL_SCALE_M)

  // Observador em repouso na origem (z = 0: permanece em repouso por
  // simetria; o relógio dele é a contagem regressiva).
  const initialState = buildInitialState(metric, [START_CT_M, 0, 0, 0], [0, 0, 0], "timelike")

  // Anel transverso: 16 geodésicas em repouso no plano x–y (z = 0). As
  // coordenadas congelam (Killing); a física aparece nas distâncias
  // próprias — e o runner as integra honestamente mesmo assim.
  const companions: GeodesicState[] = []
  for (let i = 0; i < RING_COUNT; i += 1) {
    const angle = (2 * Math.PI * i) / RING_COUNT
    companions.push(
      buildInitialState(
        metric,
        [START_CT_M, ringRadiusM * Math.cos(angle), ringRadiusM * Math.sin(angle), 0],
        [0, 0, 0],
        "timelike",
      ),
    )
  }

  // Colapso na origem em x⁰ = a (u = v = 1/√2): janela total ≈ 1.4a de x⁰;
  // λ = c·τ ≲ isso (F ≤ 1 na trajetória).
  const lambdaWindowM = 1.45 * FOCAL_SCALE_M

  return {
    id: "colliding-waves",
    label: "Colisão de ondas",
    scientificStatus: "theoretical",
    references: [
      "Khan, K. & Penrose, R. — Nature 229, 185 (1971)",
      "Szekeres, P. — J. Math. Phys. 13, 286 (1972)",
      "Ferrari, V. & Ibañez, J. — Gen. Rel. Grav. 19, 405 (1987)",
      "Griffiths, J. B. — Colliding Plane Waves in General Relativity (1991)",
      "Penrose, R. — Rev. Mod. Phys. 37, 215 (1965)",
    ],
    description:
      "Khan–Penrose (1971): duas ondas planas impulsivas — cada uma inofensiva sozinha — colidem (eixo vertical da cena) e criam uma singularidade REAL em tempo próprio finito. O anel congela em coordenadas; a cena mostra distâncias PRÓPRIAS: compressão em x, estiramento em y (Kasner), K → ∞ no painel.",
    expectation:
      "W = 1−u²−v² cai a 0; colapso do observador central em τ finito (~a/c); anisotropia √g_yy/√g_xx cresce sem limite; região de interação ≅ interior de Schwarzschild.",

    metric,
    kind: "timelike",
    centralMassKg: null,
    schwarzschildRadiusM: null,

    initialState,
    companions,

    integrator: { method: "rk4" },
    stepLambdaM: lambdaWindowM / 8000,
    lambdaRateMPerSecond: lambdaWindowM / 24,
    sampleIntervalLambdaM: lambdaWindowM / 500,
    maxSamples: 600,
    renderScaleM: ringRadiusM / 1.6,

    surface: "flat",
    diagnosticScaleM: [
      0.05 * FOCAL_SCALE_M,
      0.05 * FOCAL_SCALE_M,
      0.05 * FOCAL_SCALE_M,
      0.05 * FOCAL_SCALE_M,
    ],

    // Distância PRÓPRIA transversal na cena (coordenadas congelam; a
    // geometria aperta/estica): [x⁰, √g_xx·x, √g_yy·y, z].
    toRenderFrame: (position) => {
      const stretch = metric.transverseStretchAt([
        position[0],
        position[1],
        position[2],
        position[3],
      ])
      return [position[0], stretch.x * position[1], stretch.y * position[2], position[3]]
    },

    stopCondition: (state) =>
      metric.areaFactorAt([state[0], state[1], state[2], state[3]]) <= STOP_AREA_FACTOR,

    createObservables: () => createCollisionTracker(metric),
  }
}

/**
 * Contagem regressiva da colisão: fator de área W, tempo próprio restante
 * até a singularidade (para o observador central: dτ = √F·dx⁰/c, integrado
 * pela própria métrica até W = 0) e o aperto anisotrópico √g_xx, √g_yy.
 */
function createCollisionTracker(metric: KhanPenroseMetric): ObservableTracker {
  const a = metric.focalScaleM

  /** τ restante [s] para o observador em z = 0: x⁰ vai de ct até a. */
  const properTimeToSingularityS = (ctNow: number): number => {
    const steps = 140
    const start = Math.max(ctNow, 0)
    const span = a - start
    if (span <= 0) {
      return 0
    }
    let sum = 0
    for (let i = 0; i < steps; i += 1) {
      const ct = start + ((i + 0.5) / steps) * span
      const g = metric.metric([ct, 0, 0, 0])
      sum += Math.sqrt(Math.max(-g[0][0], 0))
    }
    return ((sum / steps) * span) / SPEED_OF_LIGHT
  }

  return {
    update() {
      /* leitura direta em read() */
    },
    read(state): ScenarioObservable[] {
      const position: [number, number, number, number] = [state[0], state[1], state[2], state[3]]
      const W = metric.areaFactorAt(position)
      const stretch = metric.transverseStretchAt(position)
      const beforeCollision = state[0] < 0

      return [
        {
          id: "collision-area-factor",
          label: "Fator de área W = 1 − u² − v²",
          value: W,
          unit: "ratio",
          provenance: "numeric",
          referenceLabel: "1 antes das ondas; 0 na singularidade (u² + v² = 1)",
          hero: true,
        },
        {
          id: "collision-countdown",
          label: "τ restante até a singularidade",
          value: beforeCollision
            ? properTimeToSingularityS(0)
            : properTimeToSingularityS(state[0]),
          unit: "s",
          provenance: "analytic",
          referenceLabel: beforeCollision
            ? "após a colisão (integral de √F pela métrica; observador central)"
            : "integral de √F pela métrica (observador central)",
          hero: true,
        },
        {
          id: "collision-stretch-x",
          label: "Fator próprio em x (compressão)",
          value: stretch.x,
          unit: "ratio",
          provenance: "numeric",
          referenceLabel: "√g_xx → 0 na singularidade",
        },
        {
          id: "collision-stretch-y",
          label: "Fator próprio em y (estiramento)",
          value: stretch.y,
          unit: "ratio",
          provenance: "numeric",
          referenceLabel: "√g_yy → ∞ na singularidade (anisotropia de Kasner)",
        },
      ]
    },
  }
}
