/**
 * Observáveis por cenário — os "números-herói" do laboratório.
 *
 * Cada cenário pode fornecer um rastreador que acompanha a integração e
 * deriva grandezas físicas com significado direto (deflexão acumulada,
 * precessão do periastro, dilatação temporal). O rastreador vive na camada
 * de simulação: consome estados do integrador e helpers de physics/ —
 * a UI apenas formata o resultado.
 */

import { SPEED_OF_LIGHT } from "../physics/constants"
import {
  angleBetween2D,
  equatorialCartesianDirection,
} from "../physics/relativity/equatorial"
import type { GeodesicState } from "../physics/relativity/geodesic"
import type { SpacetimeMetric } from "../physics/relativity/metric"
import { specificAngularMomentum } from "../physics/relativity/validation"

export type ObservableUnit =
  | "arcsec"
  | "deg"
  | "deg-per-orbit"
  | "ratio"
  | "count"
  | "rs"
  | "m"
  | "s"

/**
 * Origem epistemológica do valor exibido — a UI NUNCA deve apresentar uma
 * aproximação analítica como se fosse o resultado numérico, nem o contrário.
 */
export type ObservableProvenance = "numeric" | "analytic" | "weak-field"

export type ScenarioObservable = {
  id: string
  label: string
  value: number
  unit: ObservableUnit
  /** Origem do valor principal (padrão: integração numérica das equações completas). */
  provenance: ObservableProvenance
  /** Valor de referência analítico/perturbativo, quando existir. */
  reference?: number
  referenceLabel?: string
  /** Aviso de regime (ex.: campo forte invalida a aproximação de referência). */
  regimeWarning?: string
  /** Número-herói: destaque principal da HUD. */
  hero?: boolean
}

export type ObservableTracker = {
  /** Chamado após cada passo do integrador (λ em metros). */
  update(state: GeodesicState, lambdaM: number): void
  /** Lê os observáveis no estado atual. */
  read(state: GeodesicState): ScenarioObservable[]
}

const RAD_TO_ARCSEC = (180 / Math.PI) * 3600
const RAD_TO_DEG = 180 / Math.PI

/**
 * Deflexão acumulada de um fóton no plano equatorial: ângulo total varrido
 * pela direção espacial desde o disparo. Acumula passo a passo para não
 * saturar em π nos casos de captura (espiral).
 *
 * Referência de campo fraco: α = 4GM/(c²b) = 2 r_s/b (Weinberg 1972, §8.5),
 * com b = L/E exato para fótons em Schwarzschild.
 */
export function createDeflectionTracker(
  initialState: GeodesicState,
  weakFieldReferenceRad: number,
): ObservableTracker {
  let previousDirection = equatorialCartesianDirection(initialState)
  let accumulatedRad = 0

  return {
    update(state) {
      const direction = equatorialCartesianDirection(state)
      accumulatedRad += angleBetween2D(previousDirection, direction)
      previousDirection = direction
    },
    read() {
      const strongField = weakFieldReferenceRad > 0.02 // α ≳ 1°: 2r_s/b não é mais confiável
      return [
        {
          id: "deflection",
          label: "Deflexão acumulada",
          value: accumulatedRad * RAD_TO_ARCSEC,
          unit: "arcsec",
          provenance: "numeric",
          reference: weakFieldReferenceRad * RAD_TO_ARCSEC,
          referenceLabel: "aproximação de campo fraco 4GM/(c²b)",
          regimeWarning: strongField
            ? "campo forte: a aproximação de campo fraco não é confiável neste b"
            : undefined,
          hero: true,
        },
      ]
    },
  }
}

/**
 * Precessão do periastro por detecção INTERPOLADA de mínimos de r.
 *
 * O periastro é o cruzamento u^r: (−) → (+). Em vez de usar o passo
 * amostrado (resolução limitada a Δφ de um passo), interpola-se linearmente
 * o instante exato do zero de u^r entre os dois estados vizinhos e avalia-se
 * φ* nesse ponto. Sobre as passagens acumuladas reporta-se média e desvio
 * padrão — o σ expõe a incerteza da própria medição.
 *
 * Referência de campo fraco: Δφ = 6πGM/(c²p) por órbita, com semilatus
 * rectum p = L̂²/(GM/c²) calculado da constante de movimento L̂
 * (Weinberg 1972, §8.6). Em r ~ poucas r_s essa aproximação SUBESTIMA a
 * precessão — o motor sinaliza o regime.
 */
export function createPrecessionTracker(
  metric: SpacetimeMetric,
  schwarzschildRadiusM: number,
): ObservableTracker {
  let previous: { radialVelocity: number; phi: number } | null = null
  let lastPeriastronPhi: number | null = null
  const precessionsRad: number[] = []
  let periastronCount = 0

  return {
    update(state) {
      const radialVelocity = state[5]
      const phi = state[3]

      if (previous !== null && previous.radialVelocity < 0 && radialVelocity >= 0) {
        // Interpolação linear do cruzamento u^r = 0 entre os dois passos.
        const fraction =
          previous.radialVelocity / (previous.radialVelocity - radialVelocity)
        const periastronPhi = previous.phi + fraction * (phi - previous.phi)

        periastronCount += 1
        if (lastPeriastronPhi !== null) {
          precessionsRad.push(periastronPhi - lastPeriastronPhi - 2 * Math.PI)
        }
        lastPeriastronPhi = periastronPhi
      }

      previous = { radialVelocity, phi }
    },
    read(state) {
      const geometrizedMassM = schwarzschildRadiusM / 2
      const angularMomentumM = specificAngularMomentum(metric, state)
      const semiLatusRectumM = (angularMomentumM * angularMomentumM) / geometrizedMassM
      const weakFieldRad =
        semiLatusRectumM > 0 ? (6 * Math.PI * geometrizedMassM) / semiLatusRectumM : 0

      const sampleCount = precessionsRad.length
      const meanRad =
        sampleCount > 0
          ? precessionsRad.reduce((sum, value) => sum + value, 0) / sampleCount
          : Number.NaN
      const stdRad =
        sampleCount > 1
          ? Math.sqrt(
              precessionsRad.reduce((sum, value) => sum + (value - meanRad) ** 2, 0) /
                (sampleCount - 1),
            )
          : Number.NaN

      const strongField =
        Number.isFinite(meanRad) && weakFieldRad > 0 && meanRad / weakFieldRad > 1.25

      const observables: ScenarioObservable[] = [
        {
          id: "precession",
          label: "Precessão do periastro (média)",
          value: meanRad * RAD_TO_DEG,
          unit: "deg-per-orbit",
          provenance: "numeric",
          reference: weakFieldRad * RAD_TO_DEG,
          referenceLabel: "aproximação de campo fraco 6πGM/(c²p)",
          regimeWarning: strongField
            ? "campo forte: a aproximação pós-newtoniana subestima a precessão"
            : undefined,
          hero: true,
        },
        {
          id: "periastron-count",
          label: "Periastros detectados",
          value: periastronCount,
          unit: "count",
          provenance: "numeric",
        },
        {
          id: "orbits",
          label: "Voltas completadas",
          value: state[3] / (2 * Math.PI),
          unit: "count",
          provenance: "numeric",
        },
      ]

      if (Number.isFinite(stdRad)) {
        observables.splice(1, 0, {
          id: "precession-std",
          label: "Desvio padrão da precessão",
          value: stdRad * RAD_TO_DEG,
          unit: "deg-per-orbit",
          provenance: "numeric",
        })
      }

      return observables
    },
  }
}

/**
 * Dilatação temporal na queda — DUAS grandezas distintas que não devem ser
 * confundidas (Wald §6.3):
 *
 * 1. dt/dτ da PARTÍCULA = u⁰ (numérico, do estado da geodésica): inclui o
 *    efeito gravitacional E o cinemático do movimento (diverge em r → r_s).
 * 2. Fator ESTÁTICO 1/√(1 − r_s/r) (analítico): dilatação de um observador
 *    PARADO em r — só o efeito gravitacional, sem movimento.
 */
export function createInfallTracker(schwarzschildRadiusM: number): ObservableTracker {
  return {
    update() {},
    read(state) {
      const lapse = 1 - schwarzschildRadiusM / state[1]
      return [
        {
          id: "time-dilation",
          label: "Dilatação da partícula em queda",
          value: state[4],
          unit: "ratio",
          provenance: "numeric",
          hero: true,
        },
        {
          id: "static-factor",
          label: "Fator estático 1/√(1−r_s/r)",
          value: lapse > 0 ? 1 / Math.sqrt(lapse) : Number.NaN,
          unit: "ratio",
          provenance: "analytic",
        },
        {
          id: "horizon-distance",
          label: "Distância ao horizonte",
          value: (state[1] - schwarzschildRadiusM) / schwarzschildRadiusM,
          unit: "rs",
          provenance: "numeric",
        },
      ]
    },
  }
}

/**
 * Redshift cosmológico — o observável mais famoso da astronomia, medido
 * numa geodésica nula REAL: a energia do fóton vista por observadores
 * comóveis é E ∝ u⁰ (g₀₀ = −1), então 1+z = u⁰_emissão/u⁰_agora — medição
 * NUMÉRICA independente. A referência analítica é 1+z = a(agora)/a(emissão)
 * (Weinberg, Cosmology 2008, §1.3): a concordância entre as duas é
 * validação dupla ao vivo. Também monitora o momento comóvel conservado
 * p = a²·u^x (o substituto de E, que aqui NÃO se conserva — não há Killing
 * temporal num universo em expansão: a "deriva de E" é física, é o redshift).
 */
export function createRedshiftTracker(
  scaleFactorAt: (ct: number) => number,
  initialState: GeodesicState,
): ObservableTracker {
  const uTimeEmit = initialState[4]
  const aEmit = scaleFactorAt(initialState[0])
  const comovingMomentumInitial = aEmit * aEmit * initialState[5]

  return {
    update() {},
    read(state) {
      const aNow = scaleFactorAt(state[0])
      const zNumeric = uTimeEmit / state[4] - 1
      const zAnalytic = aNow / aEmit - 1
      const comovingMomentumNow = aNow * aNow * state[5]
      const momentumDrift =
        Math.abs(comovingMomentumNow - comovingMomentumInitial) /
        Math.max(Math.abs(comovingMomentumInitial), 1e-30)

      return [
        {
          id: "redshift",
          label: "Redshift cosmológico z",
          value: zNumeric,
          unit: "count",
          provenance: "numeric",
          reference: zAnalytic,
          referenceLabel: "analítico 1+z = a(obs)/a(emissão)",
          hero: true,
        },
        {
          id: "scale-factor",
          label: "Fator de escala a(t)",
          value: aNow,
          unit: "count",
          provenance: "analytic",
        },
        {
          id: "comoving-momentum-drift",
          label: "Deriva de a²·u^x (conservado)",
          value: momentumDrift,
          unit: "count",
          provenance: "numeric",
        },
      ]
    },
  }
}

/**
 * Atraso de Shapiro (4º teste clássico da RG; Shapiro, PRL 13, 789 (1964)):
 * o tempo COORDENADO de um fóton que passa perto da massa excede o tempo
 * plano do trajeto em Δt ≈ (2GM/c³)·ln(4x₁x₂/b²). Medimos ao vivo
 * Δt(λ) = t − d_corda/c, com d_corda a distância euclidiana ao ponto de
 * partida (a correção de comprimento pela deflexão é O(α²), desprezível).
 * NOTA DE CONVENÇÃO: a repartição do atraso entre "geométrico" e
 * "gravitacional" depende da baseline (corda, arco, √(r²−r₀²)...); a
 * referência exibida usa a expressão de primeira ordem correspondente a
 * esta baseline coordenada. Um observável operacional completo (emissão e
 * recepção em linhas de mundo especificadas, medido por relógio próprio) é
 * que elimina a ambiguidade de uma baseline coordenada isolada.
 */
export function createShapiroTracker(
  initialState: GeodesicState,
  weakFieldDelayS: number,
): ObservableTracker {
  const start = equatorialCartesianPositionOf(initialState)

  return {
    update() {},
    read(state) {
      const current = equatorialCartesianPositionOf(state)
      const chordM = Math.hypot(current[0] - start[0], current[1] - start[1])
      const delayS = state[0] / SPEED_OF_LIGHT - chordM / SPEED_OF_LIGHT

      return [
        {
          id: "shapiro-delay",
          label: "Atraso de Shapiro acumulado",
          value: delayS,
          unit: "s",
          provenance: "numeric",
          reference: weakFieldDelayS,
          referenceLabel: "campo fraco (2GM/c³)[ln(4x₁x₂/b²) − 1], baseline de corda coordenada",
          hero: true,
        },
      ]
    },
  }
}

function equatorialCartesianPositionOf(state: GeodesicState): [number, number] {
  const r = state[1]
  const phi = state[3]
  return [r * Math.cos(phi), r * Math.sin(phi)]
}

/**
 * Cruzamento do horizonte em coordenadas regulares (Painlevé–Gullstrand):
 * acompanha r/r_s e registra o tempo próprio τ (via λ = c·τ) no instante
 * INTERPOLADO em que r cruza r_s. Em PG nada diverge ali — o observável
 * demonstra que o horizonte é um lugar como outro qualquer para quem cai.
 */
export function createHorizonCrossingTracker(schwarzschildRadiusM: number): ObservableTracker {
  let previous: { radiusM: number; lambdaM: number } | null = null
  let crossingProperTimeS: number | null = null

  return {
    update(state, lambdaM) {
      const radiusM = state[1]
      if (
        crossingProperTimeS === null &&
        previous !== null &&
        previous.radiusM > schwarzschildRadiusM &&
        radiusM <= schwarzschildRadiusM
      ) {
        const fraction =
          (previous.radiusM - schwarzschildRadiusM) / (previous.radiusM - radiusM)
        const crossingLambdaM = previous.lambdaM + fraction * (lambdaM - previous.lambdaM)
        crossingProperTimeS = crossingLambdaM / SPEED_OF_LIGHT
      }
      previous = { radiusM, lambdaM }
    },
    read(state) {
      const observables: ScenarioObservable[] = [
        {
          id: "radius-over-rs",
          label: "Raio atual r / r_s",
          value: state[1] / schwarzschildRadiusM,
          unit: "rs",
          provenance: "numeric",
          hero: true,
        },
        {
          id: "rain-time-rate",
          label: "dT/dτ (tempo-chuva)",
          value: state[4],
          unit: "ratio",
          provenance: "numeric",
        },
      ]

      if (crossingProperTimeS !== null) {
        observables.splice(1, 0, {
          id: "crossing-tau",
          label: "τ ao cruzar o horizonte",
          value: crossingProperTimeS,
          unit: "s",
          provenance: "numeric",
        })
      }

      return observables
    },
  }
}

/**
 * Causalidade no universo de Gödel: posição relativa à fronteira de CTCs
 * (r_CTC onde g_φφ = 0) e a norma do círculo axial no ponto — o detector
 * direto de curvas temporais fechadas.
 */
export function createCausalityTracker(
  metric: SpacetimeMetric,
  ctcRadiusM: number,
): ObservableTracker {
  return {
    update() {},
    read(state) {
      const gPhiPhi = metric.metric([state[0], state[1], state[2], state[3]])[3][3]
      const inside = gPhiPhi < 0

      return [
        {
          id: "ctc-proximity",
          label: "Posição vs fronteira de CTCs",
          value: state[1] / ctcRadiusM,
          unit: "ratio",
          provenance: "numeric",
          regimeWarning: inside
            ? "região ACAUSAL: os círculos de φ por aqui são curvas temporais FECHADAS (g_φφ < 0) — percorrê-las exige propulsão, não são geodésicas"
            : undefined,
          hero: true,
        },
        {
          id: "azimuthal-norm",
          label: "g_φφ do círculo fechado",
          value: gPhiPhi,
          unit: "m",
          provenance: "numeric",
        },
        {
          id: "orbits",
          label: "Voltas completadas",
          value: state[3] / (2 * Math.PI),
          unit: "count",
          provenance: "numeric",
        },
      ]
    },
  }
}

/**
 * Arrasto de referenciais (Lense–Thirring) em Kerr: a partícula parte do
 * repouso com momento angular NULO e mesmo assim gira — φ acumulado mede o
 * arrasto do próprio espaço-tempo. L = g_φμu^μ permanece zero (Killing ∂_φ),
 * o que a validação numérica exibe como verificação de consistência.
 */
export function createFrameDraggingTracker(): ObservableTracker {
  return {
    update() {},
    read(state) {
      return [
        {
          id: "frame-dragging",
          label: "Arrasto acumulado (L = 0)",
          value: state[3] * RAD_TO_DEG,
          unit: "deg",
          provenance: "numeric",
          hero: true,
        },
        {
          id: "dragging-turns",
          label: "Voltas arrastadas",
          value: state[3] / (2 * Math.PI),
          unit: "count",
          provenance: "numeric",
        },
      ]
    },
  }
}

/**
 * Controle de retilineidade em espaço plano: desvio lateral máximo da
 * geodésica em relação à reta inicial — deve ser zero ao erro de máquina.
 */
export function createStraightnessTracker(initialState: GeodesicState): ObservableTracker {
  const initialY = initialState[2]
  let maxDeviationM = 0

  return {
    update(state) {
      maxDeviationM = Math.max(maxDeviationM, Math.abs(state[2] - initialY))
    },
    read() {
      return [
        {
          id: "straightness",
          label: "Desvio da linha reta",
          value: maxDeviationM,
          unit: "m",
          provenance: "numeric",
          reference: 0,
          referenceLabel: "geodésica de Minkowski é reta exata",
          hero: true,
        },
      ]
    },
  }
}
