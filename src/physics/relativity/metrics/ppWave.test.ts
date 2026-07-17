/**
 * pp-wave (Brinkmann): vácuo EXATO para qualquer perfil; invariantes
 * escalares todos nulos (VSI) embora o anel sinta a onda; p_v conservado;
 * e o desvio geodésico do anel reproduz a teoria linearizada (antifase e
 * amplitude h/2 por braço) — a redescoberta nº 3 do motor.
 */

import { describe, expect, it } from "vitest"
import { SPEED_OF_LIGHT } from "../../constants"
import { christoffelFromMetric } from "../christoffel"
import { curvatureInvariants, matterDiagnostic, riemannTensor } from "../curvature"
import { buildInitialState } from "../initialConditions"
import { createPpWaveMetric, killingMomentumV } from "./ppWave"
import type { PpWaveProfile } from "./ppWave"
import type { Vector4 } from "../tensor"

/** Onda monocromática: A₊ = A₀·cos(k·u), sem ×. */
function monochromatic(a0: number, kU: number): PpWaveProfile {
  return (u) => ({
    aPlus: a0 * Math.cos(kU * u),
    aCross: 0,
    aPlusPrime: -a0 * kU * Math.sin(kU * u),
    aCrossPrime: 0,
  })
}

const WAVELENGTH_U = 6e6 // λ_u [m]
const K_U = (2 * Math.PI) / WAVELENGTH_U
const H0 = 0.05 // strain alvo
const A0 = 0.5 * K_U * K_U * H0 // dicionário A = ½k²h
const L = 1e6 // raio do anel [m]

const metric = createPpWaveMetric(monochromatic(A0, K_U))
const scale: Vector4 = [L, L, L, L]

describe("métrica pp-wave (Brinkmann)", () => {
  it("Christoffels analíticos ≡ diferenças finitas", () => {
    const position: Vector4 = [0.3 * WAVELENGTH_U, 0.7 * L, -0.4 * L, 0.1 * L]
    const analytic = metric.christoffel!(position)
    const numeric = christoffelFromMetric(metric, position, scale)

    let maxScale = 0
    for (let mu = 0; mu < 4; mu += 1) {
      for (let a = 0; a < 4; a += 1) {
        for (let b = 0; b < 4; b += 1) {
          maxScale = Math.max(maxScale, Math.abs(analytic[mu][a][b]))
        }
      }
    }
    expect(maxScale).toBeGreaterThan(0)
    for (let mu = 0; mu < 4; mu += 1) {
      for (let a = 0; a < 4; a += 1) {
        for (let b = 0; b < 4; b += 1) {
          expect(Math.abs(numeric[mu][a][b] - analytic[mu][a][b]) / maxScale).toBeLessThan(1e-5)
        }
      }
    }
  })

  it("VÁCUO EXATO dentro da onda: T ≈ 0 embora Riemann ≠ 0", () => {
    const inWave: Vector4 = [0.2 * WAVELENGTH_U, 0.8 * L, 0.5 * L, 0]
    const matter = matterDiagnostic(metric, inWave, scale)
    expect(matter).not.toBeNull()
    expect(matter!.vacuum).toBe(true)

    // Riemann NÃO nulo: a onda é curvatura de verdade.
    const riemann = riemannTensor(metric, inWave, scale)
    let maxRiemann = 0
    for (let a = 0; a < 4; a += 1)
      for (let b = 0; b < 4; b += 1)
        for (let c = 0; c < 4; c += 1)
          for (let d = 0; d < 4; d += 1)
            maxRiemann = Math.max(maxRiemann, Math.abs(riemann[a][b][c][d]))
    expect(maxRiemann).toBeGreaterThan(0.1 * A0)
  })

  it("VSI: R e K nulos (invariantes cegos à onda — por isso LIGO mede distâncias)", () => {
    const inWave: Vector4 = [0.15 * WAVELENGTH_U, L, 0.3 * L, 0]
    const { ricciScalar, kretschmann } = curvatureInvariants(metric, inWave, scale)
    // Escala natural dos invariantes se NÃO fossem nulos: A² ~ (Riemann)².
    expect(Math.abs(kretschmann)).toBeLessThan(1e-6 * A0 * A0)
    expect(Math.abs(ricciScalar)).toBeLessThan(1e-6 * A0)
  })

  it("p_v = (u³ − u⁰)/√2 é conservado (Killing NULO da onda)", async () => {
    const { rungeKutta4Step } = await import("../../../simulation/integrators/rungeKutta4")
    const { createGeodesicDerivatives } = await import("../geodesic")

    const derivatives = createGeodesicDerivatives(metric)
    let state = buildInitialState(metric, [0, L, 0.4 * L, 0], [0, 0, 0], "timelike")
    const p0 = killingMomentumV(state)

    const step = WAVELENGTH_U / 400
    for (let i = 0; i < 1200; i += 1) {
      state = rungeKutta4Step(derivatives, state, step)
    }
    expect(Math.abs(killingMomentumV(state) - p0) / Math.abs(p0)).toBeLessThan(1e-10)
  })

  it("REDESCOBERTA: o anel reproduz a teoria linearizada — antifase e amplitude h/2 por braço", async () => {
    const { rungeKutta4Step } = await import("../../../simulation/integrators/rungeKutta4")
    const { createGeodesicDerivatives } = await import("../geodesic")

    // h pequeno para isolar o regime linear (o teste de Penrose adiante
    // cobre o regime não-linear).
    const H0 = 2e-3
    const linearMetric = createPpWaveMetric(monochromatic(0.5 * K_U * K_U * H0, K_U))
    const derivatives = createGeodesicDerivatives(linearMetric)

    // Braço x, braço y e partícula a 45° (sensível apenas à polarização ×).
    let armX = buildInitialState(linearMetric, [0, L, 0, 0], [0, 0, 0], "timelike")
    let armY = buildInitialState(linearMetric, [0, 0, L, 0], [0, 0, 0], "timelike")
    let arm45 = buildInitialState(
      linearMetric,
      [0, L * Math.SQRT1_2, L * Math.SQRT1_2, 0],
      [0, 0, 0],
      "timelike",
    )

    // Partindo do repouso no pico de A, a solução linear é offset +
    // oscilação: x = L·[1 − ε + ε·cos(Ωu)] — o observável limpo é o
    // PICO-A-PICO/2 = ε·L = (h/2)·L, independente da fase inicial.
    // (Janela curta e h pequeno: a deriva ponderomotriz O(h²·t²) — a
    // focalização de Penrose, testada adiante — fica desprezível.)
    const step = WAVELENGTH_U / 600
    let maxDx = -Infinity
    let minDx = Infinity
    let antiphaseViolated = false
    let max45Radial = 0
    for (let i = 0; i < 1200; i += 1) {
      armX = rungeKutta4Step(derivatives, armX, step)
      armY = rungeKutta4Step(derivatives, armY, step)
      arm45 = rungeKutta4Step(derivatives, arm45, step)

      const dx = armX[1] - L
      const dy = armY[2] - L
      maxDx = Math.max(maxDx, dx)
      minDx = Math.min(minDx, dx)
      // Antifase: os desvios dos braços nunca têm o mesmo sinal com
      // magnitude significativa (offsets de IC são simétricos e opostos).
      if (Math.abs(dx) > 0.2 * (H0 / 2) * L && dx * dy > 0) {
        antiphaseViolated = true
      }
      const radial45 = Math.hypot(arm45[1], arm45[2]) - L
      max45Radial = Math.max(max45Radial, Math.abs(radial45))
    }

    const amplitude = (maxDx - minDx) / 2
    expect(amplitude / L / (H0 / 2)).toBeGreaterThan(0.97)
    expect(amplitude / L / (H0 / 2)).toBeLessThan(1.03)
    expect(antiphaseViolated).toBe(false)
    // A 45°, a polarização + não muda a distância radial (só a × mudaria):
    // resposta radial ≪ resposta dos braços.
    expect(max45Radial).toBeLessThan(0.05 * amplitude)
  })

  it("FOCALIZAÇÃO DE PENROSE: a onda ATRAI as massas — contração secular ∝ h²", async () => {
    const { rungeKutta4Step } = await import("../../../simulation/integrators/rungeKutta4")
    const { createGeodesicDerivatives } = await import("../geodesic")

    // O ponto MÉDIO da oscilação deriva para DENTRO com aceleração média
    // ⟨ẍ⟩ ≈ −¼A₀εx (força ponderomotriz): efeito O(h²) — o mesmo mecanismo
    // da focalização de geodésicas em ondas exatas (Penrose 1965). É a
    // versão em geodésicas do "a onda carrega energia" de Bondi.
    // Média de x sobre um ciclo: remove a oscilação e o offset de condição
    // inicial (constantes); o que sobra é a deriva secular acumulada entre
    // o primeiro e o último ciclo.
    const cycleMeanDrift = (h0: number): number => {
      const a0 = 0.5 * K_U * K_U * h0
      const testMetric = createPpWaveMetric(monochromatic(a0, K_U))
      const derivatives = createGeodesicDerivatives(testMetric)
      let arm = buildInitialState(testMetric, [0, L, 0, 0], [0, 0, 0], "timelike")
      const stepsPerCycle = 600
      const step = WAVELENGTH_U / stepsPerCycle
      const totalSteps = 6 * stepsPerCycle
      let firstCycleMean = 0
      let lastCycleMean = 0
      for (let i = 0; i < totalSteps; i += 1) {
        arm = rungeKutta4Step(derivatives, arm, step)
        if (i < stepsPerCycle) {
          firstCycleMean += (arm[1] - L) / stepsPerCycle
        }
        if (i >= totalSteps - stepsPerCycle) {
          lastCycleMean += (arm[1] - L) / stepsPerCycle
        }
      }
      return lastCycleMean - firstCycleMean
    }

    const driftSmall = cycleMeanDrift(0.02)
    const driftLarge = cycleMeanDrift(0.04)
    // Contração (para dentro) em ambos, escalando ≈ 4× para h duplicado.
    expect(driftSmall).toBeLessThan(0)
    expect(driftLarge).toBeLessThan(0)
    expect(driftLarge / driftSmall).toBeGreaterThan(3)
    expect(driftLarge / driftSmall).toBeLessThan(5)
  })
})

describe("cenário 12 — onda gravitacional × anel", () => {
  it("chirp: strain medido segue h₊, frequência cresce e o anel sobrevive ao merger", async () => {
    const { GeodesicSimulationRunner } = await import("../../../simulation/simulationRunner")
    const { createScenario, DEFAULT_EXPERIMENT_PARAMS } = await import(
      "../../../simulation/scenarios"
    )

    // h menor que o default visual: testa o dicionário h↔A no regime em
    // que ele vale (as correções não-lineares O(h) são cobertas pelo teste
    // de focalização; o default 0,09 exibe-as de propósito na tela).
    const params = { ...DEFAULT_EXPERIMENT_PARAMS["gw-ring"], startRadiusRs: 0.03 }
    const scenario = createScenario("gw-ring", params)
    const runner = new GeodesicSimulationRunner(scenario)

    const totalCt = 0.45 * SPEED_OF_LIGHT
    const measuredSeries: number[] = []
    const referenceSeries: number[] = []
    let earlyFrequency = Number.NaN
    let frequencyAtMostSamples = Number.NaN
    for (let i = 0; i < 280 && !runner.snapshot().halted; i += 1) {
      runner.advanceLambda(totalCt / 200)
      const snapshot = runner.snapshot()
      const strain = snapshot.observables.find((o) => o.id === "gw-strain")
      const frequency = snapshot.observables.find((o) => o.id === "gw-frequency")!
      if (i === 10) {
        earlyFrequency = frequency.value
      }
      // Compara apenas a fase de inspiral (após o merger, o efeito de
      // MEMÓRIA — deslocamento/velocidade residuais — é física real que a
      // referência instantânea não descreve).
      if (frequency.value < 0.9 * (4400 / (2 ** 1.2 * params.massSolar) )
        && strain && Number.isFinite(strain.reference ?? Number.NaN)) {
        measuredSeries.push(strain.value)
        referenceSeries.push(strain.reference!)
        frequencyAtMostSamples = frequency.value
      }
    }

    // Correlação de Pearson medido × referência durante a inspiral, APÓS
    // remover a tendência linear de cada série (o mesmo papel do high-pass
    // do LIGO): o h exagerado produz uma deriva secular real — os braços
    // deslocam-se em z com sinais opostos (H_u ∝ ±A₊·L²) e dessincronizam
    // de fase em O(h²) — que não é o observável oscilatório em teste.
    const n = measuredSeries.length
    expect(n).toBeGreaterThan(60)
    const detrend = (xs: number[]): number[] => {
      const count = xs.length
      let sumT = 0
      let sumX = 0
      let sumTT = 0
      let sumTX = 0
      for (let i = 0; i < count; i += 1) {
        sumT += i
        sumX += xs[i]
        sumTT += i * i
        sumTX += i * xs[i]
      }
      const slope = (count * sumTX - sumT * sumX) / (count * sumTT - sumT * sumT)
      const intercept = (sumX - slope * sumT) / count
      return xs.map((x, i) => x - intercept - slope * i)
    }
    const measured = detrend(measuredSeries)
    const reference = detrend(referenceSeries)
    let covariance = 0
    let varM = 0
    let varR = 0
    for (let i = 0; i < n; i += 1) {
      covariance += measured[i] * reference[i]
      varM += measured[i] ** 2
      varR += reference[i] ** 2
    }
    const correlation = covariance / Math.sqrt(varM * varR)
    expect(correlation).toBeGreaterThan(0.9)
    // Amplitudes na mesma escala (desvios não-lineares O(h) tolerados).
    const amplitudeRatio = Math.sqrt(varM / varR)
    expect(amplitudeRatio).toBeGreaterThan(0.7)
    expect(amplitudeRatio).toBeLessThan(1.4)

    const finalSnapshot = runner.snapshot()
    expect(finalSnapshot.halted).toBe(true)
    expect(finalSnapshot.haltReason).toBe("stop-condition")
    // O chirp varreu para cima (partiu de ~30 Hz).
    expect(earlyFrequency).toBeLessThan(45)
    expect(frequencyAtMostSamples).toBeGreaterThan(earlyFrequency)
    // Ensemble exposto no snapshot (16 posições) e MEMÓRIA: o anel não
    // volta ao círculo inicial após a onda passar (Zel'dovich–Polnarev
    // 1974; memória de velocidade em ondas exatas).
    expect(finalSnapshot.companionPositions).toHaveLength(16)
    let maxResidual = 0
    finalSnapshot.companionPositions.forEach((position, index) => {
      const angle = (2 * Math.PI * index) / 16
      const residual = Math.hypot(
        position[1] - 1e6 * Math.cos(angle),
        position[2] - 1e6 * Math.sin(angle),
      )
      maxResidual = Math.max(maxResidual, residual)
    })
    expect(maxResidual).toBeGreaterThan(1e-4 * 1e6 * params.startRadiusRs)
  })
})
