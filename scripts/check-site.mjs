#!/usr/bin/env node
// Fails when a page could be indexed wrongly: every indexable page sits in the sitemap with a
// matching canonical, and every internal link hits a file directly (GitHub Pages answers
// /dir with a 301 to /dir/, so internal links and sitemap URLs must end in / or name a file).
// Usage: node scripts/check-site.mjs [site-dir]
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = "https://bieterpost.de";
const SKIP_DIRS = new Set([".git", "node_modules", "scripts", "fonts", ".github"]);

function htmlFiles(dir, root = dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return SKIP_DIRS.has(name) ? [] : htmlFiles(path, root);
    return name.endsWith(".html") ? [relative(root, path).split("\\").join("/")] : [];
  });
}

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"))?.[1];
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
const metaContent = (html, key, value) => tags(html, "meta").map((t) => (attr(t, key) === value ? attr(t, "content") : undefined)).find((v) => v !== undefined);

// URL path of a file: "index.html" -> "/", "ratgeber/a/index.html" -> "/ratgeber/a/", "x.html" -> "/x.html"
const urlPathOf = (file) => "/" + file.replace(/(^|\/)index\.html$/, "$1");

// File a URL path is served from without a redirect, or an error string.
function resolvePath(root, path) {
  if (path.endsWith("/")) {
    const file = posix.join(path.slice(1), "index.html");
    return existsSync(join(root, file)) ? { file } : { error: "no such page" };
  }
  const file = path.slice(1);
  if (existsSync(join(root, file)) && statSync(join(root, file)).isFile()) return { file };
  if (existsSync(join(root, file, "index.html"))) return { error: "redirect (301 to trailing slash)" };
  return { error: "no such file" };
}

export function checkSite(root) {
  const errors = [];
  const files = htmlFiles(root);

  const robots = existsSync(join(root, "robots.txt")) ? readFileSync(join(root, "robots.txt"), "utf8") : "";
  if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) errors.push(`robots.txt: missing "Sitemap: ${ORIGIN}/sitemap.xml"`);
  if (/^Disallow:\s*\/\s*$/m.test(robots)) errors.push("robots.txt: Disallow: / blocks the site");

  const sitemapXml = existsSync(join(root, "sitemap.xml")) ? readFileSync(join(root, "sitemap.xml"), "utf8") : "";
  if (!sitemapXml) errors.push("sitemap.xml: missing");
  const sitemapFiles = new Map(); // file -> url
  for (const [, url] of sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    if (!url.startsWith(`${ORIGIN}/`)) { errors.push(`sitemap.xml: ${url} is not on ${ORIGIN}`); continue; }
    const r = resolvePath(root, url.slice(ORIGIN.length));
    if (r.error) errors.push(`sitemap.xml: ${url}: ${r.error}`);
    else sitemapFiles.set(r.file, url);
  }

  if (!files.includes("404.html")) errors.push("404.html: missing");

  for (const file of files) {
    const html = readFileSync(join(root, file), "utf8");
    const noindex = /noindex/i.test(metaContent(html, "name", "robots") ?? "");
    const url = sitemapFiles.get(file);

    if (file === "404.html") {
      if (!noindex) errors.push("404.html: needs noindex");
    } else if (url) {
      if (noindex) errors.push(`${file}: in sitemap but noindex`);
      const canonical = tags(html, "link").map((t) => (attr(t, "rel") === "canonical" ? attr(t, "href") : undefined)).find(Boolean);
      if (canonical !== url) errors.push(`${file}: canonical ${canonical} != sitemap ${url}`);
      const ogUrl = metaContent(html, "property", "og:url");
      if (ogUrl !== url) errors.push(`${file}: og:url ${ogUrl} != sitemap ${url}`);
      if (!/<h1\b/i.test(html)) errors.push(`${file}: missing h1`);
      if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${file}: missing title`);
      if (!metaContent(html, "name", "description")) errors.push(`${file}: missing meta description`);
    } else if (!noindex) {
      errors.push(`${file}: not in sitemap and not noindex`);
    }

    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
      try { JSON.parse(m[1]); } catch (e) { errors.push(`${file}: invalid JSON-LD (${e.message})`); }
    }

    const base = urlPathOf(file);
    for (const tag of [...tags(html, "a"), ...tags(html, "link"), ...tags(html, "img"), ...tags(html, "script")]) {
      const ref = attr(tag, "href") ?? attr(tag, "src");
      if (!ref || ref.startsWith("#") || /^(mailto|tel|data):/i.test(ref)) continue;
      if (/^(https?:)?\/\/(www\.)?bieterpost\.de(\/|$)/i.test(ref)) {
        if (!ref.startsWith(`${ORIGIN}/`)) errors.push(`${file}: ${ref}: use ${ORIGIN}/ (no http, no www)`);
        else if (/^<a\b/i.test(tag)) errors.push(`${file}: ${ref}: link internally with a root-relative path`);
        continue;
      }
      if (/^[a-z]+:/i.test(ref) || ref.startsWith("//")) continue;
      const target = decodeURI(new URL(ref.split(/[?#]/)[0], ORIGIN + base).pathname);
      const r = resolvePath(root, target);
      if (r.error) errors.push(`${file}: link ${ref} -> ${target}: ${r.error}`);
    }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = checkSite(root);
  for (const e of errors) console.error(e);
  console.log(errors.length ? `${errors.length} problem(s)` : "site ok");
  process.exit(errors.length ? 1 : 0);
}
