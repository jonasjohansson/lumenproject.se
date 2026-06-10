const Image = require("@11ty/eleventy-img");
const path = require("path");

module.exports = function (eleventyConfig) {
  // static assets + custom-domain file copied straight through
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });

  // Responsive gallery images: emit AVIF/WebP/JPEG at several widths with
  // srcset, so phones don't download 1500px originals. `webSrc` is the
  // root-absolute path from gallery.js (e.g. /assets/img/gallery/001-g02.jpg).
  eleventyConfig.addNunjucksAsyncShortcode("galleryImg", async function (webSrc, alt, sizes) {
    const input = path.join("src", webSrc);
    const metadata = await Image(input, {
      widths: [400, 800, 1200],
      formats: ["avif", "webp", "jpeg"],
      outputDir: "./_site/assets/img/gallery/opt/",
      urlPath: "/assets/img/gallery/opt/",
    });
    return Image.generateHTML(metadata, {
      alt: alt || "",
      sizes: sizes || "(max-width: 640px) 92vw, 320px",
      loading: "lazy",
      decoding: "async",
    });
  });

  // human date, matching the original: "Sunday, February 22, 2026"
  eleventyConfig.addFilter("eventDate", (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  });

  // local image paths (from the sheet) -> root-absolute; pass external URLs through
  eleventyConfig.addFilter("img", (v) => {
    if (!v) return "";
    return /^https?:\/\//.test(v) ? v : "/" + String(v).replace(/^\/+/, "");
  });

  // fully-qualified image URL (for og:image / twitter:image — scrapers need absolute)
  const ORIGIN = "https://lumenproject.se";
  eleventyConfig.addFilter("absImg", (v) => {
    if (!v) return "";
    return /^https?:\/\//.test(v) ? v : ORIGIN + "/" + String(v).replace(/^\/+/, "");
  });

  // Normalise a shouting/lowercase name to Title Case. A few intentionally
  // stylised names are passed through untouched.
  const NAME_EXCEPTIONS = {
    "FUJI||||||||||TA": "FUJI||||||||||TA",
    "XTC IN THE XIV": "XTC in the XIV",
    "C.LAVENDER": "C. Lavender",
    "BITOI": "BITOI",
  };
  const MINOR = new Set(["the", "of", "and", "in", "by", "for", "a", "an", "to", "x", "och"]);
  function titleCase(s) {
    s = String(s).replace(/\s+/g, " ").trim();
    if (NAME_EXCEPTIONS[s]) return NAME_EXCEPTIONS[s];
    return s.toLowerCase()
      .replace(/(^|[\s\-&./(])([\p{L}])/gu, (m, sep, c) => sep + c.toUpperCase())
      .replace(/\b([\p{L}]+)\b/gu, (w) => (MINOR.has(w.toLowerCase()) ? w.toLowerCase() : w))
      // keep the first letter capital even if it's a minor word
      .replace(/^([\p{L}])/u, (c) => c.toUpperCase());
  }
  eleventyConfig.addFilter("tc", titleCase);

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Render a free-text event description into tidy HTML: drop the "///" / "//"
  // dividers, promote shouting section labels (TICKETING NOTE -> "Ticketing
  // Note") to subheadings, and normalise //-separated performer line-ups.
  eleventyConfig.addFilter("eventBody", (raw) => {
    if (!raw) return "";
    const lines = String(raw).replace(/\r/g, "").split("\n");
    let html = "";
    let para = [];
    const flush = () => { if (para.length) { html += "<p>" + para.join("<br>") + "</p>"; para = []; } };
    for (const line of lines) {
      const t = line.trim();
      if (!t) { flush(); continue; }
      if (/^[\/\\]{2,}$/.test(t)) { flush(); continue; }                 // bare /// or // divider
      if (/^[—–\-·•]+$/.test(t)) { flush(); continue; }                  // bare dash/dot divider
      if (t.includes("::")) { flush(); continue; }                       // decorative ":: ... ::" metadata
      if (/https?:\/\/|www\.|instagram|facebook|spotify|youtu\.?be|@lumen|lumenproject\.(se|com)/i.test(t)) { flush(); continue; }  // link / social lines
      // a stand-alone "Performances by:" label -> subheading
      if (/^performances?\s+(?:by|from)\b[\s:]*$/i.test(t)) { flush(); html += '<h3 class="ev-sub">Performances</h3>'; continue; }
      const seps = (t.match(/\/\//g) || []).length;
      // multi-act line-up: "Performances by: A // B // C"
      if (seps >= 2) {
        const m = t.match(/^(performances?\s+(?:by|from)\s*:?\s*)?([\s\S]*)$/i);
        const names = m[2].split("//").map((x) => titleCase(x.replace(/[◇|]/g, " ").replace(/\bpresents?\b.*/i, "").trim())).filter(Boolean);
        flush();
        if (m[1]) html += '<h3 class="ev-sub">Performances</h3>';
        html += '<p class="ev-cast">' + esc(names.join("  /  ")) + "</p>";
        continue;
      }
      // single "// LABEL" header (used by some events for sections / single acts)
      const solo = t.match(/^\/\/\s*([\p{L}][\p{L}\s.&'-]{1,30})$/u);
      if (solo) { flush(); html += '<h3 class="ev-sub">' + esc(titleCase(solo[1])) + "</h3>"; continue; }
      // a shouting line (ALL CAPS, starts with a letter, not a sentence) -> subheading
      const letters = t.replace(/[^\p{L}]/gu, "");
      if (letters.length > 1 && t === t.toUpperCase() && /^[\p{Lu}]/u.test(t) && !/[.!?]$/.test(t) && t.split(/\s+/).length <= 8) {
        flush(); html += '<h3 class="ev-sub">' + esc(titleCase(t)) + "</h3>"; continue;
      }
      para.push(esc(t).replace(/Lumen Project/g, '<strong class="brand">Lumen Project</strong>'));
    }
    flush();
    return html;
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["njk", "html"],
  };
};
