# Third-Party Notices

This project incorporates work from the following open-source projects.
Their licence terms are reproduced or referenced below and continue to apply to
the incorporated portions.

---

## openpage

The editor shell (`client/src/editor/`), the block components (`client/src/blocks/`),
the Zustand stores (`client/src/store/`) and several helpers in `client/src/lib/`
originate from **openpage** and have been modified for this project.

- Project: https://github.com/buildingopen/openpage
- Licence: MIT
- Copyright (c) 2026 Federico De Ponte
- Full text: [`client/LICENSE-openpage`](client/LICENSE-openpage)

---

## Planned third-party sources

The following are approved for use and will be credited here as their code is
incorporated. Each was licence-checked before selection.

| Project | Use | Licence |
|---|---|---|
| Wicked Blocks | widget markup / variants | MIT |
| HyperUI | widget markup / variants | MIT |
| Preline UI | widget markup / variants | MIT |
| Float UI | widget markup / variants | MIT |
| Meraki UI | widget markup / variants | MIT |
| Flowbite (free blocks only) | widget markup / variants | MIT |
| AstroWind, Velora UI, Astroship | page arrangement reference | MIT |
| Chai Builder (`html-to-json`) | HTML → block conversion | BSD-3-Clause |
| Unsplash | photography | Unsplash License |

### Explicitly excluded

These were reviewed and rejected; do not copy code or assets from them.

| Source | Reason |
|---|---|
| Wix templates | Proprietary. |
| Colorlib templates | CC BY 3.0 — requires a footer credit that cannot be removed, and forbids resale. |
| OpenTailwind | Licence prohibits use in SaaS website builders. |
| Cruip templates (Simple Light, Open React Template) | GPL — copyleft, incompatible with this project's licensing. |

---

## Original-template gallery audit (2026-09-18)

`client/public/original-templates/` holds 237 downloaded HTML template kits
collected before this policy existed; `client/src/templates/library/original-catalog.json`
is the subset actually offered in the app (146 of them, before this audit).
Unlike the widget snippets above, these are whole page designs a user's
**published, potentially commercial site embeds directly** — so an unclear
licence here is a real exposure, not a hypothetical one.

Each catalog entry was checked for a licence signal (a distributor's own
domain referenced in its markup, or a `Template Name:` / `Author:` /
`License:` header comment in its stylesheet — the near-universal convention
for this kind of template). 57 of the 146 had no defensible basis for use and
were removed from `original-catalog.json`:

| Why removed | Count | What that means |
|---|---|---|
| No licence signal found anywhere | 32 | Default copyright applies — no permission to use or distribute was ever granted. |
| An author name but no licence statement | 9 | Same as above — a name is not a licence. |
| Sourced from Colorlib | 14 | This file already excludes Colorlib (see above); these were present despite that. |
| Explicit "no client work on the free tier" terms (BootstrapMade), or a ThemeForest (paid marketplace) listing | 2 | Outright licence violation for a tool whose purpose is making sites for other people. |

Their original folders are left on disk (not deleted) in case a licence is
tracked down for one later, but nothing in the app links to them any more.

**Still in the gallery, needs a decision:** 80 of the remaining 89 templates
carry a Creative Commons Attribution licence (WebThemez, FreeHTML5.co, and a
handful of individually-licensed ones) — legally usable, but only if the
distributor's credit link stays on the published page, which nothing in the
editor currently protects from being deleted like any other text. Until that
credit is either locked in place or these templates are removed too, treat
them as the next thing to resolve, not as cleared. A full breakdown of which
89 remain and why is available on request.

Only 7 of the 146 were already clear on inspection: MIT-licensed, from
Start Bootstrap and Tooplate.
