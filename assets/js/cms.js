/* ------------------------------------------------------------------ *
 *  LUMEN PROJECT — dirt-simple CMS
 *
 *  The whole site is driven by one public Google Sheet.
 *  Edit the sheet, reload the page, the site updates. No build step.
 *
 *  Sheet: https://docs.google.com/spreadsheets/d/1vFV9h4XjacVPzd9TUNDtsjucoUoSjpyMZLmKm9Jazms/edit
 *  Tabs:  Settings (key/value), Events, Artists
 * ------------------------------------------------------------------ */

const SHEET_ID = "1vFV9h4XjacVPzd9TUNDtsjucoUoSjpyMZLmKm9Jazms";

/* headers=1 forces gviz to treat row 1 as the header even when every
   column is plain text (otherwise all-text tabs like Artists collapse). */
const gvizUrl = (tab) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}`;

/* --- tiny RFC-4180-ish CSV parser (handles quotes, commas, newlines) --- */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else if (c === "\r") {
      /* ignore */
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* Fetch a tab -> array of objects keyed by header row */
async function fetchTab(tab) {
  const res = await fetch(gvizUrl(tab), { cache: "no-store" });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${tab} (${res.status})`);
  const rows = parseCSV(await res.text()).filter((r) => r.some((c) => c.trim() !== ""));
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, (r[i] || "").trim()]))
  );
}

/* --------------------------- helpers ------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s = "") {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

/* --------------------------- Settings ----------------------------- */
async function applySettings() {
  let map = {};
  try {
    const rows = await fetchTab("Settings");
    rows.forEach((r) => { if (r.Key) map[r.Key] = r.Value; });
  } catch (e) { console.warn(e); }

  /* text bindings: <element data-setting="key"> */
  $$("[data-setting]").forEach((el) => {
    const v = map[el.dataset.setting];
    if (v) el.textContent = v;
  });

  /* link bindings: <a data-link="key"> sets href (mailto auto for emails) */
  $$("[data-link]").forEach((el) => {
    const v = map[el.dataset.link];
    if (!v) return;
    el.href = el.dataset.link === "contact_email" ? `mailto:${v}` : v;
  });

  /* image bindings: <element data-img="key">  (sheet-driven image URLs) */
  $$("[data-img]").forEach((el) => {
    const v = map[el.dataset.img];
    if (v) {
      el.style.backgroundImage = `url("${v}")`;
      el.classList.remove("is-empty");
    } else {
      el.classList.add("is-empty");
    }
  });

  /* list bindings: comma-separated -> <ul> of <li> */
  $$("[data-list]").forEach((el) => {
    const v = map[el.dataset.list];
    if (!v) return;
    el.innerHTML = v.split(",").map((s) => `<li>${esc(s.trim())}</li>`).join("");
  });

  return map;
}

/* ---------------------------- Events ------------------------------ */
function eventCard(e) {
  const bits = [e.Time, e.Venue, e.City].filter(Boolean).join(" · ");
  return `
    <article class="event">
      <div class="event__date"><time datetime="${esc(e.Date)}">${esc(fmtDate(e.Date))}</time></div>
      <div class="event__body">
        <h3 class="event__title">${esc(e.Title)}</h3>
        ${bits ? `<p class="event__meta">${esc(bits)}</p>` : ""}
        ${e.Description ? `<p class="event__desc">${esc(e.Description)}</p>` : ""}
        <p class="event__foot">
          ${e.Price ? `<span class="event__price">${esc(e.Price)}</span>` : ""}
          ${e.TicketURL ? `<a class="event__tickets" href="${esc(e.TicketURL)}" target="_blank" rel="noopener">Tickets</a>` : ""}
        </p>
      </div>
    </article>`;
}

async function renderEvents() {
  const upEl = $("#events-upcoming");
  const pastEl = $("#events-past");
  if (!upEl && !pastEl) return;

  let events = [];
  try { events = await fetchTab("Events"); } catch (e) { console.warn(e); }
  events = events.filter((e) => e.Title);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isUpcoming = (e) => { const d = new Date(e.Date + "T00:00:00"); return !isNaN(d) && d >= today; };

  const upcoming = events.filter(isUpcoming).sort((a, b) => a.Date.localeCompare(b.Date));
  const past = events.filter((e) => !isUpcoming(e)).sort((a, b) => b.Date.localeCompare(a.Date));

  if (upEl) {
    upEl.innerHTML = upcoming.length
      ? upcoming.map(eventCard).join("")
      : `<p class="empty">No events announced right now. Sign up below to hear first.</p>`;
  }
  if (pastEl) pastEl.innerHTML = past.map(eventCard).join("");

  /* home page: show only the next upcoming event as a teaser */
  const teaser = $("#events-next");
  if (teaser) {
    teaser.innerHTML = upcoming.length
      ? eventCard(upcoming[0])
      : `<p class="empty">The next gathering is being prepared. Sign up below to hear first.</p>`;
  }
}

/* ---------------------------- Artists ----------------------------- */
async function renderArtists() {
  const el = $("#artists");
  if (!el) return;
  let artists = [];
  try { artists = await fetchTab("Artists"); } catch (e) { console.warn(e); }
  artists = artists.filter((a) => a.Name);
  el.innerHTML = artists.map((a) => {
    const inner = `<span class="artist__name">${esc(a.Name)}</span>${a.Role ? `<span class="artist__role">${esc(a.Role)}</span>` : ""}`;
    return a.URL
      ? `<li class="artist"><a href="${esc(a.URL)}" target="_blank" rel="noopener">${inner}</a></li>`
      : `<li class="artist">${inner}</li>`;
  }).join("");
}

/* ----------------------------- boot ------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  await applySettings();
  await Promise.all([renderEvents(), renderArtists()]);
  document.body.classList.add("is-loaded");
});
