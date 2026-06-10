/* Photographs for the /gallery/ page. Reads the ordered, captioned list from
   content/gallery.json (managed in the CMS) and returns each with intrinsic
   dimensions for a layout-shift-free masonry. Reorder / add alt text in the CMS;
   uploads land in src/assets/img/gallery/ and are referenced here. */
const fs = require("fs");
const path = require("path");
const { imageSize } = require("image-size");

const JSON_PATH = path.join(__dirname, "..", "..", "content", "gallery.json");
const ASSETS = path.join(__dirname, "..", "assets");

module.exports = function () {
  let photos = [];
  try { photos = JSON.parse(fs.readFileSync(JSON_PATH, "utf8")).photos || []; } catch {}
  return photos
    .filter((p) => p && p.image)
    .map((p) => {
      const disk = path.join(ASSETS, p.image.replace(/^\/assets\//, ""));
      let width, height;
      try { ({ width, height } = imageSize(fs.readFileSync(disk))); } catch {}
      return { src: p.image, width, height, alt: (p.alt || "").trim() };
    });
};
