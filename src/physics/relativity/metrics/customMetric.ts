/**
 * Métricas personalizadas — geometrias definidas pelo usuário como texto.
 *
 * O usuário fornece expressões para as componentes independentes de uma
 * métrica estacionária em coordenadas esféricas (ct, r, θ, φ):
 *
 *   g_tt, g_tφ, g_rr, g_θθ, g_φφ   (demais componentes nulas; simetria imposta)
 *
 * Variáveis disponíveis: ct, r, theta, phi [m/rad] e M = GM/c² [m]
 * (massa geometrizada da massa escolhida no slider). Funções: sqrt, sin,
 * cos, tan, pow, abs, exp, log e a constante PI.
 *
 * O MOTOR NÃO PRECISA DE MAIS NADA: inversa por Gauss-Jordan (tensor.ts),
 * Christoffels por diferenças finitas (christoffel.ts) e integração
 * DP5(4). A validação numérica contínua (norma, constantes de Killing)
 * é o termômetro de confiabilidade exibido ao usuário.
 *
 * Status científico: SPECULATIVE por definição — a UI rotula assim.
 * As expressões são compiladas com `new Function` e executadas apenas no
 * navegador do próprio usuário (mesmo modelo de risco de uma calculadora).
 */

import { geometrizedMass } from "../../constants"
import type { CoordinateBound, SpacetimeMetric } from "../metric"
import type { Matrix4, Vector4 } from "../tensor"
import { invertMatrix4 } from "../tensor"

export type CustomMetricDefinition = {
  name: string
  /** Expressões JS das componentes covariantes. */
  gtt: string
  gtphi: string
  grr: string
  gthth: string
  gphph: string
}

export type CustomMetricValidation = { ok: true } | { ok: false; error: string }

/** Preset inicial: Schwarzschild em função de M (r_s = 2M). */
export const DEFAULT_CUSTOM_METRIC: CustomMetricDefinition = {
  name: "Schwarzschild (editável)",
  gtt: "-(1 - 2*M/r)",
  gtphi: "0",
  grr: "1/(1 - 2*M/r)",
  gthth: "r*r",
  gphph: "r*r*sin(theta)*sin(theta)",
}

type ComponentFunction = (
  ct: number,
  r: number,
  theta: number,
  phi: number,
  M: number,
) => number

const HELPER_NAMES = ["sqrt", "sin", "cos", "tan", "pow", "abs", "exp", "log", "PI"] as const
const HELPERS = [
  Math.sqrt,
  Math.sin,
  Math.cos,
  Math.tan,
  Math.pow,
  Math.abs,
  Math.exp,
  Math.log,
  Math.PI,
] as const

function compileComponent(label: string, expression: string): ComponentFunction {
  if (!expression.trim()) {
    throw new Error(`componente ${label} vazia`)
  }

  let compiled: (...args: number[]) => number
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const factory = new Function(
      "ct",
      "r",
      "theta",
      "phi",
      "M",
      ...HELPER_NAMES,
      `"use strict"; return (${expression});`,
    )
    compiled = (ct, r, theta, phi, M) => factory(ct, r, theta, phi, M, ...HELPERS) as number
  } catch (error) {
    throw new Error(`${label}: sintaxe inválida — ${(error as Error).message}`)
  }

  return compiled
}

type CompiledDefinition = {
  gtt: ComponentFunction
  gtphi: ComponentFunction
  grr: ComponentFunction
  gthth: ComponentFunction
  gphph: ComponentFunction
}

function compileDefinition(definition: CustomMetricDefinition): CompiledDefinition {
  return {
    gtt: compileComponent("g_tt", definition.gtt),
    gtphi: compileComponent("g_tφ", definition.gtphi),
    grr: compileComponent("g_rr", definition.grr),
    gthth: compileComponent("g_θθ", definition.gthth),
    gphph: compileComponent("g_φφ", definition.gphph),
  }
}

/**
 * Valida a definição: compila e checa assinatura Lorentziana num ponto de
 * teste assintótico (r = 50 M): g_tt < 0, componentes espaciais > 0,
 * determinante do bloco t–φ negativo e tudo finito.
 */
export function validateCustomMetric(definition: CustomMetricDefinition): CustomMetricValidation {
  try {
    const compiled = compileDefinition(definition)
    const M = 1e4 // ponto de teste com massa geometrizada arbitrária [m]
    const args: [number, number, number, number, number] = [0, 50 * M, 1.1, 0.3, M]

    const values = {
      "g_tt": compiled.gtt(...args),
      "g_tφ": compiled.gtphi(...args),
      "g_rr": compiled.grr(...args),
      "g_θθ": compiled.gthth(...args),
      "g_φφ": compiled.gphph(...args),
    }

    for (const [label, value] of Object.entries(values)) {
      if (!Number.isFinite(value)) {
        return { ok: false, error: `${label} não é finita no ponto de teste (r = 50 M).` }
      }
    }
    if (values["g_tt"] >= 0) {
      return { ok: false, error: "g_tt deve ser negativa longe da massa (assinatura −,+,+,+)." }
    }
    if (values["g_rr"] <= 0 || values["g_θθ"] <= 0 || values["g_φφ"] <= 0) {
      return { ok: false, error: "g_rr, g_θθ e g_φφ devem ser positivas (assinatura −,+,+,+)." }
    }
    if (values["g_tt"] * values["g_φφ"] - values["g_tφ"] ** 2 >= 0) {
      return { ok: false, error: "bloco t–φ não Lorentziano: g_tt·g_φφ − g_tφ² deve ser < 0." }
    }

    return { ok: true }
  } catch (error) {
    return { ok: false, error: (error as Error).message }
  }
}

export type CustomMetric = SpacetimeMetric & {
  readonly definition: CustomMetricDefinition
  readonly geometrizedMassM: number
}

/** Constrói a métrica plugável a partir da definição validada. */
export function createCustomMetric(
  definition: CustomMetricDefinition,
  massKg: number,
): CustomMetric {
  const compiled = compileDefinition(definition)
  const geoMass = geometrizedMass(massKg)

  // Simetrias autodetectadas: se nenhuma expressão referencia ct/phi,
  // as derivadas correspondentes são exatamente nulas.
  const allExpressions = [
    definition.gtt,
    definition.gtphi,
    definition.grr,
    definition.gthth,
    definition.gphph,
  ].join(" ")
  const stationary = !/\bct\b/.test(allExpressions)
  const axisymmetric = !/\bphi\b/.test(allExpressions)

  const metricAt = (position: Vector4): Matrix4 => {
    const [ct, r, theta, phi] = position
    const gtphi = compiled.gtphi(ct, r, theta, phi, geoMass)

    return [
      [compiled.gtt(ct, r, theta, phi, geoMass), 0, 0, gtphi],
      [0, compiled.grr(ct, r, theta, phi, geoMass), 0, 0],
      [0, 0, compiled.gthth(ct, r, theta, phi, geoMass), 0],
      [gtphi, 0, 0, compiled.gphph(ct, r, theta, phi, geoMass)],
    ]
  }

  return {
    name: `Personalizada — ${definition.name}`,
    coordinates: ["ct", "r", "θ", "φ"],
    chart: "spherical",
    symmetries: { stationary, axisymmetric },
    definition,
    geometrizedMassM: geoMass,

    metric: metricAt,

    // Sem forma analítica conhecida: inversa por Gauss-Jordan genérico.
    inverseMetric(position: Vector4): Matrix4 {
      return invertMatrix4(metricAt(position))
    },

    coordinateBounds(): [CoordinateBound, CoordinateBound, CoordinateBound, CoordinateBound] {
      return [
        { min: -Infinity, max: Infinity },
        // Domínio máximo: singularidades da métrica do usuário interrompem
        // a integração via NaN/limites (motivo exibido como "fora do domínio").
        { min: 0, max: Infinity },
        { min: 0, max: Math.PI },
        { min: -Infinity, max: Infinity },
      ]
    },
  }
}
