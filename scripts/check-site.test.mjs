// Tests for check-site.mjs. Run: node --test scripts/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { checkSite } from "./check-site.mjs";

const ORIGIN = "https://bieterpost.de";

function page({ canonical, robots = "", body = "<h1>T</h1>", ld = "" }) {
  return `<!doctype html><html lang="de"><head><title>T</title>
<meta name="description" content="D">
${robots ? `<meta name="robots" content="${robots}">` : ""}
${canonical ? `<link rel="canonical" href="${canonical}"><meta property="og:url" content="${canonical}">` : ""}
${ld ? `<script type="application/ld+json">${ld}</script>` : ""}
</head><body>${body}</body></html>`;
}

function site(files) {
  const dir = mkdtempSync(join(tmpdir(), "site-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

function sitemap(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map((u) => `<url><loc>${u}</loc></url>`)
    .join("")}</urlset>`;
}

const HOME_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: "O" },
    { "@type": "Service", name: "S", offers: { "@type": "Offer", price: "79.00", priceCurrency: "EUR" } },
    { "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "Was kostet es?", acceptedAnswer: { "@type": "Answer", text: "79 €." } }] },
  ],
});
const HOME_BODY = '<h1>T</h1><a href="/ratgeber/">R</a><a href="impressum.html">I</a><details><summary>Was kostet es?</summary><p>79 €.</p></details>';
const ROBOTS = `User-agent: ${["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Bingbot", "Googlebot"].join("\nUser-agent: ")}\nAllow: /\n\nUser-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`;

function good(extra = {}) {
  return {
    "index.html": page({ canonical: `${ORIGIN}/`, body: HOME_BODY, ld: HOME_LD }),
    "index.md": "# T\n",
    "llms.txt": "# Bieterpost\n\n> Summary.\n\n## Seiten\n\n- [Start](https://bieterpost.de/index.md)\n",
    "impressum.html": page({ robots: "noindex" }),
    "404.html": page({ robots: "noindex" }),
    "ratgeber/index.html": page({ canonical: `${ORIGIN}/ratgeber/`, body: '<h1>R</h1><a href="/ratgeber/a/">A</a>' }),
    "ratgeber/a/index.html": page({ canonical: `${ORIGIN}/ratgeber/a/`, body: '<h1>A</h1><a href="/">Start</a><a href="#x">x</a><a href="https://example.org/y">y</a>', ld: '{"@type":"Article"}' }),
    "robots.txt": ROBOTS,
    "sitemap.xml": sitemap([`${ORIGIN}/`, `${ORIGIN}/ratgeber/`, `${ORIGIN}/ratgeber/a/`]),
    ...extra,
  };
}

test("a clean site passes", () => {
  assert.deepEqual(checkSite(site(good())), []);
});

test("internal link without trailing slash fails (GitHub Pages answers 301)", () => {
  const errs = checkSite(site(good({ "ratgeber/index.html": page({ canonical: `${ORIGIN}/ratgeber/`, body: '<h1>R</h1><a href="/ratgeber/a">A</a>' }) })));
  assert.ok(errs.some((e) => e.includes("/ratgeber/a") && e.includes("redirect")), errs.join("\n"));
});

test("internal link to a missing page fails", () => {
  const errs = checkSite(site(good({ "ratgeber/index.html": page({ canonical: `${ORIGIN}/ratgeber/`, body: '<h1>R</h1><a href="/ratgeber/b/">B</a>' }) })));
  assert.ok(errs.some((e) => e.includes("/ratgeber/b/")), errs.join("\n"));
});

test("canonical that differs from the sitemap URL fails", () => {
  const errs = checkSite(site(good({ "ratgeber/a/index.html": page({ canonical: `${ORIGIN}/ratgeber/a`, body: "<h1>A</h1>" }) })));
  assert.ok(errs.some((e) => e.includes("canonical")), errs.join("\n"));
});

test("noindex on a sitemap page fails", () => {
  const errs = checkSite(site(good({ "ratgeber/a/index.html": page({ canonical: `${ORIGIN}/ratgeber/a/`, robots: "noindex", body: "<h1>A</h1>" }) })));
  assert.ok(errs.some((e) => e.includes("noindex")), errs.join("\n"));
});

test("page neither in sitemap nor noindex fails", () => {
  const errs = checkSite(site(good({ "ratgeber/b/index.html": page({ canonical: `${ORIGIN}/ratgeber/b/`, body: "<h1>B</h1>" }) })));
  assert.ok(errs.some((e) => e.includes("ratgeber/b/index.html") && e.includes("sitemap")), errs.join("\n"));
});

test("sitemap URL without a file fails", () => {
  const errs = checkSite(site(good({ "sitemap.xml": sitemap([`${ORIGIN}/`, `${ORIGIN}/ratgeber/`, `${ORIGIN}/ratgeber/a/`, `${ORIGIN}/ratgeber/z/`]) })));
  assert.ok(errs.some((e) => e.includes("/ratgeber/z/")), errs.join("\n"));
});

test("sitemap URL without trailing slash fails", () => {
  const errs = checkSite(site(good({ "sitemap.xml": sitemap([`${ORIGIN}/`, `${ORIGIN}/ratgeber/`, `${ORIGIN}/ratgeber/a`]) })));
  assert.ok(errs.some((e) => e.includes("ratgeber/a") && e.includes("redirect")), errs.join("\n"));
});

test("404.html without noindex fails", () => {
  const errs = checkSite(site(good({ "404.html": page({}) })));
  assert.ok(errs.some((e) => e.includes("404.html")), errs.join("\n"));
});

test("robots.txt without sitemap line fails", () => {
  const errs = checkSite(site(good({ "robots.txt": "User-agent: *\nAllow: /\n" })));
  assert.ok(errs.some((e) => e.includes("robots.txt")), errs.join("\n"));
});

test("absolute link to www or http fails", () => {
  const errs = checkSite(site(good({ "ratgeber/a/index.html": page({ canonical: `${ORIGIN}/ratgeber/a/`, body: '<h1>A</h1><a href="http://bieterpost.de/">x</a><a href="https://www.bieterpost.de/">y</a>' }) })));
  assert.equal(errs.filter((e) => e.includes("bieterpost.de/")).length, 2, errs.join("\n"));
});

test("invalid JSON-LD fails", () => {
  const errs = checkSite(site(good({ "ratgeber/a/index.html": page({ canonical: `${ORIGIN}/ratgeber/a/`, body: "<h1>A</h1>", ld: "{oops" }) })));
  assert.ok(errs.some((e) => e.includes("JSON-LD")), errs.join("\n"));
});

test("sitemap page needs an h1, a title and a description", () => {
  const errs = checkSite(site(good({ "ratgeber/a/index.html": `<html><head><link rel="canonical" href="${ORIGIN}/ratgeber/a/"><meta property="og:url" content="${ORIGIN}/ratgeber/a/"></head><body><p>A</p></body></html>` })));
  for (const word of ["h1", "title", "description"]) assert.ok(errs.some((e) => e.includes(word)), `${word}: ${errs.join("\n")}`);
});

test("robots.txt without an explicit block for AI search crawlers fails", () => {
  const errs = checkSite(site(good({ "robots.txt": `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n` })));
  assert.ok(errs.some((e) => e.includes("robots.txt") && e.includes("OAI-SearchBot")), errs.join("\n"));
});

test("missing llms.txt fails", () => {
  const files = good();
  delete files["llms.txt"];
  const errs = checkSite(site(files));
  assert.ok(errs.some((e) => e.includes("llms.txt")), errs.join("\n"));
});

test("llms.txt without H1 or summary blockquote fails", () => {
  const errs = checkSite(site(good({ "llms.txt": "- [Start](https://bieterpost.de/index.md)\n" })));
  assert.ok(errs.some((e) => e.includes("llms.txt") && e.includes("H1")), errs.join("\n"));
  assert.ok(errs.some((e) => e.includes("llms.txt") && e.includes("blockquote")), errs.join("\n"));
});

test("llms.txt link to a missing Markdown file fails", () => {
  const errs = checkSite(site(good({ "llms.txt": "# B\n\n> S.\n\n- [X](https://bieterpost.de/ratgeber/x/index.md)\n" })));
  assert.ok(errs.some((e) => e.includes("llms.txt") && e.includes("/ratgeber/x/index.md")), errs.join("\n"));
});

test("homepage without Organization or Offer JSON-LD fails", () => {
  const errs = checkSite(site(good({ "index.html": page({ canonical: `${ORIGIN}/`, body: HOME_BODY }) })));
  assert.ok(errs.some((e) => e.includes("index.html") && e.includes("Organization")), errs.join("\n"));
  assert.ok(errs.some((e) => e.includes("index.html") && e.includes("Offer")), errs.join("\n"));
});

test("FAQPage question that is not on the page fails", () => {
  const body = HOME_BODY.replace("Was kostet es?</summary>", "Wie teuer?</summary>");
  const errs = checkSite(site(good({ "index.html": page({ canonical: `${ORIGIN}/`, body, ld: HOME_LD }) })));
  assert.ok(errs.some((e) => e.includes("FAQPage") && e.includes("Was kostet es?")), errs.join("\n"));
});
