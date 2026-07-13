export type ScientificSource = {
  label: string
  url: string
  detail: string
}

export const SCIENTIFIC_SOURCES = {
  orbitalElements: {
    label: "JPL Approximate Positions",
    url: "https://ssd.jpl.nasa.gov/planets/approx_pos.html",
    detail: "Elementos keplerianos J2000 aproximados para 3000 BC a 3000 AD.",
  },
  astrodynamics: {
    label: "JPL Astrodynamic Parameters",
    url: "https://ssd.jpl.nasa.gov/astro_par.html",
    detail: "Constantes como AU, dia juliano e parametros gravitacionais DE440.",
  },
  planetaryPhysics: {
    label: "JPL Planetary Physical Parameters",
    url: "https://ssd.jpl.nasa.gov/planets/phys_par.html",
    detail: "Raio medio e periodos siderais dos planetas.",
  },
  lunarElements: {
    label: "JPL Planetary Satellite Mean Elements",
    url: "https://ssd.jpl.nasa.gov/sats/elem/",
    detail: "Elementos medios da orbita lunar em epoca J2000.",
  },
  lunarPhysics: {
    label: "JPL Planetary Satellite Physical Parameters",
    url: "https://ssd.jpl.nasa.gov/sats/phys_par/",
    detail: "GM e raio medio da Lua.",
  },
} as const
