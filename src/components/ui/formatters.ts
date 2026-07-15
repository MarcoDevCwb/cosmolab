/**
 * Formatação de grandezas físicas para a HUD.
 *
 * Apenas apresentação: converte números SI do motor em texto legível.
 * Nenhuma física é calculada aqui.
 */

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
  return `${(seconds / 60).toFixed(2)} min`
}

export function formatMeters(meters: number): string {
  const absolute = Math.abs(meters)
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
  }
}
