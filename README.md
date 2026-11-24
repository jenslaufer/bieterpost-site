# Bieterpost Site

Waitlist landing page for Bieterpost: daily public-tender alerts for construction and trade firms.

Live at [bieterpost.de](https://bieterpost.de). Static HTML, no build step, served by GitHub Pages.

- `index.html`: landing page. Headline variants via `?v=b`, trade pages via `?gewerk=<slug>` (slugs in `bieterpost` `marketing/copy.md` 4.3), confirmation view via `?bestaetigt=1`.
- `impressum.html`, `datenschutz.html`: legal pages.
- `fonts/`: self-hosted Barlow (OFL), no external requests.
- `ratgeber/<slug>/index.html`: articles, one plain HTML file per URL. Shared style `ratgeber/ratgeber.css`. Link and list them with a trailing slash (`/ratgeber/<slug>/`): GitHub Pages answers the slashless form with a 301.
- `sitemap.xml`, `robots.txt`, `404.html` (noindex). Add every new indexable page to `sitemap.xml`.
- AI visibility: `robots.txt` allows AI search and training crawlers explicitly (decision: allow training). `llms.txt` links to Markdown copies of the key pages (`index.md` next to each `index.html`); edit the `.md` when you edit its page, and add new articles to `llms.txt`. The homepage carries Organization, Service/Offer and FAQPage JSON-LD; the FAQPage text mirrors the visible FAQ.
- `<key>.txt` at the root is the IndexNow key. Ping after a deploy: `ai-visibility.mjs indexnow bieterpost.de <key>` (toolkit skill `ai-visibility`).
- `node scripts/check-site.mjs` checks sitemap, canonical, noindex, internal links, the AI crawler block in robots.txt, llms.txt links and the homepage JSON-LD; `node --test scripts/*.test.mjs` tests it. CI runs both on every PR.
