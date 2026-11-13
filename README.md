# Bieterpost landing page

Static waitlist page for bieterpost.de, served by GitHub Pages. No build step.

- Form posts to launch-kit tenant `bieterpost` (`/public/lead-capture`, segment `unbestaetigt`).
- Double opt-in runs as a launch-kit flow; mail and flow sources live in
  `Idea-backlog/landing/ausschreibung/launch-kit/`.
- Copy: `Idea-backlog/landing/ausschreibung/copy-v2.md`. Headline variants via `?v=b|c|d`.
- `?bestaetigt=1` shows the page after the confirmation click.
