# lumenproject.se

A rebuild of [lumenproject.se](https://www.lumenproject.se/) as a plain vanilla static site
(HTML, CSS, JS — no framework, no build step) with a dirt-simple CMS: **one Google Sheet**.

Edit the sheet, reload the page, the site updates.

## The CMS

All content comes from this public Google Sheet:

**https://docs.google.com/spreadsheets/d/1vFV9h4XjacVPzd9TUNDtsjucoUoSjpyMZLmKm9Jazms/edit**

(Lives in the site's Drive folder. Must stay shared as *Anyone with the link — Viewer*,
otherwise the live fetch breaks.)

The site reads it live via the public CSV endpoint:
`https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=<Tab>`

### Tabs

**Settings** — key / value pairs.

| Key | Used for |
|-----|----------|
| `site_title` | Brand wordmark in header and footer |
| `tagline` | Hero line |
| `hero_heading` / `hero_subheading` | Big hero text |
| `hero_image` | Hero background image URL (leave blank for the soft-light gradient) |
| `logo_image` | Optional logo URL |
| `about` | About paragraph (home + about page) |
| `founders` | Who-we-are paragraph |
| `contact_email` | Email link everywhere |
| `tickets_url` | Tickets nav link |
| `instagram` / `facebook` / `youtube` | Social links |
| `partners` | Comma-separated list |
| `supporters` | Comma-separated list (shown in footer) |
| `photo_credit` | Footer photo credit |

**Events** — one row per event. Columns:
`Title, Date (YYYY-MM-DD), Time, Venue, City, Price, Description, TicketURL, ImageURL`
The site auto-splits into **Upcoming** (date today or later) and **Past** (earlier).

**Artists** — one row per artist. Columns: `Name, Role, Edition, URL`.

> Image fields take **URLs**. Any publicly reachable image works. To use a Google Drive
> image, share it publicly and use `https://lh3.googleusercontent.com/d/<FILE_ID>`.

## Run locally

```sh
cd lumenproject.se
python3 -m http.server 8000
# open http://localhost:8000
```

Or, on this machine, it is served at:
`http://localhost/org/jonasjohansson/lumenproject.se/`

## Deploy (GitHub Pages)

Push to GitHub, then Settings → Pages → deploy from `main` / root.
`CNAME` is set to `lumenproject.se`; point the domain's DNS at GitHub Pages when ready.
`.nojekyll` is included so files are served as-is.

## Structure

```
index.html        home — hero, next event, about teaser
events.html       upcoming + past events, artist lineup, what-to-expect
about.html        mission, team, partners, supporters, contact
assets/css/style.css
assets/js/cms.js  the entire CMS engine (fetch sheet, render)
```
