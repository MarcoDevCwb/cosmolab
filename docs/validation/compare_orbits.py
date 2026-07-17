"""Compara os CSVs CosmoLab × einsteinpy em grandezas reproduzíveis.

Pré-condição: executar os dois scripts ``dump_*_orbit`` desta pasta.
O confronto usa r(phi), eliminando a diferença de parametrização afim. A
posição de cada periastro é refinada por um ajuste quadrático local de três
pontos; a precessão é a média de Delta(phi_peri) - 2*pi.
"""

from pathlib import Path

import numpy as np


COSMOLAB_CSV = Path("/tmp/cosmolab_orbit.csv")
EINSTEINPY_CSV = Path("/tmp/einsteinpy_orbit.csv")


def load_orbit(path: Path) -> tuple[np.ndarray, np.ndarray]:
    if not path.exists():
        raise SystemExit(f"arquivo ausente: {path}; execute primeiro o dump correspondente")
    data = np.genfromtxt(path, delimiter=",", names=True)
    phi = np.unwrap(np.asarray(data["phi_rad"], dtype=float))
    radius = np.asarray(data["r_M"], dtype=float)
    finite = np.isfinite(phi) & np.isfinite(radius)
    phi = phi[finite]
    radius = radius[finite]
    order = np.argsort(phi)
    return phi[order], radius[order]


def refined_periastra(phi: np.ndarray, radius: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    candidates = np.flatnonzero(
        (radius[1:-1] < radius[:-2]) & (radius[1:-1] <= radius[2:])
    ) + 1
    peri_phi: list[float] = []
    peri_radius: list[float] = []
    for index in candidates:
        coefficients = np.polyfit(phi[index - 1 : index + 2], radius[index - 1 : index + 2], 2)
        quadratic, linear, constant = coefficients
        if quadratic <= 0:
            continue
        vertex_phi = -linear / (2 * quadratic)
        vertex_radius = quadratic * vertex_phi**2 + linear * vertex_phi + constant
        peri_phi.append(float(vertex_phi))
        peri_radius.append(float(vertex_radius))
    return np.asarray(peri_phi), np.asarray(peri_radius)


def mean_precession_deg(peri_phi: np.ndarray) -> float:
    if peri_phi.size < 2:
        return float("nan")
    return float(np.degrees(np.mean(np.diff(peri_phi) - 2 * np.pi)))


def main() -> None:
    cosmo_phi, cosmo_radius = load_orbit(COSMOLAB_CSV)
    epy_phi, epy_radius = load_orbit(EINSTEINPY_CSV)

    lower = max(cosmo_phi.min(), epy_phi.min())
    upper = min(cosmo_phi.max(), epy_phi.max())
    comparison_phi = cosmo_phi[(cosmo_phi >= lower) & (cosmo_phi <= upper)]
    epy_interpolated = np.interp(comparison_phi, epy_phi, epy_radius)
    cosmo_interpolated = np.interp(comparison_phi, cosmo_phi, cosmo_radius)
    relative_shape_error = np.abs(cosmo_interpolated - epy_interpolated) / np.maximum(
        np.abs(epy_interpolated), 1e-15
    )

    cosmo_peri_phi, cosmo_peri_radius = refined_periastra(cosmo_phi, cosmo_radius)
    epy_peri_phi, epy_peri_radius = refined_periastra(epy_phi, epy_radius)
    common_periastra = min(cosmo_peri_phi.size, epy_peri_phi.size)
    cosmo_precession = mean_precession_deg(cosmo_peri_phi)
    epy_precession = mean_precession_deg(epy_peri_phi)
    precession_relative = abs(cosmo_precession - epy_precession) / abs(epy_precession)

    print(f"faixa comum de phi: {lower:.6f} .. {upper:.6f} rad")
    print(f"forma r(phi), erro relativo máximo: {relative_shape_error.max():.6e}")
    print(f"forma r(phi), erro relativo médio: {relative_shape_error.mean():.6e}")
    if common_periastra:
        radius_relative = abs(cosmo_peri_radius[0] - epy_peri_radius[0]) / abs(
            epy_peri_radius[0]
        )
        phase_absolute = abs(cosmo_peri_phi[0] - epy_peri_phi[0])
        print(f"primeiro periastro CosmoLab: {cosmo_peri_radius[0]:.9f} M")
        print(f"primeiro periastro einsteinpy: {epy_peri_radius[0]:.9f} M")
        print(f"raio do periastro, erro relativo: {radius_relative:.6e}")
        print(f"fase do primeiro periastro, erro absoluto: {phase_absolute:.6e} rad")
    print(f"precessão CosmoLab: {cosmo_precession:.9f} deg/órbita")
    print(f"precessão einsteinpy: {epy_precession:.9f} deg/órbita")
    print(f"precessão, erro relativo: {precession_relative:.6e}")


if __name__ == "__main__":
    main()
