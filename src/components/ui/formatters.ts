/**
 * Formatação de grandezas físicas para a HUD.
 *
 * Apenas apresentação: converte números SI do motor em texto legível.
 * Nenhuma física é calculada aqui.
 */

import { getLanguage } from "../../i18n"
import { SOLAR_MASS_KG } from "../../physics/constants"
import type { ObservableUnit } from "../../simulation/observables"

export function formatSeconds(seconds: number): string {
  const absolute = Math.abs(seconds)
  if (absolute === 0) {
    return "0 s"
  }
  if (absolute < 1e-3) {
    return `${(seconds * 1e6).toFixed(2)} µs`
  }
  if (absolute < 1) {
    return `${(seconds * 1e3).toFixed(3)} ms`
  }
  if (absolute < 120) {
    return `${seconds.toFixed(3)} s`
  }
  // Tempos cósmicos: anos → milhões → bilhões (FLRW).
  const YEAR_S = 3.156e7
  if (absolute >= 1000 * YEAR_S) {
    const en = getLanguage() === "en"
    const years = seconds / YEAR_S
    if (Math.abs(years) >= 1e9) {
      return `${(years / 1e9).toFixed(2)} ${en ? "billion years" : "bilhões de anos"}`
    }
    if (Math.abs(years) >= 1e6) {
      return `${(years / 1e6).toFixed(2)} ${en ? "million years" : "milhões de anos"}`
    }
    return `${years.toFixed(0)} ${en ? "years" : "anos"}`
  }
  return `${(seconds / 60).toFixed(2)} min`
}

export function formatMeters(meters: number): string {
  const absolute = Math.abs(meters)
  // Escala astronômica: anos-luz (FLRW e afins).
  const LIGHT_YEAR_M = 9.4607e15
  if (absolute >= 100 * LIGHT_YEAR_M) {
    const en = getLanguage() === "en"
    const lightYears = meters / LIGHT_YEAR_M
    if (Math.abs(lightYears) >= 1e9) {
      return `${(lightYears / 1e9).toFixed(2)} ${en ? "billion light-years" : "bilhões de anos-luz"}`
    }
    if (Math.abs(lightYears) >= 1e6) {
      return `${(lightYears / 1e6).toFixed(2)} ${en ? "million light-years" : "milhões de anos-luz"}`
    }
    return `${lightYears.toFixed(0)} ${en ? "light-years" : "anos-luz"}`
  }
  if (absolute >= 1e9) {
    return `${(meters / 1e9).toFixed(3)} × 10⁶ km`
  }
  if (absolute >= 1e3) {
    return `${(meters / 1e3).toFixed(2)} km`
  }
  if (absolute >= 1e-3 || absolute === 0) {
    return `${meters.toFixed(1)} m`
  }
  return `${meters.toExponential(2)} m`
}

export function formatSolarMasses(massSolar: number): string {
  if (massSolar >= 1e6) {
    return `${(massSolar / 1e6).toFixed(1)} milhões M☉`
  }
  if (massSolar >= 1000) {
    return `${(massSolar / 1000).toFixed(1)} mil M☉`
  }
  return `${massSolar.toFixed(1)} M☉`
}

export function formatRs(valueRs: number): string {
  if (valueRs >= 10_000) {
    return `${valueRs.toExponential(2)} r_s`
  }
  return `${valueRs.toFixed(1)} r_s`
}

export function formatArcseconds(arcsec: number): string {
  if (!Number.isFinite(arcsec)) {
    return "—"
  }
  if (Math.abs(arcsec) >= 3600) {
    return `${(arcsec / 3600).toFixed(2)}°`
  }
  if (Math.abs(arcsec) >= 60) {
    return `${(arcsec / 60).toFixed(2)}′`
  }
  return `${arcsec.toFixed(3)}″`
}

export function formatObservable(value: number, unit: ObservableUnit): string {
  if (!Number.isFinite(value)) {
    return "aguardando…"
  }

  switch (unit) {
    case "arcsec":
      return formatArcseconds(value)
    case "deg":
      return `${value.toFixed(value >= 100 ? 1 : 2)}°`
    case "deg-per-orbit":
      return `${value.toFixed(1)}°/volta`
    case "ratio":
      return `× ${value >= 100 ? value.toFixed(0) : value.toFixed(2)}`
    case "count":
      return value.toFixed(1)
    case "rs":
      return `${value.toFixed(3)} r_s`
    case "m":
      return formatMeters(value)
    case "s":
      return formatSeconds(value)
    case "kg": {
      // Massas astronômicas em M☉; abaixo disso, notação científica em kg.
      const solar = value / SOLAR_MASS_KG
      if (Math.abs(solar) >= 0.001) {
        return `${solar >= 1000 || solar <= -1000 ? solar.toExponential(2) : solar.toPrecision(3)} M☉`
      }
      return `${value.toExponential(2)} kg`
    }
    case "jm3":
      return `${value.toExponential(2)} J/m³`
    case "hz":
      return Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(2)} kHz` : `${value.toFixed(1)} Hz`
    case "wm2":
      return `${value.toExponential(2)} W/m²`
  }
}
