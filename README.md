# lumenproject.se

A small static site (Eleventy) deployed to GitHub Pages, with a friendly CMS
on top: **[Pages CMS](https://pagescms.org)**. Content lives as plain files in
this repo; editors use a form-based UI with drag-and-drop image upload. Every
save is a commit, which triggers the GitHub Action to rebuild and deploy.

## Editing content (Pages CMS)

1. Go to **https://app.pagescms.org**, sign in with GitHub (owner only, one-time
   GitHub App install on this repo — grants the CMS write access).
2. Invite collaborators by email from the Pages CMS account screen — they get a
   passwordless magic-link login and **do not need a GitHub account**.
3. Edit:
   - **Events** — one entry per event: title, date, time, venue, city, price,
     ticket URL, **poster (drag-and-drop upload)**, and a description.
   - **Settings** — site text, hero/about images, contact + social links, and the
     Artists / Partners / Media lists.
4. Save → it commits to the repo → the site rebuilds (~1–2 min) and goes live.

Config for all of the above lives in [`.pages.yml`](./.pages.yml).

## Where content lives (no database)

```
content/events/*.md        one Markdown file per event (frontmatter)
content/settings.json      site text/links + artists, partners, media
src/assets/img/events/     event posters (uploaded via the CMS)
src/assets/img/            hero + about photo
```

The Eleventy build reads these files at build time (`src/_data/lumen.js`), so the
content is just files in git — no external service, no lock-in. (It used to read a
Google Sheet; that's retired, the sheet can be archived.)

Event URLs are pre-rendered to `/events/YYYY/MM/DD/<slug>/` (slug from the title).

## Develop locally

```sh
npm install
npm run serve     # http://localhost:8080, rebuilds on change
npm run build     # one-off build into _site/
```

## Deploy

GitHub Actions builds `_site/` and deploys to GitHub Pages
(`.github/workflows/deploy.yml`) on push, a daily cron, and manual dispatch.
Custom domain `lumenproject.se` is set via `src/CNAME`. Because it's an apex
domain, point DNS at GitHub Pages with **A records** to `185.199.108.153`,
`185.199.109.153`, `185.199.110.153`, `185.199.111.153` (or use Cloudflare
CNAME-flattening: a `CNAME` at the apex → `jonasjohansson.github.io`).

## Structure

```
.pages.yml              Pages CMS config (collections, fields, media)
.eleventy.js            build config (passthrough, date + img filters)
package.json
content/                editable content (events + settings)
src/
  _data/lumen.js        reads content/ -> templates
  _data/site.js         canonical base URL
  _includes/base.njk    shared header/footer layout
  index.njk events.njk about.njk event.njk
  404.njk sitemap.njk robots.njk
  CNAME
  assets/css/style.css
  assets/img/           images (hero, about, event posters)
```
