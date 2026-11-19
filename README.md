# Bieterpost Site

Waitlist landing page for Bieterpost: daily public-tender alerts for construction and trade firms.

Live at [bieterpost.de](https://bieterpost.de). Static HTML, no build step, served by GitHub Pages.

- `index.html`: landing page. Headline variants via `?v=b`, trade pages via `?gewerk=<slug>` (slugs in `bieterpost` `marketing/copy.md` 4.3), confirmation view via `?bestaetigt=1`.
- `impressum.html`, `datenschutz.html`: legal pages.
- `fonts/`: self-hosted Barlow (OFL), no external requests.
- `ratgeber/<slug>/index.html`: articles, one plain HTML file per URL. Shared style `ratgeber/ratgeber.css`. Link and list them with a trailing slash (`/ratgeber/<slug>/`): GitHub Pages answers the slashless form with a 301.
- `sitemap.xml`, `robots.txt`, `404.html` (noindex). Add every new indexable page to `sitemap.xml`.
- `node scripts/check-site.mjs` checks sitemap, canonical, noindex and internal links; `node --test scripts/` tests it. CI runs both on every PR.
