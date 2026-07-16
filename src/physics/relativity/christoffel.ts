/**
 * Símbolos de Christoffel (conexão de Levi-Civita).
 *
 * Definição (ex.: Wald, "General Relativity", 1984, eq. 3.1.30):
 *
 *   Γ^μ_{αβ} = ½ g^{μν} (∂_α g_{νβ} + ∂_β g_{να} - ∂_ν g_{αβ})
 *
 * Significado físico: codificam como o transporte paralelo (e portanto a
 * "força gravitacional" aparente) emerge da variação espaço-temporal da
 * métrica. São a única entrada geométrica da equação da geodésica.
 *
 * Este módulo oferece o cálculo numérico genérico por diferenças finitas
 * centrais, permitindo que qualquer `SpacetimeMetric` funcione como plugin
 * sem Christoffels analíticos. Métricas com `christoffel()` analítico têm
 * prioridade (exato e mais barato) — ver `resolveChristoffel`.
 */

import type { SpacetimeMetric } from "./metric"
import type { Matrix4, Rank3, Vector4 } from "./tensor"
import { SPACETIME_DIMENSION, zeroRank3 } from "./tensor"

/**
 * Passo relativo de diferenciação: h = CBRT_EPS · max(|x|, piso).
 * cbrt(ε_máquina) ≈ 6e-6 minimiza erro combinado (truncamento + arredondamento)
 * em diferenças centrais de 2ª ordem (Numerical Recipes, §5.7).
 */
const CBRT_EPSILON = Math.cbrt(Number.EPSILON)

/**
 * Derivadas parciais ∂_σ g_{μν} por diferença finita central de 2ª ordem:
 *   ∂_σ g ≈ [g(x + h e_σ) - g(x - h e_σ)] / (2h)
 *
 * `scaleFloor` define o piso do passo por coordenada (evita h → 0 quando a
 * coordenada passa por zero); para coordenadas em metros use uma escala
 * característica do problema (ex.: r_s), para ângulos o valor 1 é adequado.
 */
export function metricPartialDerivatives(
  metric: SpacetimeMetric,
  position: Vector4,
  scaleFloor: Vector4 = [1, 1, 1, 1],
): Matrix4[] {
  const derivatives: Matrix4[] = []

  for (let sigma = 0; sigma < SPACETIME_DIMENSION; sigma += 1) {
    // Simetrias declaradas: ∂₀g = 0 (estacionária) e ∂₃g = 0 (axissimétrica)
    // são EXATAS — pular a diferença finita é mais rápido E mais preciso.
    if (
      (sigma === 0 && metric.symmetries?.stationary) ||
      (sigma === 3 && metric.symmetries?.axisymmetric)
    ) {
      derivatives.push([
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ])
      continue
    }

    const step = CBRT_EPSILON * Math.max(Math.abs(position[sigma]), scaleFloor[sigma])
    const forward: Vector4 = [...position]
    const backward: Vector4 = [...position]
    forward[sigma] += step
    backward[sigma] -= step

    const gForward = metric.metric(forward)
    const gBackward = metric.metric(backward)
    const derivative = gForward.map((row, mu) =>
      row.map((value, nu) => (value - gBackward[mu][nu]) / (2 * step)),
    )

    derivatives.push(derivative)
  }

  return derivatives
}

/**
 * Γ^μ_{αβ} numérico a partir da métrica e de sua inversa.
 * Precisão O(h²) ≈ 1e-11 relativa — suficiente para exploração de métricas
 * experimentais; para produção científica prefira Christoffels analíticos.
 */
export function christoffelFromMetric(
  metric: SpacetimeMetric,
  position: Vector4,
  scaleFloor?: Vector4,
): Rank3 {
  const inverse = metric.inverseMetric(position)
  const partials = metricPartialDerivatives(metric, position, scaleFloor)
  const gamma = zeroRank3()

  for (let mu = 0; mu < SPACETIME_DIMENSION; mu += 1) {
    for (let alpha = 0; alpha < SPACETIME_DIMENSION; alpha += 1) {
      for (let beta = alpha; beta < SPACETIME_DIMENSION; beta += 1) {
        let sum = 0
        for (let nu = 0; nu < SPACETIME_DIMENSION; nu += 1) {
          sum +=
            inverse[mu][nu] *
            (partials[alpha][nu][beta] + partials[beta][nu][alpha] - partials[nu][alpha][beta])
        }

        const value = 0.5 * sum
        gamma[mu][alpha][beta] = value
        // Simetria nos índices inferiores: Γ^μ_{αβ} = Γ^μ_{βα} (conexão sem torção).
        gamma[mu][beta][alpha] = value
      }
    }
  }

  return gamma
}

/**
 * Ponto único de acesso aos Christoffels: usa a forma analítica da métrica
 * quando disponível e cai para o cálculo numérico caso contrário.
 */
export function resolveChristoffel(
  metric: SpacetimeMetric,
  position: Vector4,
  scaleFloor?: Vector4,
): Rank3 {
  if (metric.christoffel) {
    return metric.christoffel(position)
  }

  return christoffelFromMetric(metric, position, scaleFloor)
}
