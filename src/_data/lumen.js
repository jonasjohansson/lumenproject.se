/* ------------------------------------------------------------------ *
 *  Build-time CMS: read content from local repo files (managed by
 *  Pages CMS, app.pagescms.org) and hand it to the templates.
 *
 *    content/events/*.md   — one Markdown file per event (frontmatter)
 *    content/settings.json — site text/links + artists/partners/media
 *    src/assets/img/events/— event posters (uploaded via the CMS)
 *
 *  Editors use Pages CMS; each save commits files here, which triggers
 *  the GitHub Action to rebuild and deploy. No external service at build.
 * ------------------------------------------------------------------ */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { imageSize } = require("image-size");

const CONTENT = path.join(__dirname, "..", "..", "content");
const ASSETS = path.join(__dirname, "..", "assets");

// intrinsic dimensions of a local image (root-absolute path like
// "/assets/img/events/foo.jpg"); returns null for external/missing files so
// templates can omit width/height rather than emit wrong ones.
function dimsOf(src) {
  if (!src || /^https?:\/\//.test(src)) return null;
  const rel = String(src).replace(/^\/+/, "").replace(/^assets\//, "");
  const file = path.join(ASSETS, rel);
  try {
    const { width, height } = imageSize(fs.readFileSync(file));
    return width && height ? { width, height } : null;
  } catch {
    return null;
  }
}

// trim a free-text description to a clean ~155-char meta excerpt on a word
// boundary (search snippets / og:description; the full text stays on the page).
function excerptOf(text, max = 155) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[.,;:–—-]\s*$/, "") + "…";
}

const slugify = (s = "") =>
  s.toLowerCase().normalize("NFKD")
   .replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

// robust YYYY-MM-DD, tolerant of YAML date objects (if the CMS rewrites
// the date field unquoted, js-yaml parses it to a Date).
function ymd(v) {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

module.exports = function () {
  const dir = path.join(CONTENT, "events");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")) : [];

  let events = files.map((f) => {
    const g = matter(fs.readFileSync(path.join(dir, f), "utf8"));
    const d = g.data || {};
    return {
      Title: d.title || "",
      Date: ymd(d.date),
      Time: d.time || "",
      Venue: d.venue || "",
      City: d.city || "",
      Price: d.price || "",
      TicketURL: d.ticketUrl || "",
      ImageURL: d.image || "",
      Photo: d.photo || "",
      Description: (d.description != null ? String(d.description) : (g.content || "")).trim(),
      slug: f.replace(/\.md$/, "") || slugify(d.title),
    };
  }).filter((e) => e.Title);

  // newest first
  events.sort((a, b) => (b.Date || "").localeCompare(a.Date || ""));

  const today = new Date().toISOString().slice(0, 10);

  events = events.map((e, i) => {
    const dated = /^\d{4}-\d{2}-\d{2}$/.test(e.Date);
    const start = (e.Time || "").split("-")[0].trim();
    const upcoming = dated && e.Date >= today;
    // past events lead with a photo from the event if one is set; upcoming
    // events lead with their poster/graphic. Falls back to the poster either way.
    const lead = (!upcoming && e.Photo) ? e.Photo : e.ImageURL;
    return {
      ...e,
      url: dated ? `/events/${e.Date.replace(/-/g, "/")}/${e.slug}/` : `/events/${e.slug}/`,
      year: dated ? e.Date.slice(0, 4) : "",
      meta: [e.Time, e.Venue, e.City].filter(Boolean).join(" · "),
      startISO: dated ? `${e.Date}${start ? "T" + start : ""}` : "",
      excerpt: excerptOf(e.Description),
      isUpcoming: upcoming,
      LeadURL: lead,
      dims: dimsOf(e.ImageURL),
      leadDims: dimsOf(lead),
    };
  });

  if (!events.length) {
    throw new Error("No events found in content/events — aborting build to avoid an empty site.");
  }

  // upcoming soonest-first; past newest-first (events[] is already newest-first)
  const upcoming = events.filter((e) => e.isUpcoming).sort((a, b) => a.Date.localeCompare(b.Date));
  const past = events.filter((e) => !e.isUpcoming);
  const nextEvent = upcoming[0] || null;

  // group past events by year (past is already newest-first) for the index
  const pastByYear = [];
  for (const e of past) {
    const y = e.year || "Undated";
    let g = pastByYear.find((g) => g.year === y);
    if (!g) { g = { year: y, events: [] }; pastByYear.push(g); }
    g.events.push(e);
  }

  const s = JSON.parse(fs.readFileSync(path.join(CONTENT, "settings.json"), "utf8"));

  return {
    settings: s.settings || {},
    events,
    upcoming,
    past,
    pastByYear,
    nextEvent,
    artists: (s.artists || []).filter((a) => a.name)
      .map((a) => ({ Name: a.name, Role: a.role, Edition: a.edition, URL: a.url })),
    partners: (s.partners || []).filter((p) => p.name)
      .map((p) => ({ Name: p.name, URL: p.url })),
    media: (s.media || []).filter((m) => m.title)
      .map((m) => ({ Title: m.title, URL: m.url })),
  };
};
