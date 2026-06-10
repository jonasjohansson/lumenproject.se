# How this site is edited

lumenproject.se is a static [Eleventy](https://www.11ty.dev/) site. It's edited
two ways, by two kinds of editor, and they're designed to stay out of each
other's way.

## Two editors, two lanes

**Collaborators — content, via Pages CMS** (app.pagescms.org, or
[lumenproject.se/admin](https://lumenproject.se/admin/)).
They edit only:

- **Events** — `content/events/*.md` (title, date, time, venue, price, ticket
  link, poster, line-up, description).
- **Site settings** — `content/settings.json` (tagline, about, team, intros,
  contact/social links, photographers, artists, partners, press).
- **Images** — uploads into `src/assets/img/{events,gallery,photos}` via the
  CMS media browser.

See [docs/EDITING.md](docs/EDITING.md) for the editor's guide.

**Claude / developers — the machinery, via git.**
Everything that isn't content:

- Templates & layout — `src/**/*.njk`, `src/_includes/**`
- Styles & code assets — `src/assets/css/**`
- Data layer & build logic — `src/_data/*.js`, `.eleventy.js`,
  `scripts/**`
- Config & CI — `.pages.yml`, `.github/workflows/**`, `package.json`, `CNAME`

**The rule:** collaborators write content; Claude/developers read content but
don't rewrite it. The only files both touch are `content/events/*.md` and
`content/settings.json` — and there the rule is *editors write, code only
reads*. Every other boundary is a different file, so simultaneous edits can't
collide. If Claude must edit a content file (a data migration, say), it does so
as one explicit commit — don't have that same event open in the CMS at that
moment.

## How a change goes live

Both lanes commit straight to `main`. Every push to `main` runs
`.github/workflows/deploy.yml`:

1. **validate** — `npm run validate` checks every event parses and has a valid
   title/date/time. A malformed commit **fails here and never replaces the live
   site** (the deploy job needs a green build).
2. **build** — Eleventy renders to `_site/`; gallery images are encoded to
   AVIF/WebP/JPEG (cached across runs).
3. **deploy** — `_site/` ships to GitHub Pages.

There is **no draft/preview step** — a successful save is live within a couple
of minutes. (Pages CMS has no built-in preview; real per-branch previews would
mean moving hosting to Cloudflare/Netlify.) `concurrency: cancel-in-progress`
means two near-simultaneous commits collapse to one deploy of the latest `main`.

## Rolling back

Every edit is a git commit. To undo a bad change, revert the commit (or restore
the file) and push — the next build redeploys the corrected site.
