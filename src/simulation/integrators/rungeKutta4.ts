/**
 * Integrador Runge-Kutta clássico de 4ª ordem (RK4).
 *
 * Referência: Hairer, Nørsett & Wanner, "Solving Ordinary Differential
 * Equations I" (1993), §II.1; Press et al., "Numerical Recipes", §17.1.
 *
 * Para dy/dλ = f(y) (sistema autônomo — caso da equação da geodésica, que
 * não depende explicitamente do parâmetro afim λ):
 *
 *   k₁ = f(y)
 *   k₂ = f(y + h/2 · k₁)
 *   k₃ = f(y + h/2 · k₂)
 *   k₄ = f(y + h · k₃)
 *   y(λ+h) = y + h/6 · (k₁ + 2k₂ + 2k₃ + k₄)
 *
 * Erro local O(h⁵), erro global O(h⁴). Não é simplético: em integrações muito
 * longas há deriva secular de invariantes — monitorada por
 * physics/relativity/validation.ts e mitigável futuramente com passo
 * adaptativo ou integradores simpléticos/estruturais.
 *
 * Módulo genérico: opera sobre qualquer vetor de estado, sem conhecer
 * relatividade nem renderização.
 */

export type DerivativeFunction = (state: readonly number[]) => number[]

/** Um passo de RK4 de tamanho `stepSize` (mesmas unidades do parâmetro da EDO). */
export function rungeKutta4Step(
  derivative: DerivativeFunction,
  state: readonly number[],
  stepSize: number,
): number[] {
  const dimension = state.length
  const k1 = derivative(state)

  const y2 = new Array<number>(dimension)
  for (let i = 0; i < dimension; i += 1) {
    y2[i] = state[i] + (stepSize / 2) * k1[i]
  }
  const k2 = derivative(y2)

  const y3 = new Array<number>(dimension)
  for (let i = 0; i < dimension; i += 1) {
    y3[i] = state[i] + (stepSize / 2) * k2[i]
  }
  const k3 = derivative(y3)

  const y4 = new Array<number>(dimension)
  for (let i = 0; i < dimension; i += 1) {
    y4[i] = state[i] + stepSize * k3[i]
  }
  const k4 = derivative(y4)

  const next = new Array<number>(dimension)
  for (let i = 0; i < dimension; i += 1) {
    next[i] = state[i] + (stepSize / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
  }

  return next
}
