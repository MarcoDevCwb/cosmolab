/**
 * Álgebra tensorial mínima em 4 dimensões para o motor de métricas.
 *
 * Representações:
 * - `Matrix4`: tensor de posto 2 como matriz 4×4 (`m[linha][coluna]`).
 * - `Rank3`: tensor de posto 3 (ex.: símbolos de Christoffel Γ^μ_{αβ},
 *   indexado como `gamma[mu][alpha][beta]`).
 *
 * Nenhuma dependência externa: este módulo é matemática pura.
 */

export type Vector4 = [number, number, number, number]
export type Matrix4 = number[][]
export type Rank3 = number[][][]

export const SPACETIME_DIMENSION = 4

export function zeroMatrix4(): Matrix4 {
  return [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]
}

export function zeroRank3(): Rank3 {
  return [zeroMatrix4(), zeroMatrix4(), zeroMatrix4(), zeroMatrix4()]
}

/**
 * Inversão de matriz 4×4 por eliminação de Gauss-Jordan com pivoteamento
 * parcial. Suficiente para métricas gerais fornecidas como "plugin";
 * métricas diagonais devem preferir inversas analíticas.
 *
 * Lança erro se a matriz for singular (det ≈ 0), o que para uma métrica
 * indica coordenadas fora do domínio de validade (ex.: r = r_s em
 * coordenadas de Schwarzschild).
 */
export function invertMatrix4(matrix: Matrix4): Matrix4 {
  const size = SPACETIME_DIMENSION
  const augmented = matrix.map((row, rowIndex) => [
    ...row,
    ...Array.from({ length: size }, (_, columnIndex) => (columnIndex === rowIndex ? 1 : 0)),
  ])

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
    let bestRow = pivotIndex
    for (let rowIndex = pivotIndex + 1; rowIndex < size; rowIndex += 1) {
      if (Math.abs(augmented[rowIndex][pivotIndex]) > Math.abs(augmented[bestRow][pivotIndex])) {
        bestRow = rowIndex
      }
    }

    const pivotValue = augmented[bestRow][pivotIndex]
    if (Math.abs(pivotValue) < 1e-30) {
      throw new Error("Métrica singular: matriz não invertível nas coordenadas atuais.")
    }

    if (bestRow !== pivotIndex) {
      const temporary = augmented[pivotIndex]
      augmented[pivotIndex] = augmented[bestRow]
      augmented[bestRow] = temporary
    }

    const pivotRow = augmented[pivotIndex]
    for (let columnIndex = 0; columnIndex < 2 * size; columnIndex += 1) {
      pivotRow[columnIndex] /= pivotValue
    }

    for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
      if (rowIndex === pivotIndex) {
        continue
      }

      const factor = augmented[rowIndex][pivotIndex]
      if (factor === 0) {
        continue
      }

      for (let columnIndex = 0; columnIndex < 2 * size; columnIndex += 1) {
        augmented[rowIndex][columnIndex] -= factor * pivotRow[columnIndex]
      }
    }
  }

  return augmented.map((row) => row.slice(size))
}

/**
 * Contração dupla g_{μν} a^μ b^ν.
 *
 * Uso principal: norma da quadrivelocidade g_{μν} u^μ u^ν, invariante que o
 * integrador deve conservar (0 para fótons, -1 para partículas massivas na
 * assinatura (-,+,+,+) com λ = c·τ).
 */
export function contractBilinear(metric: Matrix4, a: Vector4, b: Vector4): number {
  let sum = 0
  for (let mu = 0; mu < SPACETIME_DIMENSION; mu += 1) {
    for (let nu = 0; nu < SPACETIME_DIMENSION; nu += 1) {
      sum += metric[mu][nu] * a[mu] * b[nu]
    }
  }

  return sum
}

/**
 * Contração Γ^μ_{αβ} u^α u^β para cada μ — o termo de força geodésica.
 */
export function contractRank3WithVector(gamma: Rank3, u: Vector4): Vector4 {
  const result: Vector4 = [0, 0, 0, 0]
  for (let mu = 0; mu < SPACETIME_DIMENSION; mu += 1) {
    let sum = 0
    for (let alpha = 0; alpha < SPACETIME_DIMENSION; alpha += 1) {
      for (let beta = 0; beta < SPACETIME_DIMENSION; beta += 1) {
        sum += gamma[mu][alpha][beta] * u[alpha] * u[beta]
      }
    }
    result[mu] = sum
  }

  return result
}
