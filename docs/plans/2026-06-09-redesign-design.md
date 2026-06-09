# LUMEN PROJECT — Redesign: "Transit"

Date: 2026-06-09 · Branch: `redesign/dark-luminous`

## Concept

LUMEN = *light*. The work is ambient, durational sound — it **transits time**,
moving day → dusk → night, often in beautiful, meditative spaces (churches,
large rooms). The redesign makes that passage literal: the site itself shifts
theme by the visitor's **local time of day**.

- **Day** (07–17): pale, luminous ground — daylight.
- **Dusk** (17–20): golden-hour warmth — amber.
- **Night** (20–07): deep blue-black — the darkened venue.

The old brand colours are not discarded, they are *re-ordered* into times of
day: khaki = day, orange = dusk, electric blue = night.

## Principles

- **Meditative & architectural** — generous negative space, slow fades, stillness.
- **Light as presence** — luminous wordmark, soft bloom, grain (analog film feel).
- **Brave typography** — large, confident, fluid `clamp()` scale. DIN lineage via
  Barlow Condensed (display) + Barlow (body).
- **Photography is lifted, not wallpapered** — a few great images carry the mood
  (landing hero, event leads); indexes stay clean.
- **Contact & nav are always clear, fixed on top.**

## Information architecture

1. **Landing** — full-viewport hero (warm church), glowing LUMEN wordmark, one
   concept line. Features the **next upcoming event** when one exists; otherwise a
   quiet "explore the archive" invitation. Clear routes to Events + Artists.
2. **Events index** — year-grouped, easy-to-navigate gallery of all events.
3. **Artists index** *(new)* — every artist who has performed, lifted from
   `settings.json` into its own browsable index. Added to primary nav.
4. **Event detail** — leads with a large image (past → event photo if available,
   else the poster; upcoming → poster/graphic), brave large title, editorial grid
   for meta + description.
5. **About** — re-themed.

## System

- **Theme**: `data-theme` (day/dusk/night) set on `<html>` by a tiny inline,
  render-blocking script from local hour; respects `prefers-color-scheme` as a
  floor and `prefers-reduced-motion`. CSS custom properties swap per phase.
- **Type**: Barlow Condensed 600/700 (display, uppercase, tight), Barlow 400/500
  (body). Fluid scale borrowed from jonasjohansson.se.
- **Texture**: fixed SVG-noise grain overlay at low opacity; radial bloom behind
  luminous elements.
- **Media**: full-bleed `100dvh` heroes; clean thumbnails in indexes.

## Data / templates

- `lumen.js`: split events into `upcoming` / `past` by today's date; expose
  `nextEvent`; add optional per-event `photo` (frontmatter) used as the lead image
  for past events, falling back to the poster; keep `excerpt` + `dims`.
- New `artists.njk`; reworked `index.njk`, `events.njk`, `event.njk`, `about.njk`,
  `base.njk` (fixed contact/nav bar, fonts, grain/bloom layers, theme script).
- Lifted photography optimised into `src/assets/img/photos/` (credit: Olga Androsova).

## Out of scope (for now)

- Per-event photo galleries for all 30 events (mechanism is wired; only events
  with a `photo` set use it — others lead with their poster).
- Replacing Barlow with a licensed DIN web font.

## Rollback

All work on `redesign/dark-luminous`; bug-fixes landed first as a separate commit.
`main` is untouched until merge.
