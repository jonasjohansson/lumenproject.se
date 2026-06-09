/* ------------------------------------------------------------------ *
 *  Build-time CMS: pull every tab of the public Google Sheet and hand
 *  it to the templates. Eleventy runs this once per build (push, the
 *  daily cron, or a manual run), so the static pages are pre-rendered
 *  from whatever is in the sheet at build time.
 *
 *  Sheet: https://docs.google.com/spreadsheets/d/1vFV9h4XjacVPzd9TUNDtsjucoUoSjpyMZLmKm9Jazms/edit
 * ------------------------------------------------------------------ */

const SHEET_ID = "1vFV9h4XjacVPzd9TUNDtsjucoUoSjpyMZLmKm9Jazms";

const gvizUrl = (tab) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}`;

function parseCSV(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function fetchTab(tab) {
  const res = await fetch(gvizUrl(tab));
  if (!res.ok) throw new Error(`Sheet fetch failed: ${tab} (${res.status})`);
  const rows = parseCSV(await res.text()).filter((r) => r.some((c) => c.trim() !== ""));
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, (r[i] || "").trim()]))
  );
}

const slugify = (s = "") =>
  s.toLowerCase().normalize("NFKD")
   .replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

module.exports = async function () {
  // Events are essential: if that fetch fails, fail the build loudly rather
  // than silently deploying an empty site. Secondary tabs degrade gracefully.
  const events = await fetchTab("Events");
  const [settingsRows, artists, partners, media] = await Promise.all(
    ["Settings", "Artists", "Partners", "Media"].map((t) =>
      fetchTab(t).catch((e) => { console.warn(e.message); return []; })
    )
  );
  if (!events.filter((e) => e.Title).length) {
    throw new Error("Events tab returned no rows — aborting build to avoid an empty site.");
  }

  const settings = {};
  settingsRows.forEach((r) => { if (r.Key) settings[r.Key] = r.Value; });

  const usedSlugs = new Set();
  const cleanEvents = events
    .filter((e) => e.Title)
    .map((e) => {
      let slug = slugify(e.Title) || "event";
      while (usedSlugs.has(slug)) slug = slug.replace(/(-\d+)?$/, (m) => `-${(parseInt(m.slice(1)) || 1) + 1}`);
      usedSlugs.add(slug);
      const dated = /^\d{4}-\d{2}-\d{2}$/.test(e.Date);
      const start = (e.Time || "").split("-")[0].trim();
      return {
        ...e,
        slug,
        url: dated ? `/events/${e.Date.replace(/-/g, "/")}/${slug}/` : `/events/${slug}/`,
        meta: [e.Time, e.Venue, e.City].filter(Boolean).join(" · "),
        startISO: dated ? `${e.Date}${start ? "T" + start : ""}` : "",
      };
    });

  return {
    settings,
    events: cleanEvents,
    artists: artists.filter((a) => a.Name),
    partners: partners.filter((p) => p.Name),
    media: media.filter((m) => m.Title),
  };
};
