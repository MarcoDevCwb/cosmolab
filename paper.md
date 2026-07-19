---
title: 'CosmoLab: an interactive general-relativity laboratory in the browser'
tags:
  - general relativity
  - numerical relativity
  - physics education
  - geodesics
  - gravitational waves
  - TypeScript
authors:
  - name: Marco Vinicius Amorin de Lima
    orcid: 0009-0005-0545-3791
    affiliation: 1
affiliations:
  - name: Independent researcher, Brazil
    index: 1
date: 19 July 2026
bibliography: paper.bib
---

# Summary

CosmoLab is a browser-based laboratory for exploring general relativity through
direct numerical experiment rather than pre-rendered animation. Test-particle
trajectories are obtained by integrating the full geodesic equation — with an
adaptive Dormand–Prince 5(4) integrator, or a fixed-step RK4 for comparison —
on an explicit spacetime metric supplied through a small plugin interface.
Ten spacetimes ship with the tool: Minkowski, Schwarzschild, Painlevé–Gullstrand,
Kerr, Gödel, FLRW, an Alcubierre warp bubble [@Alcubierre1994], an exact
Brinkmann plane gravitational wave, a Khan–Penrose colliding-wave spacetime,
and a metric
editor that lets a user type an arbitrary $g_{\mu\nu}(x)$ and have Christoffel
symbols computed by finite differences on the fly. Thirteen guided scenarios
and a battery of ninety-five automated tests exercise this engine against
closed-form solutions, conserved quantities, and an independent Python
integrator (`einsteinpy`), reaching 2 ppm agreement on the periastron-precession
observable of a deep-strong-field orbit [@EinsteinPy].

Every number the interface displays carries a declared epistemic status:
whether it is *numerical* (integrated from the full field equations), *analytic*
(a closed form), or a *weak-field* approximation, together with the regime in
which that approximation is expected to hold. Live diagnostics — norm
conservation, Killing-constant drift where the corresponding symmetry exists,
curvature invariants, and a stress-energy/Null-Energy-Condition sampler built
from the numerical Einstein tensor — are shown continuously rather than only
on request. Every visual exaggeration (e.g. strain amplitude scaled for
visibility) is labeled with its scale factor, and every experiment, including
user-defined metrics, is reproducible from its URL alone.

# Statement of need

Public tools for visualizing general relativity are abundant, but most either
(a) render a pre-computed or heavily approximated trajectory without exposing
the underlying numerics, or (b) target research users through symbolic
tensor-algebra packages with a steep entry cost. There is a comparatively thin
middle layer: an interactive tool where a student or instructor can watch the
*same* differential equations that a research code integrates, see the
numerical error and the conditions under which a diagnostic result holds, and
still get an answer in a browser tab with no installation. CosmoLab is built
for that middle layer, and treats the disclosure of provenance and epistemic
status as a first-class interface requirement rather than as documentation
prose.

Two engineering findings emerged directly from building the tool and are worth
recording for other geodesic/curvature codes. First, in spacetimes with
**vanishing scalar invariants** (VSI) — the exact plane gravitational wave is
the canonical example — every polynomial curvature invariant is identically
zero even though the Riemann tensor is not [@Pravda2002]. A vacuum/matter
diagnostic normalized by an invariant such as the Kretschmann scalar therefore
collapses to a zero tolerance and mislabels an exact vacuum wave as matter; the
fix implemented here is to scale the tolerance by the Riemann tensor projected
onto a local orthonormal tetrad (the physical tidal scale), which reduces to
the invariant-based scale in non-VSI spacetimes and remains finite in VSI ones.
Second, when the Khan–Penrose colliding-wave metric [@KhanPenrose1971] was
reconstructed from first principles rather than copied from a source text, one
algebraic sign ambiguity in the conformal factor was left undetermined by the
single-wave limits; the numerical Einstein tensor of the interaction region was
used to arbitrate between the two candidates, rejecting the one that requires
a matter density seven to nine orders of magnitude above the finite-difference
noise floor. Both cases are kept as regression tests
(`ppWave.test.ts`, `khanPenrose.test.ts`) documenting the method, following the
classification framework of Griffiths for colliding-plane-wave spacetimes
[@Griffiths1991].

The exact-plane-wave scenario also exposes an under-served, currently active
topic in gravitational-wave physics: **velocity memory**, the residual
displacement and velocity a ring of test geodesics retains after a wave train
passes [@ZeldovichPolnarev1974; @ZhangEtAl2017]. A ring of geodesics released in
the exact Brinkmann wave reproduces the linearized-theory response to a few
percent, then shows a second-order secular drift toward the source consistent
with a ponderomotive mechanism connected to Penrose's focusing theorem for
exact plane waves [@Penrose1965], with the residual and its sign structure
identified but not yet closed to the percent level. To the authors' knowledge,
no other public interactive tool exposes this observable as a measurable
quantity rather than as narrative text.

# Acknowledgements

The scientific claims made by CosmoLab are subject to an open, adversarial
validation protocol (`docs/VALIDACAO_EXTERNA.md`) designed to be run against an
independent physicist or reasoning system, separating locally valid diagnostics
from global spacetime properties and flagging convention-dependent results.
Textbook material referenced throughout the codebase and documentation
includes @Wald1984, @MTW1973, @Weinberg1972, @MorrisThorne1988, and
@MartelPoisson2001; cross-validation used @EinsteinPy and, prospectively,
@GYOTO.

# References
