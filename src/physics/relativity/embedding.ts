/**
 * Diagramas de imersão (embedding) da geometria espacial.
 *
 * Referência: L. Flamm, "Beiträge zur Einsteinschen Gravitationstheorie"
 * (1916); MTW, "Gravitation" (1973), §23.8.
 *
 * O paraboloide de Flamm imerge a fatia {t = const, θ = π/2} do exterior de
 * Schwarzschild no espaço euclidiano 3D: procura-se z(r) tal que a métrica
 * induzida da superfície de revolução coincida com a métrica espacial
 *
 *   dσ² = dr²/(1 - r_s/r) + r² dφ²
 *
 * Resolvendo (dz/dr)² = (1 - r_s/r)⁻¹ - 1 = r_s/(r - r_s):
 *
 *   z(r) = 2 √( r_s (r - r_s) ),   r ≥ r_s
 *
 * Significado físico: NÃO é uma "membrana de borracha" metafórica — as
 * distâncias medidas sobre esta superfície são exatamente as distâncias
 * próprias radiais do espaço de Schwarzschild. O "funil" que se forma perto
 * de r_s mostra o alongamento radial real do espaço. Para r_s = 0
 * (Minkowski) a superfície é o plano z = 0.
 *
 * Unidades SI: entradas e saída em metros.
 */

/** Altura z(r) do paraboloide de Flamm [m]. Definida apenas para r ≥ r_s. */
export function flammEmbeddingHeight(schwarzschildRadiusM: number, radiusM: number): number {
  if (schwarzschildRadiusM <= 0) {
    return 0
  }
  if (radiusM <= schwarzschildRadiusM) {
    // Borda do funil: a imersão termina no horizonte (z = 0 em r = r_s).
    return 0
  }

  return 2 * Math.sqrt(schwarzschildRadiusM * (radiusM - schwarzschildRadiusM))
}
