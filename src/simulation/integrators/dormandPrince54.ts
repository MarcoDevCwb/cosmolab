/**
 * Integrador Dormand–Prince 5(4) com passo adaptativo.
 *
 * Referência: Dormand & Prince, "A family of embedded Runge-Kutta formulae",
 * J. Comp. Appl. Math. 6 (1980); Hairer, Nørsett & Wanner, "Solving ODEs I"
 * (1993), §II.5 (método DOPRI5, o mesmo do ode45 do MATLAB e solve_ivp).
 *
 * Um par embutido de ordens 5 e 4 fornece, a cada passo, uma estimativa do
 * erro local sem custo extra. O controlador ajusta o passo h para manter o
 * erro dentro das tolerâncias: perto do horizonte (região rígida) h encolhe
 * automaticamente; em regiões suaves h cresce — exatamente o comportamento
 * que o RK4 de passo fixo não tem.
 *
 * Módulo genérico sobre dy/dλ = f(y) (sistema autônomo — caso da geodésica).
 * Nenhuma dependência de física ou renderização.
 */

export type DerivativeFunction = (state: readonly number[]) => number[]

/* Coeficientes de Butcher de Dormand–Prince (1980). */
const A21 = 1 / 5
const A31 = 3 / 40
const A32 = 9 / 40
const A41 = 44 / 45
const A42 = -56 / 15
const A43 = 32 / 9
const A51 = 19372 / 6561
const A52 = -25360 / 2187
const A53 = 64448 / 6561
const A54 = -212 / 729
const A61 = 9017 / 3168
const A62 = -355 / 33
const A63 = 46732 / 5247
const A64 = 49 / 176
const A65 = -5103 / 18656
/* Pesos da solução de 5ª ordem (linha b = a7: propriedade FSAL). */
const B1 = 35 / 384
const B3 = 500 / 1113
const B4 = 125 / 192
const B5 = -2187 / 6784
const B6 = 11 / 84
/* Diferença b − b* (erro entre 5ª e 4ª ordens). */
const E1 = 71 / 57600
const E3 = -71 / 16695
const E4 = 71 / 1920
const E5 = -17253 / 339200
const E6 = 22 / 525
const E7 = -1 / 40

type StepAttempt = {
  next: number[]
  /** Norma do erro escalado: ≤ 1 significa passo aceitável. */
  errorNorm: number
}

/** Um passo tentativo de DP5(4) de tamanho h, com estimativa de erro. */
export function dormandPrince54Step(
  derivative: DerivativeFunction,
  state: readonly number[],
  h: number,
  absTol: number,
  relTol: number,
): StepAttempt {
  const n = state.length
  const k1 = derivative(state)

  const y2 = new Array<number>(n)
  for (let i = 0; i < n; i += 1) {
    y2[i] = state[i] + h * A21 * k1[i]
  }
  const k2 = derivative(y2)

  const y3 = new Array<number>(n)
  for (let i = 0; i < n; i += 1) {
    y3[i] = state[i] + h * (A31 * k1[i] + A32 * k2[i])
  }
  const k3 = derivative(y3)

  const y4 = new Array<number>(n)
  for (let i = 0; i < n; i += 1) {
    y4[i] = state[i] + h * (A41 * k1[i] + A42 * k2[i] + A43 * k3[i])
  }
  const k4 = derivative(y4)

  const y5 = new Array<number>(n)
  for (let i = 0; i < n; i += 1) {
    y5[i] = state[i] + h * (A51 * k1[i] + A52 * k2[i] + A53 * k3[i] + A54 * k4[i])
  }
  const k5 = derivative(y5)

  const y6 = new Array<number>(n)
  for (let i = 0; i < n; i += 1) {
    y6[i] =
      state[i] + h * (A61 * k1[i] + A62 * k2[i] + A63 * k3[i] + A64 * k4[i] + A65 * k5[i])
  }
  const k6 = derivative(y6)

  const next = new Array<number>(n)
  for (let i = 0; i < n; i += 1) {
    next[i] =
      state[i] + h * (B1 * k1[i] + B3 * k3[i] + B4 * k4[i] + B5 * k5[i] + B6 * k6[i])
  }
  const k7 = derivative(next)

  // Erro local = diferença entre as soluções de 5ª e 4ª ordem, escalada
  // componente a componente por absTol + relTol·|y| (norma RMS).
  let sum = 0
  for (let i = 0; i < n; i += 1) {
    const errorI =
      h *
      (E1 * k1[i] + E3 * k3[i] + E4 * k4[i] + E5 * k5[i] + E6 * k6[i] + E7 * k7[i])
    const scale = absTol + relTol * Math.max(Math.abs(state[i]), Math.abs(next[i]))
    sum += (errorI / scale) ** 2
  }

  return { next, errorNorm: Math.sqrt(sum / n) }
}

export type AdaptiveControllerOptions = {
  initialStep: number
  minStep: number
  maxStep: number
  absTol: number
  relTol: number
}

export type AdaptiveStats = {
  accepted: number
  rejected: number
  currentStep: number
}

/**
 * Controlador de passo padrão (Hairer I.4): fator 0,9·err^(−1/5),
 * limitado a [0,2; 5] por passo. Se h atinge o mínimo, o passo é aceito
 * mesmo assim (com o erro que houver) para não travar a simulação —
 * a UI exibe o erro de norma continuamente.
 */
export function createDormandPrince54Controller(
  derivative: DerivativeFunction,
  options: AdaptiveControllerOptions,
) {
  let h = options.initialStep
  let accepted = 0
  let rejected = 0

  return {
    get stats(): AdaptiveStats {
      return { accepted, rejected, currentStep: h }
    },

    /** Avança UM passo aceito de no máximo maxH; retorna estado e h consumido. */
    step(state: readonly number[], maxH: number): { next: number[]; consumed: number } {
      for (;;) {
        const trial = Math.min(h, maxH)
        const { next, errorNorm } = dormandPrince54Step(
          derivative,
          state,
          trial,
          options.absTol,
          options.relTol,
        )

        const factor = Math.min(
          Math.max(0.9 * (errorNorm > 0 ? errorNorm ** -0.2 : 5), 0.2),
          5,
        )

        if (errorNorm <= 1 || trial <= options.minStep) {
          accepted += 1
          h = Math.min(Math.max(trial * factor, options.minStep), options.maxStep)
          return { next, consumed: trial }
        }

        rejected += 1
        h = Math.max(trial * Math.min(factor, 0.9), options.minStep)
      }
    },
  }
}

export type DormandPrince54Controller = ReturnType<typeof createDormandPrince54Controller>
