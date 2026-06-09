/* Photographs for the /gallery/ page. Reads every image in
   src/assets/img/gallery/ and returns it with intrinsic dimensions (for a
   layout-shift-free masonry). Drop a new image in the folder and it appears. */
const fs = require("fs");
const path = require("path");
const { imageSize } = require("image-size");

const DIR = path.join(__dirname, "..", "assets", "img", "gallery");

module.exports = function () {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => {
      let width, height;
      try { ({ width, height } = imageSize(fs.readFileSync(path.join(DIR, f)))); } catch {}
      return { src: "/assets/img/gallery/" + f, width, height };
    });
};
