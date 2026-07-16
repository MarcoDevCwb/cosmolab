/**
 * PASSAPORTE DE MÉTRICAS — dossiê automático de uma geometria.
 *
 * Varre o perfil radial equatorial (t = 0, θ = π/2 ou plano z = 0) e
 * detecta as estruturas clássicas, cada uma com sua condição matemática:
 *
 * - HORIZONTE:            g^rr = 0  (r deixa de ser coordenada espacial)
 * - LIMITE ESTÁTICO:      g_tt = 0  (ninguém fica parado além daqui;
 *                         entre ele e o horizonte: ergorregião)
 * - REGIÃO DE CTCs:       g_φφ < 0  (círculos de φ são curvas temporais
 *                         fechadas — causality.ts)
 * - MATÉRIA EXÓTICA:      NEC violada (T(k,k) < 0 — curvature.ts)
 * - SINGULARIDADE:        K = R·R cresce sem limite na borda interna
 * - PLANICIDADE ASSINT.:  g_tt → −1 e g_rr → 1 na borda externa
 *
 * Funciona para QUALQUER SpacetimeMetric — inclusive as do editor. As
 * fronteiras são refinadas por bissecção. Módulo puro (sem UI/Three).
 */

import { curvatureInvariants, matterDiagnostic } from "../physics/relativity/curvature"
import type { SpacetimeMetric } from "../physics/relativity/metric"
import type { Vector4 } from "../physics/relativity/tensor"

export type PassportFindingKind =
  | "horizon"
  | "static-limit"
  | "ctc-region"
  | "exotic-matter"
  | "curvature-singularity"
  | "asymptotically-flat"

export type PassportFinding = {
  kind: PassportFindingKind
  label: string
  /** Raio único [m] (horizonte, limite estático). */
  radiusM?: number
  /** Faixa [m] (regiões: CTC, matéria exótica). */
  rangeM?: [number, number]
  detail: string
}

export type MetricPassport = {
  findings: PassportFinding[]
  scannedRangeM: [number, number]
  samples: number
}

/** Posição equatorial padrão no raio dado (θ = π/2 serve às cartas esférica
 * e cartesiana; para a cilíndrica, x2 = z = 0 — usamos 0 nos dois casos
 * mediante o truque θ→π/2 apenas quando a carta é esférica). */
function equatorialPosition(metric: SpacetimeMetric, radiusM: number): Vector4 {
  return [0, radiusM, metric.chart === "spherical" ? Math.PI / 2 : 0, 0]
}

/** Bissecção do zero de f entre a e b (f(a)·f(b) < 0). */
function bisect(f: (r: number) => number, a: number, b: number, iterations = 40): number {
  let lo = a
  let hi = b
  let flo = f(lo)
  for (let i = 0; i < iterations; i += 1) {
    const mid = (lo + hi) / 2
    const fmid = f(mid)
    if (flo * fmid <= 0) {
      hi = mid
    } else {
      lo = mid
      flo = fmid
    }
  }
  return (lo + hi) / 2
}

export function generateMetricPassport(
  metric: SpacetimeMetric,
  rMinM: number,
  rMaxM: number,
  samples = 96,
): MetricPassport {
  const findings: PassportFinding[] = []

  // Grade logarítmica (estruturas concentram-se em raios pequenos).
  const radii: number[] = []
  const logMin = Math.log(rMinM)
  const logMax = Math.log(rMaxM)
  for (let i = 0; i <= samples; i += 1) {
    radii.push(Math.exp(logMin + ((logMax - logMin) * i) / samples))
  }

  const gttAt = (r: number) => metric.metric(equatorialPosition(metric, r))[0][0]
  const grrInvAt = (r: number) => metric.inverseMetric(equatorialPosition(metric, r))[1][1]
  const gphiphiAt = (r: number) => metric.metric(equatorialPosition(metric, r))[3][3]

  const gtt = radii.map(gttAt)
  const grrInv = radii.map(grrInvAt)
  const gphiphi = radii.map(gphiphiAt)

  // Horizontes: zeros de g^rr.
  for (let i = 1; i < radii.length; i += 1) {
    if (Number.isFinite(grrInv[i - 1]) && Number.isFinite(grrInv[i]) && grrInv[i - 1] * grrInv[i] < 0) {
      const radiusM = bisect(grrInvAt, radii[i - 1], radii[i])
      findings.push({
        kind: "horizon",
        label: "Horizonte",
        radiusM,
        detail: "g^rr = 0: superfície de não-retorno nesta carta.",
      })
    }
  }

  // Limite estático: zeros de g_tt.
  for (let i = 1; i < radii.length; i += 1) {
    if (gtt[i - 1] * gtt[i] < 0) {
      const radiusM = bisect(gttAt, radii[i - 1], radii[i])
      findings.push({
        kind: "static-limit",
        label: "Limite estático",
        radiusM,
        detail:
          "g_tt = 0: além daqui nenhum observador fica parado (com horizonte distinto ⇒ ergorregião).",
      })
    }
  }

  // Região de CTCs: g_φφ < 0 contígua.
  let ctcStart: number | null = null
  for (let i = 0; i <= radii.length; i += 1) {
    const inside = i < radii.length && gphiphi[i] < 0
    if (inside && ctcStart === null) {
      ctcStart = radii[Math.max(i - 1, 0)]
    }
    if (!inside && ctcStart !== null) {
      const endM = i < radii.length ? radii[i] : rMaxM
      findings.push({
        kind: "ctc-region",
        label: "Região de CTCs",
        rangeM: [ctcStart, i < radii.length ? endM : Infinity],
        detail: "g_φφ < 0: círculos de φ são curvas temporais FECHADAS (acausal).",
      })
      ctcStart = null
    }
  }

  // Matéria exótica (NEC) e curvatura em subamostra (custo de Riemann).
  const coarse = radii.filter((_, i) => i % 6 === 0)
  let exoticStart: number | null = null
  let lastExotic = rMinM
  for (const r of coarse) {
    const matter = matterDiagnostic(metric, equatorialPosition(metric, r), [r, r, 1, 1])
    const exotic = matter !== null && !matter.nullEnergyConditionOk
    if (exotic && exoticStart === null) {
      exoticStart = r
    }
    if (exotic) {
      lastExotic = r
    }
    if (!exotic && exoticStart !== null) {
      findings.push({
        kind: "exotic-matter",
        label: "Matéria exótica",
        rangeM: [exoticStart, lastExotic],
        detail: "NEC violada: T(k,k) < 0 — exige densidade de energia negativa.",
      })
      exoticStart = null
    }
  }
  if (exoticStart !== null) {
    findings.push({
      kind: "exotic-matter",
      label: "Matéria exótica",
      rangeM: [exoticStart, rMaxM],
      detail: "NEC violada: T(k,k) < 0 — exige densidade de energia negativa.",
    })
  }

  // Singularidade de curvatura: K crescendo na borda interna.
  const rA = radii[0]
  const rB = radii[Math.floor(samples / 4)]
  const kA = curvatureInvariants(metric, equatorialPosition(metric, rA), [rA, rA, 1, 1]).kretschmann
  const kB = curvatureInvariants(metric, equatorialPosition(metric, rB), [rB, rB, 1, 1]).kretschmann
  if (Number.isFinite(kA) && Math.abs(kA) > 100 * Math.max(Math.abs(kB), 1e-40)) {
    const exponent = Math.log(Math.abs(kA) / Math.max(Math.abs(kB), 1e-300)) / Math.log(rB / rA)
    findings.push({
      kind: "curvature-singularity",
      label: "Singularidade de curvatura (indício)",
      radiusM: rA,
      detail: `K cresce ≈ r^−${exponent.toFixed(1)} rumo ao centro (K invariante ⇒ não é artefato de carta).`,
    })
  }

  // Planicidade assintótica na borda externa.
  const gttFar = gtt[gtt.length - 1]
  const grrFar = metric.metric(equatorialPosition(metric, rMaxM))[1][1]
  if (Math.abs(gttFar + 1) < 0.05 && Math.abs(grrFar - 1) < 0.05) {
    findings.push({
      kind: "asymptotically-flat",
      label: "Assintoticamente plana",
      radiusM: rMaxM,
      detail: "g_tt → −1 e g_rr → 1 na borda do scan: aproxima Minkowski longe da fonte.",
    })
  }

  return { findings, scannedRangeM: [rMinM, rMaxM], samples }
}
