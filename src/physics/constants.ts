/**
 * Constantes físicas fundamentais em unidades SI.
 *
 * Referências:
 * - CODATA 2018 (https://physics.nist.gov/cuu/Constants/)
 * - IAU 2015 Resolution B3 (valores nominais solares)
 *
 * Convenção do núcleo relativístico do CosmoLab:
 * - Coordenadas de espaço-tempo carregam dimensão de comprimento (metros).
 *   A coordenada temporal é x⁰ = c·t, de modo que todas as componentes do
 *   tensor métrico adimensionais/`m²` fiquem bem condicionadas numericamente.
 */

/** Velocidade da luz no vácuo c [m/s]. Valor exato por definição do SI. */
export const SPEED_OF_LIGHT = 299_792_458

/** Constante gravitacional de Newton G [m³ kg⁻¹ s⁻²]. CODATA 2018. */
export const GRAVITATIONAL_CONSTANT = 6.674_30e-11

/** Massa solar nominal M☉ [kg]. IAU 2015 B3 (GM☉ / G). */
export const SOLAR_MASS_KG = 1.988_47e30

/** Raio solar nominal R☉ [m]. IAU 2015 B3. */
export const SOLAR_RADIUS_M = 6.957e8

/**
 * Raio de Schwarzschild r_s = 2GM/c² [m].
 *
 * Significado físico: escala gravitacional natural da solução exterior de
 * Schwarzschild. É o raio do horizonte na extensão de buraco negro; para uma
 * estrela com superfície R > r_s (como o Sol), não existe horizonte físico.
 */
export function schwarzschildRadius(massKg: number): number {
  return (2 * GRAVITATIONAL_CONSTANT * massKg) / (SPEED_OF_LIGHT * SPEED_OF_LIGHT)
}

/**
 * Parâmetro de massa geometrizado GM/c² [m] (metade do raio de Schwarzschild).
 * É a massa expressa em unidades de comprimento, usual em relatividade numérica.
 */
export function geometrizedMass(massKg: number): number {
  return schwarzschildRadius(massKg) / 2
}
