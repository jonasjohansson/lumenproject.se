/* ------------------------------------------------------------------ *
 *  LUMEN PROJECT — dirt-simple CMS
 *
 *  The whole site is driven by one public Google Sheet.
 *  Edit the sheet, reload the page, the site updates. No build step.
 *
 *  Sheet: https://docs.google.com/spreadsheets/d/1vFV9h4XjacVPzd9TUNDtsjucoUoSjpyMZLmKm9Jazms/edit
 *  Tabs:  Settings (key/value), Events, Artists, Partners, Media
 * ------------------------------------------------------------------ */

const SHEET_ID = "1vFV9h4XjacVPzd9TUNDtsjucoUoSjpyMZLmKm9Jazms";

/* headers=1 forces gviz to treat row 1 as the header even when every
   column is plain text (otherwise all-text tabs collapse into one row). */
const gvizUrl = (tab) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}`;

/* --- tiny RFC-4180-ish CSV parser (handles quotes, commas, newlines) --- */
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
  const res = await fetch(gvizUrl(tab), { cache: "no-store" });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${tab} (${res.status})`);
  const rows = parseCSV(await res.text()).filter((r) => r.some((c) => c.trim() !== ""));
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, (r[i] || "").trim()]))
  );
}

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s = "") => s.replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* "LUMEN PROJECT // WINTER 21.12" -> "lumen-project-winter-2112" */
const slugify = (s = "") =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
   .replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

const eventHref = (e) => `event.html?e=${encodeURIComponent(slugify(e.Title))}`;

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase();
}

/* --------------------------- Settings ----------------------------- */
async function applySettings() {
  let map = {};
  try {
    (await fetchTab("Settings")).forEach((r) => { if (r.Key) map[r.Key] = r.Value; });
  } catch (e) { console.warn(e); }

  $$("[data-setting]").forEach((el) => { const v = map[el.dataset.setting]; if (v) el.textContent = v; });

  $$("[data-link]").forEach((el) => {
    const v = map[el.dataset.link]; if (!v) return;
    el.href = el.dataset.link === "contact_email" ? `mailto:${v}` : v;
  });

  $$("[data-img]").forEach((el) => {
    const v = map[el.dataset.img];
    if (v) { el.style.backgroundImage = `url("${v}")`; el.classList.remove("is-empty"); }
    else el.classList.add("is-empty");
  });

  return map;
}

/* ---------------------------- Events ------------------------------ */
function eventCard(e) {
  const meta = [e.Time, e.Venue, e.City].filter(Boolean).join(" · ");
  const href = eventHref(e);                         /* every event has a detail page */
  const img = e.ImageURL
    ? `<div class="event__img" style="background-image:url('${esc(e.ImageURL)}')"></div>`
    : `<div class="event__img is-empty"></div>`;
  return `
    <article class="event">
      <a href="${href}" class="event__imglink">${img}</a>
      ${e.Date ? `<p class="event__date"><time datetime="${esc(e.Date)}">${esc(fmtDate(e.Date))}</time></p>` : ""}
      <h3 class="event__title"><a href="${href}">${esc(e.Title)}</a></h3>
      ${meta ? `<p class="event__meta">${esc(meta)}</p>` : ""}
      <p class="event__links"><a href="${href}">View event &rarr;</a></p>
    </article>`;
}

/* single-event page: event.html?e=<slug> */
async function renderEventDetail() {
  const el = $("#event-detail");
  if (!el) return;
  const slug = new URLSearchParams(location.search).get("e");
  let events = [];
  try { events = (await fetchTab("Events")).filter((e) => e.Title); } catch (e) { console.warn(e); }
  const ev = events.find((e) => slugify(e.Title) === slug) || events[0];
  if (!ev) { el.innerHTML = `<p class="empty">Event not found. <a href="events.html">&larr; All events</a></p>`; return; }

  document.title = `${ev.Title} — LUMEN PROJECT`;
  const meta = [ev.Time, ev.Venue, ev.City].filter(Boolean).join(" · ");
  el.innerHTML = `
    ${ev.ImageURL ? `<div class="event__img" style="background-image:url('${esc(ev.ImageURL)}')"></div>` : ""}
    ${ev.Date ? `<p class="event__date"><time datetime="${esc(ev.Date)}">${esc(fmtDate(ev.Date))}</time></p>` : ""}
    <h1 class="page-title event-detail__title">${esc(ev.Title)}</h1>
    ${meta ? `<p class="event__meta">${esc(meta)}</p>` : ""}
    ${ev.Description ? `<p class="event__desc prose">${esc(ev.Description)}</p>` : ""}
    <p class="event__links">
      ${ev.Price ? `<span>${esc(ev.Price)}</span>` : ""}
      ${ev.TicketURL ? `<a href="${esc(ev.TicketURL)}" target="_blank" rel="noopener">Tickets &rarr;</a>` : ""}
      <a href="events.html">&larr; All events</a>
    </p>`;
}

async function renderEvents() {
  const listEl = $("#events-list");
  const nextEl = $("#events-next");
  if (!listEl && !nextEl) return;

  let events = [];
  try { events = (await fetchTab("Events")).filter((e) => e.Title); } catch (e) { console.warn(e); }

  /* sheet order is newest-first; keep it (matches the live archive stream) */
  if (listEl) {
    listEl.innerHTML = events.length
      ? events.map(eventCard).join("")
      : `<p class="empty">No events to show yet.</p>`;
  }
  if (nextEl) {
    nextEl.innerHTML = events.length
      ? eventCard(events[0])
      : `<p class="empty">The next gathering is being prepared.</p>`;
  }
}

/* ---------------------------- Artists ----------------------------- */
async function renderArtists() {
  const el = $("#artists");
  if (!el) return;
  let rows = [];
  try { rows = (await fetchTab("Artists")).filter((a) => a.Name); } catch (e) { console.warn(e); }
  el.innerHTML = rows.map((a) => {
    const inner = `<span class="artist__name">${esc(a.Name)}</span>${a.Role ? `<span class="artist__role">${esc(a.Role)}</span>` : ""}`;
    return `<li class="artist">${a.URL ? `<a href="${esc(a.URL)}" target="_blank" rel="noopener">${inner}</a>` : inner}</li>`;
  }).join("");
}

/* ------------------- generic link lists (Partners/Media) ----------- */
async function renderLinkList(tab, sel, labelKey) {
  const el = $(sel);
  if (!el) return;
  let rows = [];
  try { rows = (await fetchTab(tab)).filter((r) => r[labelKey]); } catch (e) { console.warn(e); }
  el.innerHTML = rows.map((r) => {
    const label = esc(r[labelKey]);
    return `<li>${r.URL ? `<a href="${esc(r.URL)}" target="_blank" rel="noopener">${label}</a>` : label}</li>`;
  }).join("");
}

/* ----------------------------- boot ------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  await applySettings();
  await Promise.all([
    renderEvents(),
    renderEventDetail(),
    renderArtists(),
    renderLinkList("Partners", "#partners-list", "Name"),
    renderLinkList("Media", "#media-list", "Title"),
  ]);
  document.body.classList.add("is-loaded");
});
