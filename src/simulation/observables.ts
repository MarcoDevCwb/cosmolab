/**
 * Observáveis por cenário — os "números-herói" do laboratório.
 *
 * Cada cenário pode fornecer um rastreador que acompanha a integração e
 * deriva grandezas físicas com significado direto (deflexão acumulada,
 * precessão do periastro, dilatação temporal). O rastreador vive na camada
 * de simulação: consome estados do integrador e helpers de physics/ —
 * a UI apenas formata o resultado.
 */

import {
  angleBetween2D,
  equatorialCartesianDirection,
} from "../physics/relativity/equatorial"
import type { GeodesicState } from "../physics/relativity/geodesic"
import type { SpacetimeMetric } from "../physics/relativity/metric"
import { specificAngularMomentum } from "../physics/relativity/validation"

export type ObservableUnit = "arcsec" | "deg-per-orbit" | "ratio" | "count" | "rs" | "m"

export type ScenarioObservable = {
  id: string
  label: string
  value: number
  unit: ObservableUnit
  /** Valor de referência analítico, quando existir. */
  reference?: number
  referenceLabel?: string
  /** Número-herói: destaque principal da HUD. */
  hero?: boolean
}

export type ObservableTracker = {
  /** Chamado após cada passo do integrador. */
  update(state: GeodesicState): void
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
      return [
        {
          id: "deflection",
          label: "Deflexão acumulada",
          value: accumulatedRad * RAD_TO_ARCSEC,
          unit: "arcsec",
          reference: weakFieldReferenceRad * RAD_TO_ARCSEC,
          referenceLabel: "previsão de campo fraco 4GM/(c²b)",
          hero: true,
        },
      ]
    },
  }
}

/**
 * Precessão do periastro: detecta passagens pelo periastro (u^r muda de
 * negativo para positivo) e mede o avanço de φ entre passagens consecutivas
 * além de 2π.
 *
 * Referência de campo fraco: Δφ = 6πGM/(c²p) por órbita, com semilatus
 * rectum p = L̂²/(GM/c²) calculado da constante de movimento L̂
 * (Weinberg 1972, §8.6).
 */
export function createPrecessionTracker(
  metric: SpacetimeMetric,
  schwarzschildRadiusM: number,
): ObservableTracker {
  let previousRadialVelocity: number | null = null
  let lastPeriastronPhi: number | null = null
  let precessionRad: number | null = null
  let periastronCount = 0

  return {
    update(state) {
      const radialVelocity = state[5]
      if (previousRadialVelocity !== null && previousRadialVelocity < 0 && radialVelocity >= 0) {
        periastronCount += 1
        if (lastPeriastronPhi !== null) {
          precessionRad = state[3] - lastPeriastronPhi - 2 * Math.PI
        }
        lastPeriastronPhi = state[3]
      }
      previousRadialVelocity = radialVelocity
    },
    read(state) {
      const geometrizedMassM = schwarzschildRadiusM / 2
      const angularMomentumM = specificAngularMomentum(metric, state)
      const semiLatusRectumM = (angularMomentumM * angularMomentumM) / geometrizedMassM
      const weakFieldRad =
        semiLatusRectumM > 0 ? (6 * Math.PI * geometrizedMassM) / semiLatusRectumM : 0

      const observables: ScenarioObservable[] = [
        {
          id: "orbits",
          label: "Voltas completadas",
          value: state[3] / (2 * Math.PI),
          unit: "count",
        },
      ]

      if (precessionRad !== null) {
        observables.unshift({
          id: "precession",
          label: "Precessão do periastro",
          value: precessionRad * RAD_TO_DEG,
          unit: "deg-per-orbit",
          reference: weakFieldRad * RAD_TO_DEG,
          referenceLabel: "previsão de campo fraco 6πGM/(c²p)",
          hero: true,
        })
      } else {
        observables.unshift({
          id: "precession-pending",
          label: "Precessão do periastro",
          value: Number.NaN,
          unit: "deg-per-orbit",
          reference: weakFieldRad * RAD_TO_DEG,
          referenceLabel: "previsão de campo fraco 6πGM/(c²p)",
          hero: true,
        })
      }

      return observables
    },
  }
}

/**
 * Dilatação temporal gravitacional na queda: dt/dτ = u⁰ diretamente do
 * estado (diverge quando r → r_s: o "congelamento" visto de longe).
 */
export function createInfallTracker(schwarzschildRadiusM: number): ObservableTracker {
  return {
    update() {},
    read(state) {
      return [
        {
          id: "time-dilation",
          label: "Dilatação temporal dt/dτ",
          value: state[4],
          unit: "ratio",
          hero: true,
        },
        {
          id: "horizon-distance",
          label: "Distância ao horizonte",
          value: (state[1] - schwarzschildRadiusM) / schwarzschildRadiusM,
          unit: "rs",
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
          reference: 0,
          referenceLabel: "geodésica de Minkowski é reta exata",
          hero: true,
        },
      ]
    },
  }
}
