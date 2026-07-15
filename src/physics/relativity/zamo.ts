/**
 * Observadores ZAMO (Zero Angular Momentum Observers).
 *
 * Referência: Bardeen, Press & Teukolsky, ApJ 178, 347 (1972); MTW §33.4.
 *
 * Em espaços-tempos estacionários e axissimétricos com termo cruzado g_tφ
 * (ex.: Kerr), o observador de momento angular nulo (L = 0) NÃO fica parado
 * em relação ao infinito: ele é arrastado com velocidade angular
 *
 *   ω = dφ/dt = −g_tφ / g_φφ
 *
 * Significado físico: ω é a "velocidade de rotação do próprio espaço-tempo"
 * vista do infinito — o campo de arrasto de Lense–Thirring. Em Schwarzschild
 * (g_tφ = 0) resulta ω = 0, como deve ser.
 *
 * Unidades (convenção SI_LENGTH do motor): retorna dφ/d(ct) em [1/m];
 * multiplicar por c para obter dφ/dt em [rad/s].
 */

import type { SpacetimeMetric } from "./metric"
import type { Vector4 } from "./tensor"

/** ω do ZAMO em dφ/d(ct) [1/m] na posição dada. */
export function zamoAngularVelocityPerMeter(
  metric: SpacetimeMetric,
  position: Vector4,
): number {
  const g = metric.metric(position)
  if (g[3][3] === 0) {
    return 0
  }

  return -g[0][3] / g[3][3]
}
