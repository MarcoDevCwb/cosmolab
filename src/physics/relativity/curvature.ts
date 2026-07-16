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

/**
 * A "ETIQUETA DE PREÇO" DO ESPAÇO-TEMPO.
 *
 * Referências: Einstein (1915); Hawking & Ellis (1973), §4.3 (condições de
 * energia); Morris & Thorne, Am. J. Phys. 56, 395 (1988) (wormholes exigem
 * matéria exótica).
 *
 * Pelas equações de campo, G_μν = (8πG/c⁴)·T_μν: dado o tensor de Einstein
 * da métrica (que calculamos numericamente), a MATÉRIA necessária para
 * sustentá-la é T_μν = (c⁴/8πG)·G_μν. Este módulo responde, para qualquer
 * métrica — inclusive as escritas no editor:
 *
 * - densidade de energia ρ = T(û,û) medida por um observador local [J/m³];
 * - pressão radial p_r = T(ê_r,ê_r) [J/m³ = Pa];
 * - CONDIÇÃO NULA DE ENERGIA (NEC): T(k,k) ≥ 0 para vetores nulos k.
 *   É a mais fraca das condições clássicas: violá-la ⇒ matéria "exótica"
 *   (wormholes atravessáveis e warp drives vivem exatamente aí).
 *
 * O observador local û e a tétrade ortonormal {û, ê_r, ê_θ, ê_φ} são
 * construídos por Gram-Schmidt genérico: observador estático quando g_tt<0;
 * dentro de ergorregiões, o ZAMO (que sempre existe fora de horizontes).
 * Vetores nulos de teste: k = û ± ê_i (nulos por construção).
 */

export type MatterDiagnostic = {
  /** Densidade de energia local T(û,û) [J/m³]. ~0 em vácuo (Schwarzschild). */
  energyDensityJm3: number
  /** Pressão radial T(ê_r,ê_r) [J/m³ ≡ Pa]. */
  radialPressureJm3: number
  /** Mínimo de T(k,k) sobre os vetores nulos de teste [J/m³]. */
  necMinimumJm3: number
  /** NEC satisfeita (dentro da tolerância numérica)? false ⇒ matéria exótica. */
  nullEnergyConditionOk: boolean
  /** |ρ| e |p_r| abaixo da tolerância numérica: vácuo efetivo (ex.: Schwarzschild). */
  vacuum: boolean
  /** Observador usado: "static" (g_tt<0) ou "zamo" (ergorregião). */
  observer: "static" | "zamo"
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

/* ------------------------------------------------------------------ */
/* Tensor de Einstein e diagnóstico de matéria                         */
/* ------------------------------------------------------------------ */

import {
  GRAVITATIONAL_CONSTANT as G_NEWTON,
  SPEED_OF_LIGHT as C_LIGHT,
} from "../constants"

/** Fator das equações de campo: T = (c⁴/8πG)·G_μν [J/m³ por 1/m²]. */
const EINSTEIN_FACTOR = C_LIGHT ** 4 / (8 * Math.PI * G_NEWTON)

/** Produto interno g(a,b) com métrica covariante. */
function inner(g: number[][], a: number[], b: number[]): number {
  let sum = 0
  for (let mu = 0; mu < N; mu += 1) {
    for (let nu = 0; nu < N; nu += 1) {
      sum += g[mu][nu] * a[mu] * b[nu]
    }
  }
  return sum
}

/**
 * Diagnóstico de matéria no ponto: constrói G_μν = R_μν − ½R·g_μν a partir
 * do Riemann numérico, monta a tétrade local por Gram-Schmidt e avalia
 * densidade, pressão radial e a condição nula de energia.
 * Retorna null se nenhum observador local timelike foi encontrado
 * (ex.: dentro de horizontes na carta usada).
 */
export function matterDiagnostic(
  metric: SpacetimeMetric,
  position: Vector4,
  scaleFloor?: Vector4,
): MatterDiagnostic | null {
  const g = metric.metric(position)
  const gInv = metric.inverseMetric(position)
  const riemann = riemannTensor(metric, position, scaleFloor)

  // Ricci covariante e escalar.
  const ricci: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0))
  for (let sigma = 0; sigma < N; sigma += 1) {
    for (let nu = 0; nu < N; nu += 1) {
      let sum = 0
      for (let rho = 0; rho < N; rho += 1) {
        sum += riemann[rho][sigma][rho][nu]
      }
      ricci[sigma][nu] = sum
    }
  }
  let ricciScalar = 0
  for (let sigma = 0; sigma < N; sigma += 1) {
    for (let nu = 0; nu < N; nu += 1) {
      ricciScalar += gInv[sigma][nu] * ricci[sigma][nu]
    }
  }

  // Tensor de Einstein covariante.
  const einstein: number[][] = Array.from({ length: N }, (_, mu) =>
    Array.from({ length: N }, (_, nu) => ricci[mu][nu] - 0.5 * ricciScalar * g[mu][nu]),
  )
  const T = (a: number[], b: number[]) => {
    let sum = 0
    for (let mu = 0; mu < N; mu += 1) {
      for (let nu = 0; nu < N; nu += 1) {
        sum += einstein[mu][nu] * a[mu] * b[nu]
      }
    }
    return EINSTEIN_FACTOR * sum
  }

  // Observador local: estático se g_tt < 0; senão ZAMO (ω = −g_tφ/g_φφ).
  let observer: "static" | "zamo"
  let u: number[]
  if (g[0][0] < 0) {
    observer = "static"
    u = [1 / Math.sqrt(-g[0][0]), 0, 0, 0]
  } else {
    observer = "zamo"
    const omega = g[3][3] !== 0 ? -g[0][3] / g[3][3] : 0
    const norm = g[0][0] + 2 * g[0][3] * omega + g[3][3] * omega * omega
    if (norm >= 0) {
      return null
    }
    const uTime = 1 / Math.sqrt(-norm)
    u = [uTime, 0, 0, omega * uTime]
  }

  // Tétrade ortonormal por Gram-Schmidt sobre {∂_1, ∂_2, ∂_3}.
  const spatial: number[][] = []
  for (const axis of [1, 2, 3]) {
    const seed = [0, 0, 0, 0]
    seed[axis] = 1
    // Projeta fora de û (g(û,û) = −1) e dos ê anteriores (g(ê,ê) = +1).
    let v = [...seed]
    const vu = inner(g, v, u)
    v = v.map((component, index) => component + vu * u[index])
    for (const e of spatial) {
      const ve = inner(g, v, e)
      v = v.map((component, index) => component - ve * e[index])
    }
    const norm = inner(g, v, v)
    if (!(norm > 0)) {
      return null
    }
    const invSqrt = 1 / Math.sqrt(norm)
    spatial.push(v.map((component) => component * invSqrt))
  }

  const energyDensityJm3 = T(u, u)
  const radialPressureJm3 = T(spatial[0], spatial[0])

  // NEC sobre os 6 vetores nulos k = û ± ê_i.
  let necMinimumJm3 = Infinity
  for (const e of spatial) {
    for (const sign of [1, -1]) {
      const k = u.map((component, index) => component + sign * e[index])
      necMinimumJm3 = Math.min(necMinimumJm3, T(k, k))
    }
  }

  // Tolerância numérica: fração da escala local de curvatura (√K ou ρ).
  const scale =
    EINSTEIN_FACTOR *
    Math.sqrt(Math.abs(curvatureFromRiemann(riemann, g, gInv)))
  const tolerance = Math.max(1e-4 * scale, 1e-12)

  return {
    energyDensityJm3,
    radialPressureJm3,
    necMinimumJm3,
    nullEnergyConditionOk: necMinimumJm3 >= -tolerance,
    vacuum:
      Math.abs(energyDensityJm3) < tolerance && Math.abs(radialPressureJm3) < tolerance,
    observer,
  }
}

/** Kretschmann a partir de um Riemann já calculado (evita recomputar). */
function curvatureFromRiemann(
  riemann: number[][][][],
  g: number[][],
  gInv: number[][],
): number {
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
  return kretschmann
}
