module.exports = function (eleventyConfig) {
  // static assets + custom-domain file copied straight through
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });

  // human date, e.g. "SUNDAY 22 FEBRUARY 2026"
  eleventyConfig.addFilter("eventDate", (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d
      .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      .toUpperCase();
  });

  // local image paths (from the sheet) -> root-absolute; pass external URLs through
  eleventyConfig.addFilter("img", (v) => {
    if (!v) return "";
    return /^https?:\/\//.test(v) ? v : "/" + String(v).replace(/^\/+/, "");
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["njk", "html"],
  };
};
