import type { CelestialBodyDefinition, CelestialBodyId } from "../types/celestial"

export const CELESTIAL_BODIES: CelestialBodyDefinition[] = [
  {
    id: "sun",
    kind: "star",
    name: "Sol",
    summary:
      "Fonte de luz e gravidade do sistema. No modo baricentrico, o pequeno deslocamento solar passa a aparecer como resultado do restante do sistema.",
    radius: 2.7,
    baseColor: "#fbbf24",
    glowColor: "#fb923c",
    trailColor: "#fbbf24",
    vectorColor: "#f97316",
    facts: [
      { label: "Tipo", value: "Estrela G2V", sourceLabel: "JPL/NASA" },
      { label: "Rotacao", value: "25,05 dias", sourceLabel: "JPL/NASA" },
      { label: "GM", value: "1,327e11 km3/s2", sourceLabel: "JPL DE440" },
      { label: "Core", value: "Heliocentrico", sourceLabel: "Scientific Core v0.1" },
    ],
  },
  {
    id: "earth",
    kind: "planet",
    name: "Terra",
    summary:
      "Planeta rochoso com translacao derivada do UTC atual, usando elementos orbitais J2000 e telemetria calculada no nucleo cientifico.",
    radius: 0.82,
    baseColor: "#2563eb",
    glowColor: "#7dd3fc",
    atmosphereColor: "#67e8f9",
    trailColor: "#38bdf8",
    vectorColor: "#7dd3fc",
    facts: [
      { label: "Ano sideral", value: "365,25 dias", sourceLabel: "JPL" },
      { label: "Dia sideral", value: "23h 56m", sourceLabel: "JPL" },
      { label: "Semi-eixo", value: "1,00000018 au", sourceLabel: "JPL approx_pos" },
      { label: "Eixo", value: "23,44 deg", sourceLabel: "JPL/NASA" },
    ],
  },
  {
    id: "moon",
    kind: "moon",
    name: "Lua",
    summary:
      "Satelite natural da Terra propagado a partir de elementos medios em epoca J2000, ideal para estudar o frame geocentrico e o deslocamento local.",
    radius: 0.24,
    baseColor: "#cbd5e1",
    glowColor: "#e2e8f0",
    trailColor: "#cbd5e1",
    vectorColor: "#f8fafc",
    facts: [
      { label: "Orbita", value: "27,32 dias", sourceLabel: "JPL sat elem" },
      { label: "Estado", value: "Travada por mare", sourceLabel: "JPL/NASA" },
      { label: "Semi-eixo", value: "384.400 km", sourceLabel: "JPL sat elem" },
      { label: "Excentric.", value: "0,0554", sourceLabel: "JPL sat elem" },
    ],
  },
  {
    id: "mars",
    kind: "planet",
    name: "Marte",
    summary:
      "Planeta externo com excentricidade mais evidente, excelente para comparar variacao real de velocidade ao longo da orbita no mesmo frame.",
    radius: 0.58,
    baseColor: "#f97316",
    glowColor: "#fdba74",
    atmosphereColor: "#fb923c",
    trailColor: "#fda4af",
    vectorColor: "#fb7185",
    facts: [
      { label: "Ano sideral", value: "686,98 dias", sourceLabel: "JPL" },
      { label: "Sol marc.", value: "24h 37m", sourceLabel: "JPL" },
      { label: "Semi-eixo", value: "1,52371243 au", sourceLabel: "JPL approx_pos" },
      { label: "Excentric.", value: "0,093365", sourceLabel: "JPL approx_pos" },
    ],
  },
]

export const CELESTIAL_BODY_MAP = Object.fromEntries(
  CELESTIAL_BODIES.map((body) => [body.id, body]),
) as Record<CelestialBodyId, CelestialBodyDefinition>

export const FOCUS_ORDER: CelestialBodyId[] = ["sun", "earth", "moon", "mars"]
