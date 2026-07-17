"""Cross-check CosmoLab × einsteinpy — lado einsteinpy.

Integra a MESMA órbita de Schwarzschild (G = c = M = 1) que
dump_cosmolab_orbit.mts: r0 = 40 M no apoastro, L = 3,9 M, plano equatorial.
O einsteinpy usa sua formulação hamiltoniana independente, com integrador de
splitting de ordem 2 (padrão da versão 0.4.0) e delta = 0,05. As trajetórias
devem coincidir, dentro dos erros numéricos, quando comparadas como r(φ).

Executar:  epy-venv/bin/python dump_einsteinpy_orbit.py
Saída:     /tmp/einsteinpy_orbit.csv  (lambda_M, r_M, phi_rad)
"""

import csv

import numpy as np
from einsteinpy.geodesic import Timelike

R0 = 40.0
L = 3.9

# Posição [r, θ, φ] e momento COVARIANTE [p_r, p_θ, p_φ] = [0, 0, L].
geod = Timelike(
    metric="Schwarzschild",
    metric_params=(),
    position=[R0, np.pi / 2, 0.0],
    momentum=[0.0, 0.0, L],
    steps=30000,
    delta=0.05,
    return_cartesian=False,
    suppress_warnings=True,
)

trajectory = geod.trajectory[1]  # colunas: t? posição/momento por passo
lambdas = geod.trajectory[0]

with open("/tmp/einsteinpy_orbit.csv", "w", newline="") as handle:
    writer = csv.writer(handle)
    writer.writerow(["lambda_M", "r_M", "phi_rad"])
    for lam, row in zip(lambdas, trajectory):
        # row = [t, r, theta, phi, p_t?, p_r, p_theta, p_phi] (formato einsteinpy)
        writer.writerow([lam, row[1], row[3]])

print(f"ok: {len(lambdas)} pontos em /tmp/einsteinpy_orbit.csv")
