import { create } from "zustand"
import type { CelestialBodyId, CelestialBodySnapshot } from "../types/celestial"

type SpeedPreset = {
  label: string
  daysPerSecond: number
}

type SimulationState = {
  paused: boolean
  timeScale: number
  simulationDays: number
  showOrbits: boolean
  showVectors: boolean
  selectedBodyId: CelestialBodyId
  bodySnapshots: Record<CelestialBodyId, CelestialBodySnapshot>
  setPaused: (paused: boolean) => void
  togglePaused: () => void
  setTimeScale: (timeScale: number) => void
  setSimulationDays: (simulationDays: number) => void
  toggleOrbits: () => void
  toggleVectors: () => void
  setSelectedBodyId: (selectedBodyId: CelestialBodyId) => void
  setBodySnapshots: (bodySnapshots: Record<CelestialBodyId, CelestialBodySnapshot>) => void
}

export const SPEED_PRESETS: SpeedPreset[] = [
  { label: "1h/s", daysPerSecond: 1 / 24 },
  { label: "6h/s", daysPerSecond: 0.25 },
  { label: "1d/s", daysPerSecond: 1 },
  { label: "7d/s", daysPerSecond: 7 },
  { label: "30d/s", daysPerSecond: 30 },
]

const EMPTY_SNAPSHOT: CelestialBodySnapshot = {
  distanceKm: 0,
  orbitalSpeedKmPerSecond: 0,
}

export const useSimulationStore = create<SimulationState>((set) => ({
  paused: false,
  timeScale: 0.25,
  simulationDays: 0,
  showOrbits: true,
  showVectors: true,
  selectedBodyId: "earth",
  bodySnapshots: {
    sun: { ...EMPTY_SNAPSHOT },
    earth: { ...EMPTY_SNAPSHOT },
    moon: { ...EMPTY_SNAPSHOT },
    mars: { ...EMPTY_SNAPSHOT },
  },
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((state) => ({ paused: !state.paused })),
  setTimeScale: (timeScale) => set({ timeScale }),
  setSimulationDays: (simulationDays) => set({ simulationDays }),
  toggleOrbits: () => set((state) => ({ showOrbits: !state.showOrbits })),
  toggleVectors: () => set((state) => ({ showVectors: !state.showVectors })),
  setSelectedBodyId: (selectedBodyId) => set({ selectedBodyId }),
  setBodySnapshots: (bodySnapshots) => set({ bodySnapshots }),
}))
