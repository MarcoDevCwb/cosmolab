export type ReferenceFrameId = "heliocentric" | "geocentric" | "barycentric"

export type SimulationMode = "scientific" | "visual"

export type ReferenceFrameDefinition = {
  id: ReferenceFrameId
  label: string
  summary: string
}

export const REFERENCE_FRAMES: ReferenceFrameDefinition[] = [
  {
    id: "heliocentric",
    label: "Heliocentrico",
    summary: "Origem no centro do Sol, util para ler orbitas planetarias.",
  },
  {
    id: "geocentric",
    label: "Geocentrico",
    summary: "Origem no centro da Terra, util para comparar Lua, Sol e vizinhanca local.",
  },
  {
    id: "barycentric",
    label: "Baricentrico",
    summary: "Origem no baricentro do sistema modelado, revelando tambem o movimento do Sol.",
  },
]

export const SIMULATION_MODES: { id: SimulationMode; label: string }[] = [
  { id: "scientific", label: "scientific core" },
  { id: "visual", label: "render projection" },
]
