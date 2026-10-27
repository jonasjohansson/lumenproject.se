# Editing Lumen Project (for collaborators)

You edit the site in **Pages CMS** — go to
[lumenproject.se/admin](https://lumenproject.se/admin/) (or app.pagescms.org)
and sign in with GitHub.

> **Saving = publishing.** A save goes to the live site within a couple of
> minutes. There's no draft mode yet, so finish a change before you save.

## Events

Each event is a form. The important fields:

- **Title** — also used to build the web address, so **don't rename a published
  event** (it breaks existing links). Ask a developer if a rename is needed.
- **Date** — required, `YYYY-MM-DD`.
- **Time** — a range like `15:00-21:00` (24-hour, start–end). Other formats are
  rejected on save.
- **Admission** — free text, e.g. `350 SEK` or `Free`.
- **Ticket URL** — must start with `https://`. Put ticket links *here*, not in
  the description.
- **Poster / graphic** — the artwork at the top of the event page and in link
  previews. A roughly landscape (≈2:1) image previews best when shared; a square
  poster will fall back to the site's default share image.
- **Line-up** — add each performer as a row (name + optional link). **Use this**
  rather than listing performers in the description — it's what drives the
  Artists list across the site, reliably.
- **Description** — the body text. A few formatting rules (below).

### Description formatting rules

The description is plain text, lightly auto-formatted. To avoid surprises:

- **Don't TYPE WHOLE LINES IN CAPITALS** unless you want them to become a bold
  section heading (e.g. a line `ACCESSIBILITY` becomes a heading).
- **Links in the body may not appear.** Lines containing a web address or words
  like Instagram / Spotify / YouTube / Facebook are removed. Put links in the
  proper fields (Ticket URL, or the social links in Site settings).
- **Don't repeat the date/time/venue/price** in the body — those come from the
  fields automatically. (Lines containing `::` are stripped.)
- You don't need the old `Performances by: A // B // C` line anymore — use the
  **Line-up** field instead.

## Interviews

Long-form interviews with artists, at
[lumenproject.se/interviews](https://lumenproject.se/interviews/). Each
interview is a form:

- **Title** — usually the artist's name. It also builds the web address
  (`/interviews/jolanda-moletta/`), so **don't rename a published interview**.
- **Date published** — `YYYY-MM-DD`; the list is newest first.
- **Intro** — one or two sentences above the interview. Also used in link
  previews and search results.
- **Photo** (optional) — uploads into the `interviews` folder. Fill in the
  photo description and credit too. A landscape photo (about 2:1) also becomes
  the image shown when the link is shared.
- **Related event** (optional) — pick the event. The interview then shows the
  event (with the ticket button while it's upcoming), and the event page links
  back to the interview.
- **Interview** — the text itself, in a normal text editor. Make **each
  question bold** (the whole question, on its own line); it is then styled as a
  question. Answers are ordinary paragraphs underneath. Italics and links work
  as you'd expect.

To link to it from the newsletter, copy the address of the published page.

## Site settings

One screen for sitewide text and lists:

- **Text & links** — tagline, about, team, the gallery/artists intro lines,
  the general, press and booking emails, mailing-list and social URLs.
- **Photographers / Artists / Partners / Press** — drag to reorder; each row
  expands to edit its fields. *Artists* are mostly detected automatically from
  event line-ups; add a row here only to attach a link or include someone who
  never appeared in a line-up.

## Images & gallery

- Upload via the **media browser** into the right folder: `events` (posters),
  `photos` (hero/about), `gallery`.
- The **Gallery** is an ordered, captioned list — add a photo, drag to set its
  position, and give it alt text (a short description for screen readers / SEO).

## If something looks wrong

Every change is saved in the project's history, so a developer can roll back a
bad edit. When in doubt, ask before saving.
