#!/usr/bin/env node
/* Pre-build content validation. Run in CI before `npm run build` so a malformed
   CMS edit fails the job and never replaces the live site. Checks:
     - .pages.yml is valid YAML, content/settings.json is valid JSON
     - every event has a title and a valid YYYY-MM-DD date
     - time, if present, looks like a start-end range (matches the CMS pattern)
     - image/photo paths, if present, are root-absolute
   Exits non-zero (with a readable list) when anything fails. */
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const yaml = require("js-yaml");

const root = path.join(__dirname, "..");
const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

// config files parse
try { yaml.load(fs.readFileSync(path.join(root, ".pages.yml"), "utf8")); }
catch (e) { fail(".pages.yml", "invalid YAML — " + e.message); }
try { JSON.parse(fs.readFileSync(path.join(root, "content/settings.json"), "utf8")); }
catch (e) { fail("content/settings.json", "invalid JSON — " + e.message); }

// events
const TIME_RE = /^\s*\d{1,2}[:.]\d{2}\s*[–-]\s*\d{1,2}[:.]\d{2}\s*$/;
// Pages CMS writes dates unquoted, so gray-matter/js-yaml hands us a Date
// object rather than a string; normalise to YYYY-MM-DD the same way the build
// (src/_data/lumen.js ymd()) does, so the validator matches what actually ships.
const dateStr = (v) =>
  v instanceof Date ? (isNaN(v) ? "" : v.toISOString().slice(0, 10)) : String(v);
const evDir = path.join(root, "content/events");
for (const f of fs.readdirSync(evDir).filter((f) => f.endsWith(".md"))) {
  let data;
  try { data = matter(fs.readFileSync(path.join(evDir, f), "utf8")).data; }
  catch (e) { fail(f, "unparseable frontmatter — " + e.message); continue; }
  if (!data.title || !String(data.title).trim()) fail(f, "missing title");
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr(data.date)))
    fail(f, `date must be YYYY-MM-DD (got ${JSON.stringify(data.date)})`);
  if (data.time && !TIME_RE.test(String(data.time)))
    fail(f, `time should be a range like 15:00-21:00 (got ${JSON.stringify(data.time)})`);
  for (const k of ["image", "photo"]) {
    if (data[k] && !String(data[k]).startsWith("/assets/"))
      fail(f, `${k} should be a /assets/… path (got ${JSON.stringify(data[k])})`);
  }
}

if (errors.length) {
  console.error(`\n✗ Content validation failed (${errors.length}):\n`);
  for (const e of errors) console.error("  • " + e);
  console.error("");
  process.exit(1);
}
console.log("✓ Content valid");
