/* YouTube videos for the /gallery/ page. Reads the `videos` list from
   content/gallery.json (managed in the CMS) and returns each as
   { id, title, embed, watch } for a responsive, lazy-loaded embed. */
const fs = require("fs");
const path = require("path");

const JSON_PATH = path.join(__dirname, "..", "..", "content", "gallery.json");

// pull the 11-char video id out of any common YouTube URL shape
const idOf = (u = "") => {
  const m = String(u).match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : "";
};

module.exports = function () {
  let videos = [];
  try { videos = JSON.parse(fs.readFileSync(JSON_PATH, "utf8")).videos || []; } catch {}
  return videos
    .map((v) => ({ id: idOf(v && v.url), title: ((v && v.title) || "").trim() }))
    .filter((v) => v.id)
    .map((v) => ({
      ...v,
      embed: `https://www.youtube-nocookie.com/embed/${v.id}`,
      watch: `https://youtu.be/${v.id}`,
    }));
};
