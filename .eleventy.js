module.exports = function (eleventyConfig) {
  // static assets + custom-domain file copied straight through
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });

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
      const seps = (t.match(/\/\//g) || []).length;
      // multi-act line-up: "Performances by: A // B // C"
      if (seps >= 2) {
        const m = t.match(/^(performances?\s+(?:by|from)\s*:?\s*)?([\s\S]*)$/i);
        const names = m[2].split("//").map((x) => titleCase(x.replace(/[◇|]/g, " ").trim())).filter(Boolean);
        flush();
        html += '<p class="ev-cast">' + esc(names.join("  /  ")) + "</p>";
        continue;
      }
      // single "// LABEL" header (used by some events for sections / single acts)
      const solo = t.match(/^\/\/\s*([\p{L}][\p{L}\s.&'-]{1,30})$/u);
      if (solo) { flush(); html += '<h3 class="ev-sub">' + esc(titleCase(solo[1])) + "</h3>"; continue; }
      // a shouting short label on its own line -> subheading
      const letters = t.replace(/[^\p{L}]/gu, "");
      if (letters.length > 1 && t === t.toUpperCase() && !t.includes("::") && t.split(/\s+/).length <= 3) {
        flush(); html += '<h3 class="ev-sub">' + esc(titleCase(t)) + "</h3>"; continue;
      }
      para.push(esc(t));
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
