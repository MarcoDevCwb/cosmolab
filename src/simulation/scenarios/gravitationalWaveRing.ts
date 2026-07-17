/**
 * Cenário 12 — Onda gravitacional (pp-wave exata) × anel de massas.
 *
 * A geometria é a onda plana EXATA de Brinkmann (vácuo pleno para qualquer
 * perfil — o motor confere G_μν ≈ 0 DENTRO da onda). O perfil A(u) é ligado
 * a um CHIRP de inspiral tipo GW150914 pelo dicionário linearizado
 * A ≈ −½·d²h/du² (envelope lento) — rotulado como modelo de brinquedo
 * quadrupolar, não um template LVK.
 *
 * O que se vê e se mede (nada é animação):
 *
 * 1. UM ANEL DE 16 GEODÉSICAS REAIS respira nos padrões + e × — o desvio
 *    geodésico que o LIGO mede. Em Brinkmann, coordenadas transversais SÃO
 *    distância própria (g_xx = g_yy = 1): o movimento em tela é o físico.
 *    (No calibre TT seria o oposto: coordenadas paradas, métrica oscilando
 *    — mesma física, outra carta.)
 * 2. O STRAIN DIFERENCIAL h = ΔL_y/L − ΔL_x/L é lido das geodésicas como
 *    num interferômetro de dois braços, e comparado ao h₊(u) do perfil.
 * 3. VSI: R = 0 e K = 0 EXATOS na onda (invariantes polinomiais todos
 *    nulos) — nenhum "curvaturômetro escalar" detecta a onda; só o anel.
 * 4. FLUXO DE ISAACSON c³⟨ḣ²⟩/16πG: com o h real de GW150914 (~10⁻²¹),
 *    ≈ 3 mW/m² no pico — mais fluxo de energia que a Lua cheia.
 *
 * Escalas honestas: h é ampliado ~10¹⁹× para o anel ser visível e o tempo
 * corre ~75× mais devagar que o evento real. Frequências, massas e a forma
 * do chirp usam os números reais.
 */

import {
  GRAVITATIONAL_CONSTANT,
  SOLAR_MASS_KG,
  SPEED_OF_LIGHT,
} from "../../physics/constants"
import { buildInitialState } from "../../physics/relativity/initialConditions"
import { createPpWaveMetric } from "../../physics/relativity/metrics/ppWave"
import type { GeodesicState } from "../../physics/relativity/geodesic"
import type { ObservableTracker, ScenarioObservable } from "../observables"
import type { ExperimentParams, SimulationScenario } from "./types"

const C = SPEED_OF_LIGHT
const INV_SQRT2 = 1 / Math.SQRT2
/** Raio do anel de massas de teste [m] (≪ comprimento de onda ~10⁴ km). */
const RING_RADIUS_M = 1e6
const RING_COUNT = 16

/**
 * Chirp newtoniano de quadrupolo (Peters & Mathews 1963; Maggiore §4.1):
 *   f(T) = (1/π)·[5/(256·T)]^{3/8}·(GM_c/c³)^{−5/8},  T = tempo até coalescer
 *   φ(T) = φ_c − 2·[T/(5GM_c/c³)]^{5/8}
 *   h_env ∝ f^{2/3}, corte em f_ISCO ≈ 4400 Hz/(M_total/M☉), depois
 *   ringdown exponencial. Tudo em forma fechada e diferenciável por partes.
 */
function buildChirpWaveform(chirpMassSolar: number, peakStrain: number) {
  const eta = (GRAVITATIONAL_CONSTANT * chirpMassSolar * SOLAR_MASS_KG) / C ** 3 // GM_c/c³ [s]
  const totalMassSolar = 2 ** 1.2 * chirpMassSolar // iguais: M = 2^{6/5}·M_c
  const fCut = 4400 / totalMassSolar // f_gw na ISCO [Hz] (ordem de grandeza)

  // Janela: começa T_START antes da coalescência; o "merger" ocorre quando
  // f atinge fCut, bem antes de T = 0 (a divergência fica fora do domínio).
  const T_START = 0.28 // [s] reais de inspiral visível
  const tCut = 5 / (256 * (Math.PI * fCut) ** (8 / 3) * eta ** (5 / 3)) // [s]

  const frequencyAt = (T: number) =>
    (1 / Math.PI) * (5 / (256 * Math.max(T, tCut))) ** (3 / 8) * eta ** (-5 / 8)
  const phaseAt = (T: number) => -2 * (Math.max(T, tCut) / (5 * eta)) ** (5 / 8)
  const envelopeAt = (T: number) => peakStrain * (frequencyAt(T) / fCut) ** (2 / 3)

  // Ringdown: oscilação em f_ring com decaimento de poucos ciclos.
  const fRing = 1.4 * fCut
  const tauRing = 2.5 / fRing // [s]
  const RINGDOWN_WINDOW = 4 * tauRing // decaimento a e⁻⁴ ≈ 2%

  const totalSeconds = T_START - tCut + RINGDOWN_WINDOW
  const phaseAtMerger = phaseAt(tCut)

  // Ligação suave no início da janela: o trem de onda "chega" com rampa
  // adiabática (~2 ciclos) — o anel parte de espaço-tempo quieto e o
  // transiente de condição inicial fica desprezível.
  const RAMP_S = 0.06

  /** h₊ instantâneo e derivadas no tempo real t [s] desde o início da janela. */
  function strainAt(tS: number): { h: number; fHz: number; hEnv: number } {
    const ramp = tS <= 0 ? 0 : tS >= RAMP_S ? 1 : 0.5 * (1 - Math.cos((Math.PI * tS) / RAMP_S))
    const T = T_START - tS // tempo até a coalescência
    if (T > tCut) {
      return {
        h: ramp * envelopeAt(T) * Math.cos(phaseAt(T)),
        fHz: frequencyAt(T),
        hEnv: ramp * envelopeAt(T),
      }
    }
    const sinceMerger = tCut - T
    const decay = Math.exp(-sinceMerger / tauRing)
    return {
      h: peakStrain * decay * Math.cos(phaseAtMerger + 2 * Math.PI * fRing * sinceMerger),
      fHz: fRing,
      hEnv: peakStrain * decay,
    }
  }

  return { strainAt, totalSeconds, fCut, tStart: T_START, tCut }
}

export function createGravitationalWaveRingScenario(
  params: ExperimentParams,
): SimulationScenario {
  const chirpMassSolar = Math.min(Math.max(params.massSolar, 5), 120)
  const peakStrain = Math.min(Math.max(params.startRadiusRs, 0.005), 0.25)
  const mix = Math.min(Math.max(params.angularVelocityFraction, 0), 1)
  const mixAngle = (mix * Math.PI) / 2 // 0 = puro +, 1 = puro ×

  const waveform = buildChirpWaveform(chirpMassSolar, peakStrain)

  // Dicionário linearizado h → Brinkmann: A(u) ≈ −½·d²h/du² ≈ +½·k_u²·h
  // (envelope lento), com u = (x⁰ − z)/√2 ⇒ t = √2·u/c e k_u = 2πf·√2/c.
  // A geometria é EXATA para qualquer A(u); a aproximação está apenas na
  // correspondência com o h do chirp.
  const amplitudeAt = (u: number) => {
    const tS = (u * Math.SQRT2) / C
    const { h, fHz } = waveform.strainAt(tS)
    const kU = (2 * Math.PI * fHz * Math.SQRT2) / C
    return 0.5 * kU * kU * h
  }
  const PROFILE_DERIVATIVE_STEP_M = 30 // ≪ comprimento de onda (~10⁶ m em u)
  const metric = createPpWaveMetric((u) => {
    const a = amplitudeAt(u)
    const aPrime =
      (amplitudeAt(u + PROFILE_DERIVATIVE_STEP_M) - amplitudeAt(u - PROFILE_DERIVATIVE_STEP_M)) /
      (2 * PROFILE_DERIVATIVE_STEP_M)
    return {
      aPlus: a * Math.cos(mixAngle),
      aCross: a * Math.sin(mixAngle),
      aPlusPrime: aPrime * Math.cos(mixAngle),
      aCrossPrime: aPrime * Math.sin(mixAngle),
    }
  })

  // Geodésica principal: massa de teste no CENTRO do anel, em repouso
  // (H(u,0,0) = 0 ⇒ permanece na origem — o "espelho central").
  const initialState = buildInitialState(metric, [0, 0, 0, 0], [0, 0, 0], "timelike")

  // Anel de 16 geodésicas reais em repouso, no plano transverso x–y.
  const companions: GeodesicState[] = []
  for (let i = 0; i < RING_COUNT; i += 1) {
    const angle = (2 * Math.PI * i) / RING_COUNT
    companions.push(
      buildInitialState(
        metric,
        [0, RING_RADIUS_M * Math.cos(angle), RING_RADIUS_M * Math.sin(angle), 0],
        [0, 0, 0],
        "timelike",
      ),
    )
  }

  const totalCtM = waveform.totalSeconds * C
  const playbackSeconds = 26 // câmera lenta ≈ totalSeconds/26 ≈ 75×

  return {
    id: "gw-ring",
    label: "Onda gravitacional — anel",
    scientificStatus: "accepted-model",
    references: [
      "Brinkmann, H. W. — Math. Ann. 94, 119 (1925)",
      "Bondi, Pirani & Robinson — Proc. R. Soc. A 251, 519 (1959)",
      "Peters & Mathews — Phys. Rev. 131, 435 (1963)",
      "Isaacson, R. — Phys. Rev. 166, 1272 (1968)",
      "Abbott et al. (LIGO/Virgo) — PRL 116, 061102 (2016), GW150914",
    ],
    description:
      "Uma onda plana EXATA (Brinkmann) com perfil de chirp tipo GW150914 atravessa um anel de 16 geodésicas reais: o padrão +/× é desvio geodésico, não animação. O strain diferencial é lido do anel como num interferômetro. h ampliado ~10¹⁹× e tempo ~75× mais lento; frequências e massas são reais.",
    expectation:
      "Anel oscila em antifase (braços x e y); h medido segue o chirp: f cresce de ~30 Hz até o merger, depois ringdown. R = K = 0 exatos na onda (VSI).",

    metric,
    kind: "timelike",
    centralMassKg: null,
    schwarzschildRadiusM: null,

    initialState,
    companions,

    integrator: { method: "rk4" },
    stepLambdaM: totalCtM / 9000,
    lambdaRateMPerSecond: totalCtM / playbackSeconds,
    sampleIntervalLambdaM: totalCtM / 600,
    maxSamples: 700,
    renderScaleM: RING_RADIUS_M / 2.2,

    surface: "flat",
    diagnosticScaleM: [RING_RADIUS_M, RING_RADIUS_M, RING_RADIUS_M, RING_RADIUS_M],

    stopCondition: (state) => state[0] >= totalCtM,

    createObservables: () =>
      createGwRingTracker(
        (u) => waveform.strainAt((u * Math.SQRT2) / C),
        peakStrain,
        mixAngle,
      ),
  }
}

/**
 * Leitura interferométrica do anel: strain diferencial entre os braços
 * x (companheira 0) e y (companheira N/4), frequência instantânea e o
 * fluxo de energia de Isaacson (média de ciclo, ordem h² — rotulado).
 */
function createGwRingTracker(
  strainAtU: (u: number) => { h: number; fHz: number; hEnv: number },
  peakStrain: number,
  mixAngle: number,
): ObservableTracker {
  const ISAACSON_FACTOR = C ** 3 / (16 * Math.PI * GRAVITATIONAL_CONSTANT)
  /** Fluxo de GW150914 real no pico (h ≈ 1,0e-21 a 250 Hz) [W/m²]. */
  const GW150914_PEAK_STRAIN = 1.0e-21
  const GW150914_PEAK_FREQUENCY_HZ = 250
  const GW150914_FLUX_WM2 =
    ISAACSON_FACTOR *
    0.5 *
    (2 * Math.PI * GW150914_PEAK_FREQUENCY_HZ * GW150914_PEAK_STRAIN) ** 2

  return {
    update() {
      /* leitura direta do ensemble em read() */
    },
    read(state, companions): ScenarioObservable[] {
      const u = (state[0] - state[3]) * INV_SQRT2
      const { h, fHz, hEnv } = strainAtU(u)
      const hPlus = h * Math.cos(mixAngle)

      const observables: ScenarioObservable[] = []

      if (companions && companions.length >= 5) {
        const xArm = companions[0]
        const yArm = companions[companions.length / 4]
        // Em Brinkmann g_xx = g_yy = 1: distância coordenada transversal É
        // distância própria — a leitura é exata, sem aproximação de calibre.
        const lengthX = Math.hypot(xArm[1] - state[1], xArm[2] - state[2])
        const lengthY = Math.hypot(yArm[1] - state[1], yArm[2] - state[2])
        const measured = (lengthY - lengthX) / RING_RADIUS_M

        observables.push({
          id: "gw-strain",
          label: "Strain diferencial medido no anel",
          value: measured,
          unit: "ratio",
          provenance: "numeric",
          reference: hPlus,
          referenceLabel: "h₊(u) do perfil (dicionário linearizado, envelope lento)",
          regimeWarning:
            peakStrain > 0.15
              ? "h grande: correções não-lineares ao dicionário h↔A tornam-se visíveis"
              : undefined,
          hero: true,
        })
      }

      if (companions && companions.length >= 5) {
        // MEMÓRIA GRAVITACIONAL: desvio RMS do anel em relação ao círculo
        // inicial. Depois que a onda passa, NÃO volta a zero — soma de
        // memória de velocidade (Zel'dovich–Polnarev 1974) e focalização
        // acumulada (deriva ponderomotriz ∝ h², prevista ≈ −K²h²L·t²/32).
        let sumSquares = 0
        for (const companion of companions) {
          const radial =
            Math.hypot(companion[1] - state[1], companion[2] - state[2]) - RING_RADIUS_M
          sumSquares += (radial / RING_RADIUS_M) ** 2
        }
        observables.push({
          id: "gw-memory",
          label: "Desvio RMS do anel (memória + focalização)",
          value: Math.sqrt(sumSquares / companions.length),
          unit: "ratio",
          provenance: "numeric",
          referenceLabel:
            "após a onda passar, o anel NÃO volta ao círculo: memória de velocidade (Zel'dovich–Polnarev 1974) + focalização O(h²)",
        })
      }

      observables.push(
        {
          id: "gw-frequency",
          label: "Frequência da onda",
          value: fHz,
          unit: "hz",
          provenance: "analytic",
          referenceLabel: "chirp newtoniano de quadrupolo (corte na ISCO + ringdown)",
        },
        {
          id: "gw-isaacson-flux",
          label: "Fluxo de energia (Isaacson)",
          value: ISAACSON_FACTOR * 0.5 * (2 * Math.PI * fHz * hEnv) ** 2,
          unit: "wm2",
          provenance: "analytic",
          reference: GW150914_FLUX_WM2,
          referenceLabel:
            "GW150914 real (h ≈ 10⁻²¹): ≈ 3 mW/m² no pico — mais fluxo que a Lua cheia",
          regimeWarning: "h ampliado para visualização ⇒ fluxo ampliado ~10³⁸×",
          hero: true,
        },
      )

      return observables
    },
  }
}
