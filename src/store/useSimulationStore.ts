import { create } from "zustand"
import { MISSION_BY_ID, type MissionId } from "../simulation/missions"
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
  /** Missão pedagógica ativa (modo descoberta). */
  activeMissionId: MissionId | null
  /** Missões concluídas (persistidas em localStorage). */
  completedMissions: MissionId[]
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
  setActiveMission: (missionId: MissionId | null) => void
  markMissionComplete: (missionId: MissionId) => void
  setRenderFps: (renderFps: number) => void
  requestRelativityReset: () => void
}

const INITIAL_SCENARIO: ScenarioId = "solar-light-deflection"

const MISSIONS_STORAGE_KEY = "cosmolab-missions-v1"

function loadCompletedMissions(): MissionId[] {
  try {
    const raw = localStorage.getItem(MISSIONS_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as MissionId[]) : []
    return parsed.filter((id) => MISSION_BY_ID.has(id))
  } catch {
    return []
  }
}

export const useSimulationStore = create<SimulationState>((set) => ({
  paused: false,
  activeScenarioId: INITIAL_SCENARIO,
  experimentParams: DEFAULT_EXPERIMENT_PARAMS[INITIAL_SCENARIO],
  relativitySnapshot: null,
  atlasMode: false,
  activeMissionId: null,
  completedMissions: loadCompletedMissions(),
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
  setActiveMission: (missionId) =>
    set((state) => {
      if (missionId === null) {
        return { activeMissionId: null }
      }
      const mission = MISSION_BY_ID.get(missionId)!
      // Entrar numa missão leva ao cenário dela (com o preset padrão).
      return {
        activeMissionId: missionId,
        atlasMode: false,
        activeScenarioId: mission.scenarioId,
        experimentParams: DEFAULT_EXPERIMENT_PARAMS[mission.scenarioId],
        relativitySnapshot: null,
        relativityResetNonce: state.relativityResetNonce + 1,
      }
    }),
  markMissionComplete: (missionId) =>
    set((state) => {
      if (state.completedMissions.includes(missionId)) {
        return state
      }
      const completedMissions = [...state.completedMissions, missionId]
      try {
        localStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(completedMissions))
      } catch {
        /* armazenamento indisponível: progresso vale só na sessão */
      }
      return { completedMissions }
    }),
  setRenderFps: (renderFps) => set({ renderFps }),
  requestRelativityReset: () =>
    set((state) => ({ relativityResetNonce: state.relativityResetNonce + 1 })),
}))
