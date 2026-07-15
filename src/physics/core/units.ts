/**
 * Sistema de unidades do CosmoLab — declaração EXPLÍCITA da convenção.
 *
 * ============================================================
 * CONVENÇÃO ATUAL DO MOTOR: "SI-comprimento" (SI_LENGTH)
 * ============================================================
 * Todas as coordenadas de espaço-tempo carregam dimensão de COMPRIMENTO
 * em METROS:
 *   - x⁰ = c·t  [m]        (tempo × velocidade da luz)
 *   - x¹ = r    [m]
 *   - x², x³ = θ, φ [rad]  (adimensionais)
 *   - parâmetro afim λ [m]; para geodésicas timelike, λ = c·τ
 *   - massas entram via comprimentos geometrizados:
 *       M_geo = GM/c² [m]   e   r_s = 2GM/c² [m]
 *
 * Nessa convenção G e c NÃO aparecem nas equações de movimento (equivalente
 * a unidades geométricas G = c = 1 com comprimentos em metros); aparecem
 * apenas nas CONVERSÕES de fronteira (kg → m, s → m), feitas por este módulo
 * e por physics/constants.ts.
 *
 * Grandezas específicas (por unidade de massa) do motor:
 *   - E  adimensional  (= E/mc² para partículas massivas)
 *   - L  em metros     (= L/(mc))
 *
 * A UI exibe SI (km, s, M☉) e unidades geometrizadas (r_s, M) conforme a
 * legibilidade; TODA conversão deve passar pelos helpers abaixo — nunca
 * inline em componentes.
 */

import {
  GRAVITATIONAL_CONSTANT,
  SOLAR_MASS_KG,
  SPEED_OF_LIGHT,
  geometrizedMass,
  schwarzschildRadius,
} from "../constants"

/** Sistemas de unidades que o CosmoLab reconhece. */
export type UnitSystem =
  /** Coordenadas em metros, x⁰ = c·t (convenção atual do motor). */
  | "SI_LENGTH"
  /** Geométricas G = c = 1 com comprimentos em M (massa central = 1). */
  | "GEOMETRIZED_BY_MASS"
  /** SI puro (kg, m, s) — apenas em fronteiras de exibição/exportação. */
  | "SI"

/** Convenção vigente do motor científico. */
export const ENGINE_UNIT_SYSTEM: UnitSystem = "SI_LENGTH"

/** Rótulo curto para exibição na UI. */
export const UNIT_SYSTEM_LABELS: Record<UnitSystem, string> = {
  SI_LENGTH: "SI (x⁰ = ct em metros)",
  GEOMETRIZED_BY_MASS: "geométricas (G = c = 1, comprimentos em M)",
  SI: "SI",
}

/* ----------------------- Conversões de massa ----------------------- */

export function solarMassesToKg(massSolar: number): number {
  return massSolar * SOLAR_MASS_KG
}

export function kgToSolarMasses(massKg: number): number {
  return massKg / SOLAR_MASS_KG
}

/* ------------------- Conversões de comprimento --------------------- */

/** Metros → múltiplos do raio de Schwarzschild da massa dada. */
export function metersToRs(lengthM: number, massKg: number): number {
  return lengthM / schwarzschildRadius(massKg)
}

/** Múltiplos de r_s → metros, para a massa dada. */
export function rsToMeters(lengthRs: number, massKg: number): number {
  return lengthRs * schwarzschildRadius(massKg)
}

/** Metros → múltiplos de M_geo = GM/c² (convenção r/M da literatura). */
export function metersToGeometrizedMass(lengthM: number, massKg: number): number {
  return lengthM / geometrizedMass(massKg)
}

/* ---------------------- Conversões de tempo ------------------------ */

/** Comprimento de λ ou c·t [m] → segundos. */
export function lengthToSeconds(lengthM: number): number {
  return lengthM / SPEED_OF_LIGHT
}

/** Segundos → comprimento c·t [m]. */
export function secondsToLength(timeS: number): number {
  return timeS * SPEED_OF_LIGHT
}

/* --------------------------- Utilidades ---------------------------- */

/** GM [m³/s²] a partir da massa em kg (parâmetro gravitacional padrão). */
export function gravitationalParameter(massKg: number): number {
  return GRAVITATIONAL_CONSTANT * massKg
}
