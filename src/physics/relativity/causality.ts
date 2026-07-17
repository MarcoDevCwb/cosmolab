/**
 * Diagnóstico de causalidade — detector de curvas temporais fechadas (CTCs).
 *
 * Referências: Hawking & Ellis (1973), cap. 6; Gödel (1949);
 * Carter, Phys. Rev. 174, 1559 (1968) (região r < 0 de Kerr).
 *
 * Em cartas onde x³ = φ é PERIÓDICO (φ ~ φ + 2π), a curva
 * {x⁰, x¹, x² constantes; φ variando} é fechada por construção, com vetor
 * tangente ∂_φ. Sua natureza causal é o sinal de g_φφ:
 *
 *   g_φφ > 0  →  círculo ESPACIAL (normal)
 *   g_φφ = 0  →  círculo NULO (fronteira de causalidade)
 *   g_φφ < 0  →  círculo TEMPORAL FECHADO — uma CTC passa por este evento
 *
 * Esta é uma condição SUFICIENTE para violação de causalidade (existem
 * CTCs mais gerais que não são círculos de φ). O teste só se aplica quando
 * a carta declara x³ como o ângulo periódico φ; em cartas cartesianas ele é
 * marcado como não aplicável. Métricas do editor usam carta esférica.
 *
 * Nota física: uma CTC ser curva não-geodésica (caso de Gödel) significa
 * que percorrê-la exige aceleração própria — o espaço-tempo permite o
 * laço causal, mas não o oferece "de graça".
 */

import type { SpacetimeMetric } from "./metric"
import type { Vector4 } from "./tensor"

export type CausalityDiagnostic = {
  /** O teste só se aplica quando x³ representa um ângulo φ periódico. */
  applicable: boolean
  /** Norma g_φφ do círculo axial fechado no ponto [m²]. */
  azimuthalCircleNorm: number
  /** true quando g_φφ < 0: uma curva temporal fechada passa por aqui. */
  closedTimelikeCircle: boolean
}

export function causalityDiagnostic(
  metric: SpacetimeMetric,
  position: Vector4,
): CausalityDiagnostic {
  const gPhiPhi = metric.metric(position)[3][3]
  const applicable = metric.chart === "spherical" || metric.chart === "cylindrical"
  return {
    applicable,
    azimuthalCircleNorm: gPhiPhi,
    closedTimelikeCircle: applicable && gPhiPhi < 0,
  }
}
