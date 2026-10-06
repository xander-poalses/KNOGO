import { JSDOM, VirtualConsole } from "jsdom";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function readEnv(content) {
  return Object.fromEntries(content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, "")];
  }));
}

function absoluteUrl(value, pageUrl) {
  try {
    const url = new URL(value, pageUrl);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function findLogo(html, pageUrl) {
  const document = new JSDOM(html, { virtualConsole: new VirtualConsole() }).window.document;
  const images = [...document.querySelectorAll("img")].map((image) => ({
    url: absoluteUrl(image.currentSrc || image.src || image.getAttribute("data-src") || "", pageUrl),
    signal: `${image.alt} ${image.id} ${image.className} ${image.src}`.toLowerCase()
  }));
  const logoImage = images.find((image) => image.url && /(^|[\s_/-])(logo|brand)([\s_.\/-]|$)/i.test(image.signal));
  if (logoImage) return { logoUrl: logoImage.url, confidence: "high", method: "logo image declared by official site" };

  const touchIcon = document.querySelector('link[rel~="apple-touch-icon"]')?.getAttribute("href");
  const touchUrl = touchIcon ? absoluteUrl(touchIcon, pageUrl) : null;
  if (touchUrl) return { logoUrl: touchUrl, confidence: "medium", method: "touch icon declared by official site" };

  return { logoUrl: null, confidence: "none", method: "no company logo asset declared" };
}

async function getRows(apiUrl, key, table, query) {
  const response = await fetch(`${apiUrl}/rest/v1/${table}?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
  return response.json();
}

async function inspect(record) {
  if (!record.website) return { ...record, logoUrl: null, confidence: "none", method: "no official website recorded" };
  try {
    const response = await fetch(record.website, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "User-Agent": "KNOGO logo source audit/1.0" } });
    if (!response.ok) return { ...record, logoUrl: null, confidence: "none", method: `official site returned ${response.status}` };
    return { ...record, sourcePage: response.url, ...findLogo(await response.text(), response.url) };
  } catch (error) {
    return { ...record, logoUrl: null, confidence: "none", method: error instanceof Error ? error.message : "official site fetch failed" };
  }
}

const env = readEnv(await readFile(path.resolve("apps/mobile/.env.local"), "utf8").catch(() => readFile(path.resolve(".env.local"), "utf8")));
const apiUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!apiUrl || !key) throw new Error("Supabase public environment values are missing.");

const [groups, places] = await Promise.all([
  getRows(apiUrl, key, "place_groups", "select=id,name,website&is_active=eq.true&order=name.asc"),
  getRows(apiUrl, key, "places", "select=id,name,website&is_active=eq.true&group_id=is.null&order=name.asc")
]);
const records = [...groups.map((row) => ({ ...row, kind: "group" })), ...places.map((row) => ({ ...row, kind: "place" }))];
const results = [];
for (const record of records) {
  results.push(await inspect(record));
  process.stdout.write(results.at(-1).logoUrl ? "." : "x");
}
await mkdir(path.resolve("data/logo-audit"), { recursive: true });
await writeFile(path.resolve("data/logo-audit/official-site-logos.json"), `${JSON.stringify({ checkedAt: new Date().toISOString().slice(0, 10), results }, null, 2)}\n`);
console.log(`\nFound ${results.filter((item) => item.logoUrl).length} of ${results.length} logos.`);
