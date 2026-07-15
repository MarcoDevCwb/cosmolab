import { create } from "zustand"
import type { RelativitySnapshot } from "../simulation/simulationRunner"
import type { ScenarioId } from "../simulation/scenarios"

/**
 * Estado global da UI do laboratório relativístico.
 * Contém apenas estado de interface e snapshots publicados pelo runner —
 * nenhum cálculo físico acontece aqui.
 */
type SimulationState = {
  paused: boolean
  activeScenarioId: ScenarioId
  relativitySnapshot: RelativitySnapshot | null
  /** Incrementado a cada pedido de reinício do experimento. */
  relativityResetNonce: number
  setPaused: (paused: boolean) => void
  togglePaused: () => void
  setActiveScenarioId: (activeScenarioId: ScenarioId) => void
  setRelativitySnapshot: (relativitySnapshot: RelativitySnapshot) => void
  requestRelativityReset: () => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  paused: false,
  activeScenarioId: "solar-light-deflection",
  relativitySnapshot: null,
  relativityResetNonce: 0,
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((state) => ({ paused: !state.paused })),
  setActiveScenarioId: (activeScenarioId) =>
    set((state) => ({
      activeScenarioId,
      relativitySnapshot: null,
      relativityResetNonce: state.relativityResetNonce + 1,
    })),
  setRelativitySnapshot: (relativitySnapshot) => set({ relativitySnapshot }),
  requestRelativityReset: () =>
    set((state) => ({ relativityResetNonce: state.relativityResetNonce + 1 })),
}))
