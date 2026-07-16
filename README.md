# CosmoLab — a general relativity laboratory in your browser

> **The place where anyone can see, measure, compare and verify how spacetime steers matter and light.**

CosmoLab is not a black-hole visualizer. Every pixel is the consequence of an exact geodesic
integration on a real spacetime metric — with the numerical error, the conserved quantities and
the epistemic status of every number **displayed on screen**. Interface in Portuguese and English
(`🌐` toggle, or `?lang=en`).

![Relativistic orbit on the Flamm paraboloid](docs/img/orbit-flamm.png)

## What makes it different

- **Exact physics, live** — geodesics integrated by adaptive Dormand–Prince 5(4) (or fixed RK4)
  on Minkowski, Schwarzschild, Painlevé–Gullstrand, Kerr and Gödel, plus **user-defined metrics**
  typed as `g_μν` expressions in the built-in editor.
- **Honesty as interface** — every value carries its provenance (*numeric / analytic /
  weak-field*), every scenario carries a scientific status (*validated / theoretical /
  speculative*), regime warnings fire when approximations stop being trustworthy, and the live
  validation panel shows norm error, Killing-constant drift, Ricci ≈ 0 vacuum checks and the
  Kretschmann invariant.
- **The Coordinate Atlas** — the same fall integrated in two charts side by side, synchronized by
  proper time: invariants (τ, areal r, K, E) agree to the digit while coordinate quantities
  diverge. The horizon "freeze" is revealed for what it is: the map, not the territory.
- **The spacetime price tag** — for any metric (including yours), the engine computes the
  Einstein tensor and answers *what matter would be required to sustain it*, flagging Null Energy
  Condition violations ("exotic matter") — type a Morris–Thorne wormhole and watch the verdict.
- **The four classical tests, student-verifiable** — Eddington's light deflection (1.75″),
  Mercury-style periastron precession, gravitational time dilation and the Shapiro delay.
- **Discovery missions** — engine-verified challenges (reproduce Eddington 1919; find the edge of
  orbital stability; trap a photon just below the critical impact parameter), with persistent
  medals.
- **Reproducible science** — every experiment has an ID; export JSON/CSV or a one-click printable
  **lab report**; every configuration (custom metrics included) lives in the URL.

![Coordinate Atlas: Schwarzschild × Painlevé–Gullstrand](docs/img/coordinate-atlas.png)

## Validation

The engine is validated in three layers (see [docs/VALIDATION.md](docs/VALIDATION.md)):

| Layer | Result |
|---|---|
| **Cross-check vs einsteinpy** (independent Python engine) | periastron precession **262.1508° vs 262.1514°/orbit — 2 ppm** in deep strong field (periastron at 2.7 r_s) |
| **65 automated analytic tests** | light deflection 4GM/c²b to 1%, Ω² = GM/r³ to 10⁻⁴, RK4 4th-order convergence (Richardson), Kretschmann closed forms (Schwarzschild, Reissner–Nordström *through the plugin editor*), Kerr → Schwarzschild limit, finite K at the PG horizon, Morris–Thorne exotic density to 2%, u^r = −E at the horizon, and more |
| **Continuous in-app validation** | norm \|g·u·u − ε\|, E/L drift, Ricci vacuum check, causality (g_φφ), matter/NEC — always on screen |

## Quickstart

```bash
npm install
npm run dev     # open the printed URL (LAN-exposed for WSL2)
npm test        # 65 scientific tests
npm run build
```

## Architecture (physics never touches the renderer)

```
physics/      pure math: metrics (plugin interface), Christoffels (analytic or
              finite-difference), geodesics, curvature invariants, Einstein tensor,
              causality, circular orbits, embeddings — zero React/Three imports
simulation/   integrators (RK4, DP5(4) adaptive), scenario definitions, runner,
              observables, missions, metric passport — zero React/Three imports
rendering/    coordinate/embedding mapping, Flamm geometry buffers
components/   React + react-three-fiber: draw what the engine produced, never compute
```

Any new geometry only implements the `SpacetimeMetric` interface — Kerr, Painlevé–Gullstrand and
Gödel all entered as pure plugins (no analytic Christoffels needed).

![Gödel universe with the closed-timelike-curve region](docs/img/godel-ctc.png)

---

# CosmoLab — um laboratório de relatividade geral no navegador (PT-BR)

> **O lugar onde qualquer pessoa pode ver, medir, comparar e verificar como o espaço-tempo conduz
> matéria e luz.**

O CosmoLab não é um visualizador de buracos negros: toda visualização é consequência direta da
integração exata de geodésicas numa métrica real — com erro numérico, constantes conservadas e o
status epistêmico de cada número **exibidos na tela**.

- **Física exata ao vivo**: Minkowski, Schwarzschild, Painlevé–Gullstrand, Kerr, Gödel e métricas
  **definidas pelo usuário** no editor de g_μν;
- **Honestidade como interface**: proveniência (numérico/analítico/campo fraco), status
  científico por cenário, avisos de regime e validação numérica contínua;
- **Atlas de Coordenadas**: a mesma queda em duas cartas, sincronizada por τ — invariantes
  coincidem, o "congelamento" no horizonte se revela artefato do mapa;
- **Etiqueta de preço do espaço-tempo**: tensor de Einstein → que matéria sustentaria a sua
  métrica (condição nula de energia; wormholes acusam "matéria exótica");
- **Os quatro testes clássicos** verificáveis pelo aluno + **missões de descoberta** corrigidas
  pelo motor, com medalhas persistentes;
- **Reprodutibilidade**: ID de experimento, exportação JSON/CSV, **relatório de laboratório**
  imprimível e URL que reconstrói tudo — inclusive métricas personalizadas.

Validação em três camadas ([docs/VALIDATION.md](docs/VALIDATION.md)): cross-check independente
contra o einsteinpy com concordância de **2 ppm** na precessão em campo forte; **65 testes
analíticos automatizados**; e monitores contínuos no app.

## Citação

Se o CosmoLab for útil no seu ensino ou pesquisa, cite-o (ver [CITATION.cff](CITATION.cff)).
