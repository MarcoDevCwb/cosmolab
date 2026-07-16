/**
 * Invariantes de curvatura — os detectores de singularidade REAL.
 *
 * Referências: Wald, "General Relativity" (1984), §3.2; MTW cap. 14;
 * Henry, ApJ 535, 350 (2000) (Kretschmann de buracos negros).
 *
 * Tensor de Riemann a partir dos Christoffels (convenção de Wald):
 *
 *   R^ρ_{σμν} = ∂_μ Γ^ρ_{νσ} − ∂_ν Γ^ρ_{μσ} + Γ^ρ_{μλ}Γ^λ_{νσ} − Γ^ρ_{νλ}Γ^λ_{μσ}
 *
 * Dele saem os dois invariantes exibidos:
 * - Escalar de Ricci R = g^{σν} R^ρ_{σρν} [1/m²]: ZERO em qualquer solução
 *   de vácuo/eletrovácuo (Schwarzschild, Kerr, Reissner–Nordström) — na
 *   prática, mais um termômetro de validação ao vivo.
 * - Kretschmann K = R_{αβγδ}R^{αβγδ} [1/m⁴]: NÃO depende da carta. Se K é
 *   finito num "horizonte" (ex.: 0,75/M⁴ em r = r_s de Schwarzschild), a
 *   singularidade ali é DE COORDENADA; se K → ∞ (r → 0), é física.
 *   Para Schwarzschild: K = 48 M_geo²/r⁶.
 *
 * Cálculo NUMÉRICO: ∂Γ por diferenças finitas centrais sobre
 * resolveChristoffel (que usa a forma analítica quando existe). Precisão
 * típica: ~1e-9 relativa com Christoffels analíticos, ~1e-4 com métricas
 * plugáveis (FD sobre FD) — suficiente para diagnóstico, e rotulado como
 * numérico na UI. Custo O(centenas de avaliações da métrica): calculado
 * apenas na cadência de publicação da HUD, nunca por passo.
 */

import { resolveChristoffel } from "./christoffel"
import type { SpacetimeMetric } from "./metric"
import type { Vector4 } from "./tensor"
import { SPACETIME_DIMENSION as N } from "./tensor"

const CBRT_EPSILON = Math.cbrt(Number.EPSILON)

export type CurvatureInvariants = {
  /** Escalar de Ricci R [1/m²]. */
  ricciScalar: number
  /** Escalar de Kretschmann K = R_{αβγδ}R^{αβγδ} [1/m⁴]. */
  kretschmann: number
}

/**
 * R^ρ_{σμν} nas coordenadas da métrica, por diferenças finitas dos
 * Christoffels. Derivadas em direções de Killing declaradas são puladas
 * (exatamente nulas).
 */
export function riemannTensor(
  metric: SpacetimeMetric,
  position: Vector4,
  scaleFloor: Vector4 = [1, 1, 1, 1],
): number[][][][] {
  const gammaAt = (p: Vector4) => resolveChristoffel(metric, p, scaleFloor)
  const gamma = gammaAt(position)

  // ∂_μ Γ^ρ_{νσ} — dGamma[mu][rho][nu][sigma]
  const dGamma: number[][][][] = []
  for (let mu = 0; mu < N; mu += 1) {
    if (
      (mu === 0 && metric.symmetries?.stationary) ||
      (mu === 3 && metric.symmetries?.axisymmetric)
    ) {
      dGamma.push(
        Array.from({ length: N }, () =>
          Array.from({ length: N }, () => new Array<number>(N).fill(0)),
        ),
      )
      continue
    }

    const step = CBRT_EPSILON * Math.max(Math.abs(position[mu]), scaleFloor[mu])
    const forward: Vector4 = [...position]
    const backward: Vector4 = [...position]
    forward[mu] += step
    backward[mu] -= step
    const gPlus = gammaAt(forward)
    const gMinus = gammaAt(backward)

    dGamma.push(
      Array.from({ length: N }, (_, rho) =>
        Array.from({ length: N }, (_, nu) =>
          Array.from(
            { length: N },
            (_, sigma) => (gPlus[rho][nu][sigma] - gMinus[rho][nu][sigma]) / (2 * step),
          ),
        ),
      ),
    )
  }

  const riemann: number[][][][] = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => Array.from({ length: N }, () => new Array<number>(N).fill(0))),
  )

  for (let rho = 0; rho < N; rho += 1) {
    for (let sigma = 0; sigma < N; sigma += 1) {
      for (let mu = 0; mu < N; mu += 1) {
        for (let nu = 0; nu < N; nu += 1) {
          let value = dGamma[mu][rho][nu][sigma] - dGamma[nu][rho][mu][sigma]
          for (let lambda = 0; lambda < N; lambda += 1) {
            value +=
              gamma[rho][mu][lambda] * gamma[lambda][nu][sigma] -
              gamma[rho][nu][lambda] * gamma[lambda][mu][sigma]
          }
          riemann[rho][sigma][mu][nu] = value
        }
      }
    }
  }

  return riemann
}

/** R e K no ponto dado. */
export function curvatureInvariants(
  metric: SpacetimeMetric,
  position: Vector4,
  scaleFloor?: Vector4,
): CurvatureInvariants {
  const riemann = riemannTensor(metric, position, scaleFloor)
  const g = metric.metric(position)
  const gInv = metric.inverseMetric(position)

  // Ricci: R_{σν} = R^ρ_{σρν};  R = g^{σν} R_{σν}.
  let ricciScalar = 0
  for (let sigma = 0; sigma < N; sigma += 1) {
    for (let nu = 0; nu < N; nu += 1) {
      let ricci = 0
      for (let rho = 0; rho < N; rho += 1) {
        ricci += riemann[rho][sigma][rho][nu]
      }
      ricciScalar += gInv[sigma][nu] * ricci
    }
  }

  // R_{αβγδ} = g_{αρ} R^ρ_{βγδ}.
  const lower: number[][][][] = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => Array.from({ length: N }, () => new Array<number>(N).fill(0))),
  )
  for (let alpha = 0; alpha < N; alpha += 1) {
    for (let beta = 0; beta < N; beta += 1) {
      for (let gammaI = 0; gammaI < N; gammaI += 1) {
        for (let delta = 0; delta < N; delta += 1) {
          let value = 0
          for (let rho = 0; rho < N; rho += 1) {
            value += g[alpha][rho] * riemann[rho][beta][gammaI][delta]
          }
          lower[alpha][beta][gammaI][delta] = value
        }
      }
    }
  }

  // K = R_{αβγδ} R^{αβγδ}, subindo os quatro índices com g^{-1}.
  let kretschmann = 0
  for (let a = 0; a < N; a += 1) {
    for (let b = 0; b < N; b += 1) {
      for (let c = 0; c < N; c += 1) {
        for (let d = 0; d < N; d += 1) {
          let raised = 0
          for (let a2 = 0; a2 < N; a2 += 1) {
            for (let b2 = 0; b2 < N; b2 += 1) {
              for (let c2 = 0; c2 < N; c2 += 1) {
                for (let d2 = 0; d2 < N; d2 += 1) {
                  raised +=
                    gInv[a][a2] * gInv[b][b2] * gInv[c][c2] * gInv[d][d2] * lower[a2][b2][c2][d2]
                }
              }
            }
          }
          kretschmann += lower[a][b][c][d] * raised
        }
      }
    }
  }

  return { ricciScalar, kretschmann }
}
