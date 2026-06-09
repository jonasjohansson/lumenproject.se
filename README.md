# lumenproject.se

A rebuild of [lumenproject.se](https://www.lumenproject.se/) as a small static site
with a dirt-simple CMS: **one Google Sheet**. Content lives in the sheet; the site is
**pre-rendered with [Eleventy](https://www.11ty.dev/)** so every page (including each
event) is real HTML at a clean URL.

## The CMS

All content comes from this public Google Sheet:

**https://docs.google.com/spreadsheets/d/1vFV9h4XjacVPzd9TUNDtsjucoUoSjpyMZLmKm9Jazms/edit**

Keep it shared as *Anyone with the link — Viewer* (the build reads it over the public
CSV endpoint). Tabs:

- **Settings** — key/value: `site_title, tagline, hero_image, about_image, about,
  founders, contact_email, tickets_url, mailing_url, instagram, facebook, youtube,
  photo_credit`. Image values may be a full URL or a repo-relative path like
  `assets/img/hero-spring-2026.webp`.
- **Events** — `Title, Date (YYYY-MM-DD), Time, Venue, City, Price, Description,
  TicketURL, ImageURL`. Each row becomes its own page.
- **Artists** — `Name, Role, Edition, URL`.
- **Partners** — `Name, URL`.
- **Media** — `Title, URL`.

### Pretty URLs

Every event gets a page. Dated events use `/events/YYYY/MM/DD/<slug>/`
(e.g. `/events/2026/02/22/lumen-project-spring-222/`); undated archive events use
`/events/<slug>/`. Slugs are derived from the title.

## How updates reach the site

The sheet is the editing surface, but pages are built, not fetched live. A build runs:

- on every push to `main`,
- daily at 04:00 UTC (so sheet edits go live within a day), and
- on demand — Actions tab → **Build and deploy** → *Run workflow*.

So: edit the sheet, then trigger a rebuild (or wait for the daily run).

## Develop locally

```sh
npm install
npm run serve     # http://localhost:8080, rebuilds on change
npm run build     # one-off build into _site/
```

## Deploy

GitHub Actions builds `_site/` and deploys to GitHub Pages (`.github/workflows/deploy.yml`).
Custom domain `lumenproject.se` is set via `src/CNAME`. Because it's an apex
domain, point DNS at GitHub Pages with **A records** to `185.199.108.153`,
`185.199.109.153`, `185.199.110.153`, `185.199.111.153` (or use Cloudflare
CNAME-flattening: a `CNAME` at the apex → `jonasjohansson.github.io`).

## Structure

```
.eleventy.js            build config (passthrough, date + img filters)
package.json
src/
  _data/lumen.js        fetches the sheet at build time -> templates
  _includes/base.njk    shared header/footer layout
  index.njk             home (hero)
  events.njk            event archive + artist list
  about.njk             mission, contact, partners, media
  event.njk             per-event page (paginated over the Events tab)
  CNAME
  assets/css/style.css
  assets/img/           local images (hero, about photo)
```
