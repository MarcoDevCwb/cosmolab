/**
 * PASSAPORTE DE MÉTRICAS — triagem numérica local de uma geometria.
 *
 * Varre o perfil radial equatorial (t = 0, θ = π/2 ou plano z = 0) e
 * procura assinaturas clássicas sob hipóteses explícitas:
 *
 * - SUPERFÍCIE NULA r=cte: g^rr = 0. É candidata a horizonte apenas quando
 *                         a geometria/simetria justifica essa identificação;
 *                         horizonte de eventos é uma noção GLOBAL.
 * - LIMITE ESTÁTICO:      g_tt = 0 em carta estacionária adaptada ao Killing.
 * - REGIÃO DE CTCs:       g_φφ < 0  (círculos de φ são curvas temporais
 *                         fechadas — causality.ts)
 * - MATÉRIA EXÓTICA:      violação da NEC encontrada na amostragem de k.
 * - SINGULARIDADE:        crescimento de K na borda interna (indício apenas).
 * - PLANICIDADE ASSINT.:  compatibilidade na borda externa, somente para
 *                         métricas estacionárias (indício, não prova).
 *
 * O algoritmo pode ser executado para qualquer SpacetimeMetric, mas a
 * interpretação depende da carta, simetrias, periodicidade de φ, domínio do
 * scan e resolução. Resultado negativo não prova ausência global.
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

/** Posição equatorial no raio dado, NA ÉPOCA do scan (x⁰ = epochCt).
 * Crucial para métricas não-estacionárias: escanear FLRW em x⁰ = 0
 * avaliaria o Big Bang (a = 0, métrica degenerada) — bug real encontrado
 * em auditoria. θ = π/2 nas cartas esféricas; 0 nas demais. */
function equatorialPosition(metric: SpacetimeMetric, radiusM: number, epochCt: number): Vector4 {
  return [epochCt, radiusM, metric.chart === "spherical" ? Math.PI / 2 : 0, 0]
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

/** Máximo desvio adimensional em relação a Minkowski na mesma carta, no
 * equador. Isso usa todas as componentes, inclusive termos cruzados; ainda é
 * apenas um teste em raio finito, não uma condição de falloff assintótico. */
function minkowskiComponentDeviation(metric: SpacetimeMetric, radiusM: number, epochCt: number): number {
  const g = metric.metric(equatorialPosition(metric, radiusM, epochCt))
  const spatialAngularScale = radiusM * radiusM
  const referenceDiagonal =
    metric.chart === "spherical"
      ? [-1, 1, spatialAngularScale, spatialAngularScale]
      : metric.chart === "cylindrical"
        ? [-1, 1, 1, spatialAngularScale]
        : [-1, 1, 1, 1]

  let maximumDeviation = 0
  for (let mu = 0; mu < 4; mu += 1) {
    for (let nu = 0; nu < 4; nu += 1) {
      const reference = mu === nu ? referenceDiagonal[mu] : 0
      const scale = Math.sqrt(Math.abs(referenceDiagonal[mu] * referenceDiagonal[nu]))
      maximumDeviation = Math.max(maximumDeviation, Math.abs(g[mu][nu] - reference) / scale)
    }
  }
  return maximumDeviation
}

export function generateMetricPassport(
  metric: SpacetimeMetric,
  rMinM: number,
  rMaxM: number,
  samples = 96,
  /** Época x⁰ = c·t do scan (essencial em métricas não-estacionárias). */
  epochCt = 0,
): MetricPassport {
  const findings: PassportFinding[] = []

  // Grade logarítmica (estruturas concentram-se em raios pequenos).
  const radii: number[] = []
  const logMin = Math.log(rMinM)
  const logMax = Math.log(rMaxM)
  for (let i = 0; i <= samples; i += 1) {
    radii.push(Math.exp(logMin + ((logMax - logMin) * i) / samples))
  }

  const gttAt = (r: number) => metric.metric(equatorialPosition(metric, r, epochCt))[0][0]
  const grrInvAt = (r: number) => metric.inverseMetric(equatorialPosition(metric, r, epochCt))[1][1]
  const gphiphiAt = (r: number) => metric.metric(equatorialPosition(metric, r, epochCt))[3][3]

  const gtt = radii.map(gttAt)
  const grrInv = radii.map(grrInvAt)
  const gphiphi = radii.map(gphiphiAt)

  // Superfícies r=const nulas: zeros de g^rr. Não são automaticamente
  // horizontes de eventos, cuja definição depende do futuro causal global.
  for (let i = 1; i < radii.length; i += 1) {
    if (Number.isFinite(grrInv[i - 1]) && Number.isFinite(grrInv[i]) && grrInv[i - 1] * grrInv[i] < 0) {
      const radiusM = bisect(grrInvAt, radii[i - 1], radii[i])
      findings.push({
        kind: "horizon",
        label: "Horizonte candidato",
        radiusM,
        detail:
          "g^rr = 0: a superfície r = constante é nula nesta carta; identificá-la como horizonte exige informação causal global ou simetria adicional.",
      })
    }
  }

  // Limite estático: norma do Killing temporal em carta estacionária.
  if (metric.symmetries?.stationary) {
    for (let i = 1; i < radii.length; i += 1) {
      if (gtt[i - 1] * gtt[i] < 0) {
        const radiusM = bisect(gttAt, radii[i - 1], radii[i])
        findings.push({
          kind: "static-limit",
          label: "Limite estático",
          radiusM,
          detail:
            "g_tt = 0: o Killing temporal fica nulo; em carta estacionária adaptada, observadores em coordenadas espaciais fixas deixam de ser timelike.",
        })
      }
    }
  }

  // Círculos axiais temporais. Só faz sentido quando x³ é um φ periódico;
  // nas cartas esférica/cilíndrica do laboratório essa é a convenção.
  // g_φφ<0 é condição suficiente, não necessária, para existência de CTCs.
  let ctcStart: number | null = null
  if (metric.chart !== "cartesian" && metric.symmetries?.axisymmetric) {
    for (let i = 0; i <= radii.length; i += 1) {
      const inside = i < radii.length && gphiphi[i] < 0
      if (inside && ctcStart === null) {
        ctcStart =
          i > 0 && gphiphi[i - 1] * gphiphi[i] < 0
            ? bisect(gphiphiAt, radii[i - 1], radii[i])
            : radii[i]
      }
      if (!inside && ctcStart !== null) {
        const endM =
          i < radii.length && i > 0 && gphiphi[i - 1] * gphiphi[i] < 0
            ? bisect(gphiphiAt, radii[i - 1], radii[i])
            : rMaxM
        findings.push({
          kind: "ctc-region",
          label: "Região com círculos φ temporais",
          rangeM: [ctcStart, endM],
          detail:
            "g_φφ < 0 com φ periódico: os círculos de φ são CTCs. É condição suficiente; outros tipos de CTC não são excluídos quando g_φφ ≥ 0.",
        })
        ctcStart = null
      }
    }
  }

  // Matéria exótica (NEC) e curvatura em subamostra (custo de Riemann).
  const coarse = radii.filter((_, i) => i % 6 === 0)
  let exoticStart: number | null = null
  let lastExotic = rMinM
  for (const r of coarse) {
    const matter = matterDiagnostic(metric, equatorialPosition(metric, r, epochCt), [r, r, 1, 1])
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
        detail:
          "Violação da NEC detectada: T(k,k) < 0 para ao menos uma direção nula amostrada. Isso não implica, em geral, densidade de energia negativa no referencial escolhido.",
      })
      exoticStart = null
    }
  }
  if (exoticStart !== null) {
    findings.push({
      kind: "exotic-matter",
      label: "Matéria exótica",
      rangeM: [exoticStart, rMaxM],
      detail:
        "Violação da NEC detectada: T(k,k) < 0 para ao menos uma direção nula amostrada. Isso não implica, em geral, densidade de energia negativa no referencial escolhido.",
    })
  }

  // Singularidade de curvatura: K crescendo na borda interna.
  const rA = radii[0]
  const rB = radii[Math.floor(samples / 4)]
  const kA = curvatureInvariants(metric, equatorialPosition(metric, rA, epochCt), [rA, rA, 1, 1]).kretschmann
  const kB = curvatureInvariants(metric, equatorialPosition(metric, rB, epochCt), [rB, rB, 1, 1]).kretschmann
  if (Number.isFinite(kA) && Math.abs(kA) > 100 * Math.max(Math.abs(kB), 1e-40)) {
    const exponent = Math.log(Math.abs(kA) / Math.max(Math.abs(kB), 1e-300)) / Math.log(rB / rA)
    findings.push({
      kind: "curvature-singularity",
      label: "Singularidade de curvatura (indício)",
      radiusM: rA,
      detail: `K cresce ≈ r^−${exponent.toFixed(1)} na borda interna do scan. É indício de divergência; confirmar singularidade exige estudar o limite e a extensão geodésica.`,
    })
  }

  // Planicidade assintótica na borda externa.
  const minkowskiDeviation = minkowskiComponentDeviation(metric, rMaxM, epochCt)
  if (
    metric.symmetries?.stationary &&
    Number.isFinite(minkowskiDeviation) &&
    minkowskiDeviation < 0.05
  ) {
    findings.push({
      kind: "asymptotically-flat",
      label: "Compatível com planicidade assintótica",
      radiusM: rMaxM,
      detail:
        "Todas as componentes normalizadas aproximam Minkowski, nesta carta, na borda de uma métrica estacionária. É indício local; planicidade assintótica requer o limite e o falloff das componentes e derivadas.",
    })
  }

  return { findings, scannedRangeM: [rMinM, rMaxM], samples }
}
