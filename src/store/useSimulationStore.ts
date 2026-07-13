import { create } from "zustand"
import { nowUnixMs, unixMsToJulianDate } from "../engine/time/astronomicalTime"
import type { ReferenceFrameId, SimulationMode } from "../engine/referenceFrames"
import type { CelestialBodyId } from "../types/celestial"
import type { ScientificSnapshot } from "../types/simulation"

type SpeedPreset = {
  label: string
  daysPerSecond: number
}

const INITIAL_UNIX_MS = nowUnixMs()

type SimulationState = {
  paused: boolean
  timeScale: number
  currentUnixMs: number
  currentJulianDate: number
  showOrbits: boolean
  showVectors: boolean
  referenceFrame: ReferenceFrameId
  simulationMode: SimulationMode
  selectedBodyId: CelestialBodyId
  snapshot: ScientificSnapshot | null
  setPaused: (paused: boolean) => void
  togglePaused: () => void
  setTimeScale: (timeScale: number) => void
  setClockState: (currentUnixMs: number, currentJulianDate: number) => void
  setCurrentUnixMs: (currentUnixMs: number) => void
  jumpToNow: () => void
  toggleOrbits: () => void
  toggleVectors: () => void
  setReferenceFrame: (referenceFrame: ReferenceFrameId) => void
  setSimulationMode: (simulationMode: SimulationMode) => void
  setSelectedBodyId: (selectedBodyId: CelestialBodyId) => void
  setSnapshot: (snapshot: ScientificSnapshot) => void
}

export const SPEED_PRESETS: SpeedPreset[] = [
  { label: "-1d/s", daysPerSecond: -1 },
  { label: "-1h/s", daysPerSecond: -(1 / 24) },
  { label: "1x", daysPerSecond: 1 / 86_400 },
  { label: "1h/s", daysPerSecond: 1 / 24 },
  { label: "1d/s", daysPerSecond: 1 },
  { label: "7d/s", daysPerSecond: 7 },
  { label: "30d/s", daysPerSecond: 30 },
]

export const useSimulationStore = create<SimulationState>((set) => ({
  paused: false,
  timeScale: 1 / 24,
  currentUnixMs: INITIAL_UNIX_MS,
  currentJulianDate: unixMsToJulianDate(INITIAL_UNIX_MS),
  showOrbits: true,
  showVectors: true,
  referenceFrame: "heliocentric",
  simulationMode: "scientific",
  selectedBodyId: "earth",
  snapshot: null,
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((state) => ({ paused: !state.paused })),
  setTimeScale: (timeScale) => set({ timeScale }),
  setClockState: (currentUnixMs, currentJulianDate) => set({ currentUnixMs, currentJulianDate }),
  setCurrentUnixMs: (currentUnixMs) =>
    set({
      currentUnixMs,
      currentJulianDate: unixMsToJulianDate(currentUnixMs),
    }),
  jumpToNow: () => {
    const unixMs = nowUnixMs()

    set({
      currentUnixMs: unixMs,
      currentJulianDate: unixMsToJulianDate(unixMs),
    })
  },
  toggleOrbits: () => set((state) => ({ showOrbits: !state.showOrbits })),
  toggleVectors: () => set((state) => ({ showVectors: !state.showVectors })),
  setReferenceFrame: (referenceFrame) => set({ referenceFrame }),
  setSimulationMode: (simulationMode) => set({ simulationMode }),
  setSelectedBodyId: (selectedBodyId) => set({ selectedBodyId }),
  setSnapshot: (snapshot) => set({ snapshot }),
}))
