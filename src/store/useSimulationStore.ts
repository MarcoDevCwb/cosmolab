import { create } from "zustand"
import type { RelativitySnapshot } from "../simulation/simulationRunner"
import { DEFAULT_EXPERIMENT_PARAMS } from "../simulation/scenarios"
import type { ExperimentParams, ScenarioId } from "../simulation/scenarios"

/**
 * Estado global da UI do laboratório relativístico.
 * Contém apenas estado de interface, parâmetros escolhidos pelo usuário e
 * snapshots publicados pelo runner — nenhum cálculo físico acontece aqui.
 */
type SimulationState = {
  paused: boolean
  activeScenarioId: ScenarioId
  experimentParams: ExperimentParams
  relativitySnapshot: RelativitySnapshot | null
  /** Modo Atlas de Coordenadas: mesma física em duas cartas lado a lado. */
  atlasMode: boolean
  /** FPS medido pelo loop de renderização (telemetria de UI). */
  renderFps: number
  /** Incrementado a cada pedido de reinício do experimento. */
  relativityResetNonce: number
  setPaused: (paused: boolean) => void
  togglePaused: () => void
  setActiveScenarioId: (activeScenarioId: ScenarioId) => void
  /** Ajusta parâmetros do experimento; o runner é recriado com eles. */
  setExperimentParams: (partial: Partial<ExperimentParams>) => void
  /** Volta os parâmetros ao preset do cenário ativo. */
  resetExperimentParams: () => void
  /** Restaura cenário + parâmetros vindos de uma URL compartilhada. */
  hydrateExperiment: (scenarioId: ScenarioId, params: ExperimentParams) => void
  setRelativitySnapshot: (relativitySnapshot: RelativitySnapshot) => void
  setAtlasMode: (atlasMode: boolean) => void
  setRenderFps: (renderFps: number) => void
  requestRelativityReset: () => void
}

const INITIAL_SCENARIO: ScenarioId = "solar-light-deflection"

export const useSimulationStore = create<SimulationState>((set) => ({
  paused: false,
  activeScenarioId: INITIAL_SCENARIO,
  experimentParams: DEFAULT_EXPERIMENT_PARAMS[INITIAL_SCENARIO],
  relativitySnapshot: null,
  atlasMode: false,
  renderFps: 0,
  relativityResetNonce: 0,
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((state) => ({ paused: !state.paused })),
  setActiveScenarioId: (activeScenarioId) =>
    set((state) => ({
      activeScenarioId,
      experimentParams: DEFAULT_EXPERIMENT_PARAMS[activeScenarioId],
      relativitySnapshot: null,
      relativityResetNonce: state.relativityResetNonce + 1,
    })),
  setExperimentParams: (partial) =>
    set((state) => ({
      experimentParams: { ...state.experimentParams, ...partial },
    })),
  resetExperimentParams: () =>
    set((state) => ({
      experimentParams: DEFAULT_EXPERIMENT_PARAMS[state.activeScenarioId],
      relativityResetNonce: state.relativityResetNonce + 1,
    })),
  hydrateExperiment: (scenarioId, params) =>
    set((state) => ({
      activeScenarioId: scenarioId,
      experimentParams: params,
      relativitySnapshot: null,
      relativityResetNonce: state.relativityResetNonce + 1,
    })),
  setRelativitySnapshot: (relativitySnapshot) => set({ relativitySnapshot }),
  setAtlasMode: (atlasMode) =>
    set((state) => {
      // O Atlas compara a queda de Schwarzschild×PG: ao entrar, herda massa
      // e r₀ APENAS se fizerem sentido físico para esse par (vindo de Gödel,
      // massSolar = 0 derrubava a criação da métrica — tela preta).
      const current = state.experimentParams
      const experimentParams = atlasMode
        ? {
            ...DEFAULT_EXPERIMENT_PARAMS["schwarzschild-horizon"],
            massSolar:
              current.massSolar >= 0.1 && current.massSolar <= 1e9 ? current.massSolar : 10,
            startRadiusRs:
              current.startRadiusRs >= 1.2 && current.startRadiusRs <= 30
                ? current.startRadiusRs
                : 6,
          }
        : current
      return {
        atlasMode,
        experimentParams,
        relativityResetNonce: state.relativityResetNonce + 1,
      }
    }),
  setRenderFps: (renderFps) => set({ renderFps }),
  requestRelativityReset: () =>
    set((state) => ({ relativityResetNonce: state.relativityResetNonce + 1 })),
}))
