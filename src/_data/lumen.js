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
  // build the excerpt from prose only — skip decorative ":: ::" and "//" lines
  const s = String(text || "")
    .split(/\n/)
    .filter((l) => !/::|\/\/|https?:\/\/|www\.|instagram|facebook|spotify|youtu/i.test(l))
    .join(" ")
    .replace(/\s+/g, " ").trim();
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

// Pull the performer line-up out of an event description. Lumen writes rosters
// as "Performances by: NAME // NAME // NAME" or stand-alone "// NAME" headers.
// Heuristic + a stop-list; duos written "A & B" are kept as one act. This is
// best-effort over free text — easy to override later with explicit data.
const LINEUP_STOP = new Set([
  "LUMEN PROJECT", "LUMEN VOICES", "GONGS OF LUMEN", "TIME IS A MOUNTAIN",
  "THREE SEPERATE EVENTS", "STOCKHOLM 2020", "24 HR DRONE", "6 HR YOGA",
  "24 HOUR DRONE", "SPRING 24.4.", "WITH", "AND", "THE", "PRESENT", "PRESENTS",
  "NYC", "STOCKHOLM", "BEIRUT", "PARIS", "REYKJAVÍK", "BOVALLSTRAND", "MALMÖ",
  "ALMA LÖV", "SWEDEN", "LEBANON",
  "INFO", "COCOONING", "NOTE", "NB", "PROGRAMME", "PROGRAM", "THANKS", "LINE-UP", "LINEUP",
]);
// content/function words that mark a token as prose rather than an act name
const LINEUP_PROSE = /\b(of|to|with|and|for|in|at|by|from|seamless|celebration|advent|experience|longform|disconnect|participate|immerse|connect)\b/i;

// canonical spellings for the artist index (keyed by upper-case variant).
// NB: "Subchamber Ensmble" is the act's real name, not a typo — don't "correct" it.
const ARTIST_ALIAS = {};
function parseLineup(desc) {
  if (!desc) return [];
  const text = String(desc).replace(/\r/g, "");
  const segs = [];
  const cue = text.match(/performances?\s+(?:by|from)\s*:?\s*([^\n]+)/i);
  if (cue) segs.push(cue[1]);
  for (const l of text.split("\n")) {
    if (/thanks|support|about|accessib|ticket|collab|in collaboration/i.test(l)) continue;
    if ((l.match(/\/\//g) || []).length >= 2 && /[A-ZÅÄÖ]{3,}/.test(l)) segs.push(l);
    else if (/^\s*\/\/\s*[A-ZÅÄÖ]{2,}/.test(l)) segs.push(l);   // "// DATASAL"
  }
  const out = [];
  const seen = new Set();
  for (const seg of segs) {
    for (let name of seg.split("//")) {
      name = name.replace(/présente|present(s)?/ig, "/").split("/")[0]
                 .replace(/[:|◇]/g, " ").replace(/\s+/g, " ").trim();
      name = name.replace(/^(BEIRUT|STOCKHOLM|MALMÖ|PARIS|REYKJAVÍK|BOVALLSTRAND|NYC)\s+/i, "").trim();
      if (!name || name.length < 2 || name.length > 48) continue;
      if (/^https?:|facebook|spotify|tickster|biljett|doors|sek|youtu|^\d/i.test(name)) continue;
      if (/,|\bartists?\b|response|present/i.test(name)) continue;
      if (LINEUP_STOP.has(name.toUpperCase())) continue;
      // all-caps act names pass; otherwise reject prose fragments / sizes
      if (name !== name.toUpperCase()) {
        if (name.includes(" ") && LINEUP_PROSE.test(name)) continue;
        if (/\d/.test(name)) continue;
      }
      const k = name.toUpperCase();
      if (!seen.has(k)) { seen.add(k); out.push(name); }
    }
  }
  return out;
}

// Europe/Stockholm UTC offset for a given YYYY-MM-DD (handles CET/CEST DST).
function tzOffset(ymdStr) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Stockholm", timeZoneName: "longOffset",
    }).formatToParts(new Date(ymdStr + "T12:00:00Z"));
    const tz = (parts.find((p) => p.type === "timeZoneName") || {}).value || "";
    return tz.replace("GMT", "") || "+01:00"; // e.g. "+01:00" / "+02:00"
  } catch (e) { return "+01:00"; }
}
// Normalise a "15:00" / "9.00" clock value to "HH:MM:SS", or "" if unparseable.
function hhmmss(s) {
  const m = String(s || "").replace(".", ":").match(/^(\d{1,2}):(\d{2})$/);
  return m ? `${String(m[1]).padStart(2, "0")}:${m[2]}:00` : "";
}

module.exports = function () {
  const dir = path.join(CONTENT, "events");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")) : [];

  let events = files.map((f) => {
    const g = matter(fs.readFileSync(path.join(dir, f), "utf8"));
    const d = g.data || {};
    return {
      Title: (d.title || "").replace(/\s*\/\/+\s*/g, " / "),
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
    const tparts = (e.Time || "").split(/\s*[–—-]\s*/);
    const startC = hhmmss(tparts[0]);
    const endC = hhmmss(tparts[1]);
    const off = dated ? tzOffset(e.Date) : "";
    const priceNum = (String(e.Price || "").match(/(\d+)/) || [])[1] || "";
    const isFree = /\bfree\b|gratis|kostnadsfri/i.test(e.Price || "");
    const upcoming = dated && e.Date >= today;
    // hero leads with the event's project artwork (poster/graphic); falls back
    // to an event photo only when there is no artwork.
    const lead = e.ImageURL || e.Photo;
    // only use the poster as the share image when it crops to a decent
    // landscape card (~1.91:1); square/ultrawide posters fall back to the
    // sitewide 1200×630 default (handled by base.njk when ogShare is empty).
    const leadDims = dimsOf(lead);
    const lr = leadDims && leadDims.width && leadDims.height ? leadDims.width / leadDims.height : 0;
    const ogShare = lr >= 1.4 && lr <= 2.2 && leadDims.width >= 600 ? lead : "";
    return {
      ...e,
      url: `/events/${e.slug}/`,
      datedUrl: dated ? `/events/${e.Date.replace(/-/g, "/")}/${e.slug}/` : "",
      rootUrl: `/${e.slug}/`,
      year: dated ? e.Date.slice(0, 4) : "",
      meta: [e.Time, e.Venue, e.City].filter(Boolean).join(" · "),
      startISO: dated ? `${e.Date}${startC ? "T" + startC + off : ""}` : "",
      endISO: dated && endC ? `${e.Date}T${endC}${off}` : "",
      priceNum: priceNum,
      isFree: isFree,
      excerpt: excerptOf(e.Description),
      isUpcoming: upcoming,
      LeadURL: lead,
      ogShare: ogShare,
      dims: dimsOf(e.ImageURL),
      leadDims: leadDims,
      lineup: parseLineup(e.Description),
    };
  });

  if (!events.length) {
    throw new Error("No events found in content/events — aborting build to avoid an empty site.");
  }

  // prev/next neighbours for in-page navigation (events[] is newest-first, so
  // the older event sits at i+1 and the newer one at i-1) — lightweight refs
  const ref = (r) => (r ? { url: r.url, Title: r.Title } : null);
  events = events.map((e, i, arr) => ({
    ...e,
    olderEvent: ref(arr[i + 1]),
    newerEvent: ref(arr[i - 1]),
  }));

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

  // 301-style redirect stubs from every prior URL shape (dated + root) -> /events/<slug>/
  const redirects = [];
  for (const e of events) {
    for (const from of [e.datedUrl, e.rootUrl]) {
      if (from && from !== e.url) redirects.push({ from, to: e.url });
    }
  }

  const s = JSON.parse(fs.readFileSync(path.join(CONTENT, "settings.json"), "utf8"));

  // Performer index: every act mined from event line-ups (newest event first),
  // enriched with role/url from the curated settings list where names match,
  // plus any curated artists that never appeared in a parsed line-up.
  const curated = new Map();
  for (const a of (s.artists || [])) if (a.name) curated.set(a.name.toUpperCase(), a);
  const artistMap = new Map();
  const addArtist = (name) => {
    name = name.trim();
    if (ARTIST_ALIAS[name.toUpperCase()]) name = ARTIST_ALIAS[name.toUpperCase()];
    if (name.length < 2) return;
    const k = name.toUpperCase();
    if (!artistMap.has(k)) {
      const c = curated.get(k) || {};
      artistMap.set(k, { Name: name, URL: c.url || "" });
    }
  };
  // index lists individuals: split billed duos ("A & B") into separate names
  // (event pages keep the pairing — they render e.lineup directly).
  for (const e of events) for (const billed of e.lineup) billed.split(/\s+&\s+/).forEach(addArtist);
  for (const a of (s.artists || [])) {
    if (a.name && !artistMap.has(a.name.toUpperCase()))
      artistMap.set(a.name.toUpperCase(), { Name: a.name, Role: a.role || "", URL: a.url || "", Edition: a.edition || "" });
  }
  const artists = [...artistMap.values()].sort((a, b) => a.Name.localeCompare(b.Name, "sv"));

  return {
    settings: s.settings || {},
    events,
    upcoming,
    past,
    pastByYear,
    nextEvent,
    redirects,
    artists,
    partners: (s.partners || []).filter((p) => p.name)
      .map((p) => ({ Name: p.name, URL: p.url })),
    media: (s.media || []).filter((m) => m.title)
      .map((m) => ({ Title: m.title, URL: m.url })),
    photographers: (s.photographers || []).filter((p) => p.name)
      .map((p) => ({ Name: p.name, URL: p.url })),
  };
};
