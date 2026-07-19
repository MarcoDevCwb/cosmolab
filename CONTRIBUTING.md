# Contributing to CosmoLab

Thanks for considering a contribution. CosmoLab keeps a hard separation
between physics and rendering, and treats scientific claims as testable
statements — most contributions fit naturally into that shape.

## Ground rules

- **Physics is pure.** Code under `src/physics/` and `src/simulation/` must
  not import React or Three.js. Rendering code reads what the engine
  produced; it never computes physics.
- **Every scientific claim has a test.** A new metric, diagnostic, or
  observable is not done until there is a `*.test.ts` asserting the specific
  numeric or algebraic property that makes it correct (a closed form, a
  conserved quantity, a known limit, a cross-check against finite
  differences). See `docs/VALIDATION.md` for the tolerances already in use
  and the reasoning behind each one.
- **State assumptions explicitly.** If a result only holds in a particular
  chart, for a particular observer, at a particular perturbative order, or
  under a particular sign/baseline convention, say so in the code comment,
  the test description, and (if user-facing) the interface copy. See
  `docs/VALIDACAO_EXTERNA.md` for the kind of scrutiny every claim should
  survive, and the list of phrases to avoid ("exact solution" for an
  integrated result, "superluminal" without "in these coordinates", "vacuum
  confirmed" without "within the local tidal tolerance", any "first in the
  world" claim).
- **No comments explaining what the code does.** Comments are for the *why*
  — a non-obvious constraint, a convention choice, a subtlety a reader would
  otherwise miss.

## Adding a new spacetime metric

Implement the `SpacetimeMetric` interface (see `src/physics/relativity/metrics/`
for examples ranging from a fully analytic Christoffel implementation to a
plugin that only supplies `g_{\mu\nu}(x)` and relies on finite differences).
At minimum, a new metric's test file should check:

1. a known closed-form limit or degenerate case (e.g. flat space, a=0, β=0);
2. the analytic Christoffels (if provided) against finite differences on the
   metric, at a generic point away from any symmetry axis;
3. at least one conserved quantity or invariant with a known value;
4. the vacuum/matter diagnostic where physically expected, using the tidal-
   scale tolerance from `curvature.ts` (not a raw invariant scale — see the
   VSI note in `docs/DESCOBERTAS.md` §1.1 for why that matters).

## Running the project locally

```bash
npm install
npm run dev     # dev server, LAN-exposed for WSL2
npm test        # full test suite (vitest)
npm run lint    # oxlint
npm run build   # typecheck + production build
```

All four commands should pass before opening a pull request.

## Reporting a scientific error

If you believe a displayed number, a diagnostic, or a claim in the
documentation is wrong, please open an issue with:

- the exact scenario/metric and the observable in question;
- what you expected and why (a derivation, a reference, or a counter-example);
- whether the issue is a bug (wrong number) or a missing qualification
  (right number, missing hypothesis).

This project treats an unqualified claim as a bug even when the underlying
number is correct — precision without a stated domain of validity is a
documentation defect, not a matter of style.

## Code of conduct

Be direct about disagreements over physics or code; be respectful about the
people making them. Reports of behavior that fall short of this can be sent
to the maintainer via the contact listed on the GitHub profile.
