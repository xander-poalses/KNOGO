// Imports
import { parse } from "csv-parse/sync";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// State and Helpers
export const PLACE_FEATURES = new Set(["outdoor_seating", "family_friendly", "wheelchair_accessible", "backup_power", "card_payments", "late_night", "walk_ins", "takeaway", "bar", "halaal_friendly", "vegan_options", "pet_friendly"]);
export const CATEGORIES = new Set(["restaurant", "quick_bites", "bar", "pharmacy", "cafe", "hardware", "vet", "petrol_station", "government_office", "food_drink", "shops", "automotive", "public_services", "entertainment", "sport_outdoors"]);
export const REGIONS = new Set(["menlyn", "brooklyn", "hazelwood", "lynnwood", "faerie-glen", "moreleta-park", "garsfontein", "waterkloof", "silver-lakes", "olympus", "rietvalleirand", "equestria", "hazeldean", "erasmuskloof", "erasmus-park", "shere", "die-wilgers"]);
export const HOURS_TYPES = new Set(["opening", "kitchen"]);
export const DAYS = new Map([["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6], ["Sun", 7]]);

// Functions
export function expandHoursRows(rows) {
  const dayNames = [...DAYS.keys()];
  return rows.flatMap((row) => {
    const match = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)-(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/.exec(row.day_of_week ?? "");
    if (!match) return [row];
    const start = DAYS.get(match[1]);
    const end = DAYS.get(match[2]);
    if (start > end) return [row];
    return dayNames.slice(start - 1, end).map((day) => ({ ...row, day_of_week: day, sort_order: String(DAYS.get(day)) }));
  });
}

const requiredPlaceFields = ["id", "slug", "name", "category_id", "region_id", "address", "latitude", "longitude", "tags", "source_url", "map_url", "source_checked_at"];
const requiredGroupFields = ["id", "slug", "name", "category_id", "source_url", "source_checked_at"];
const requiredHoursFields = ["place_id", "hours_type", "day_of_week", "is_closed", "sort_order", "source_url", "source_checked_at"];

export function splitList(value = "") {
  return value.split("|").map((item) => item.trim()).filter(Boolean);
}

export function parseBoolean(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function sqlString(value) {
  if (value == null || value === "") return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function sqlArray(value) {
  const items = splitList(value);
  return items.length ? `array[${items.map(sqlString).join(", ")}]::text[]` : "'{}'::text[]";
}

function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function duplicateValues(rows, key) {
  const seen = new Set();
  const duplicates = new Set();
  for (const row of rows) {
    const value = row[key]?.trim().toLowerCase();
    if (!value) continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return duplicates;
}

function issue(file, row, field, message) {
  return `${file} row ${row + 2}: ${field} ${message}`;
}

export function validateBatch(batch) {
  const errors = [];
  const warnings = [];
  const placeIds = new Set(batch.places.map((row) => row.id));
  const groupIds = new Set(batch.groups.map((row) => row.id));
  const hours = expandHoursRows(batch.hours);

  for (const [file, rows, fields] of [["places.csv", batch.places, requiredPlaceFields], ["groups.csv", batch.groups, requiredGroupFields], ["hours.csv", batch.hours, requiredHoursFields]]) {
    rows.forEach((row, index) => fields.forEach((field) => {
      if (!row[field]?.trim()) errors.push(issue(file, index, field, "is required"));
    }));
  }

  for (const [key, values] of [["id", duplicateValues(batch.places, "id")], ["slug", duplicateValues(batch.places, "slug")]]) {
    for (const value of values) errors.push(`places.csv: duplicate ${key} '${value}'`);
  }
  for (const [key, values] of [["id", duplicateValues(batch.groups, "id")], ["slug", duplicateValues(batch.groups, "slug")]]) {
    for (const value of values) errors.push(`groups.csv: duplicate ${key} '${value}'`);
  }
  for (const value of duplicateValues(batch.places.filter((row) => row.phone), "phone")) errors.push(`places.csv: duplicate phone '${value}'`);
  for (const field of ["address", "coordinates"]) {
    const locationRows = new Map();
    for (const row of batch.places) {
      const key = field === "address" ? row.address?.trim().toLowerCase() : `${row.latitude},${row.longitude}`;
      locationRows.set(key, [...(locationRows.get(key) ?? []), row]);
    }
    for (const [location, rows] of locationRows) {
      if (rows.length < 2) continue;
      const centres = rows.map(row => {
        try {
          const details = JSON.parse(row.service_details || "{}");
          return details.coordinate_precision === "shopping_centre" && validUrl(details.coordinate_source) && row.data_notes ? details.shopping_centre : null;
        } catch { return null; }
      });
      if (!centres[0] || !centres.every(centre => centre === centres[0])) errors.push(`places.csv: duplicate ${field} '${location}' need a shared documented shopping-centre pin`);
    }
  }

  batch.places.forEach((row, index) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id ?? "")) errors.push(issue("places.csv", index, "id", "must be kebab-case"));
    if (row.slug !== row.id) errors.push(issue("places.csv", index, "slug", "must match id"));
    if (!CATEGORIES.has(row.category_id)) errors.push(issue("places.csv", index, "category_id", "is not supported"));
    if (!REGIONS.has(row.region_id)) errors.push(issue("places.csv", index, "region_id", "is not supported"));
    if (row.group_id && !groupIds.has(row.group_id) && !batch.existingGroupIds.has(row.group_id)) errors.push(issue("places.csv", index, "group_id", "does not exist in this batch or the reference list"));
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    if (!Number.isFinite(latitude) || latitude < -26.2 || latitude > -25.4) errors.push(issue("places.csv", index, "latitude", "is outside the Pretoria validation range"));
    if (!Number.isFinite(longitude) || longitude < 27.7 || longitude > 28.8) errors.push(issue("places.csv", index, "longitude", "is outside the Pretoria validation range"));
    if (!row.phone && !row.website) errors.push(issue("places.csv", index, "phone/website", "requires at least one contact field"));
    for (const field of ["website", "menu_url", "image_url", "image_source_url", "logo_url", "logo_source_url", "source_url", "map_url"]) if (row[field] && !validUrl(row[field])) errors.push(issue("places.csv", index, field, "must be an http(s) URL"));
    if (!validDate(row.source_checked_at ?? "")) errors.push(issue("places.csv", index, "source_checked_at", "must use YYYY-MM-DD"));
    if (!splitList(row.tags).length) errors.push(issue("places.csv", index, "tags", "must contain at least one search tag"));
    if (row.place_type && !/^[a-z][a-z0-9_]{0,79}$/.test(row.place_type)) errors.push(issue("places.csv", index, "place_type", "must use snake_case"));
    if (["shops", "automotive", "public_services", "entertainment", "sport_outdoors"].includes(row.category_id) && !row.place_type) errors.push(issue("places.csv", index, "place_type", "is required for expansion categories"));
    if (row.hours_status && !["unpublished", "partial", "complete"].includes(row.hours_status)) errors.push(issue("places.csv", index, "hours_status", "must be unpublished, partial or complete"));
    if (row.service_details) {
      try {
        const details = JSON.parse(row.service_details);
        if (!details || typeof details !== "object" || Array.isArray(details)) throw new Error();
      } catch { errors.push(issue("places.csv", index, "service_details", "must be a JSON object")); }
    }
    for (const feature of splitList(row.features)) if (!PLACE_FEATURES.has(feature)) errors.push(issue("places.csv", index, "features", `contains unsupported value '${feature}'`));
    if (row.image_url && !row.image_source_url) errors.push(issue("places.csv", index, "image_source_url", "is required when image_url is set"));
    if (row.image_url && !row.image_attribution) errors.push(issue("places.csv", index, "image_attribution", "is required when image_url is set"));
    if (row.image_url && !validDate(row.image_checked_at ?? "")) errors.push(issue("places.csv", index, "image_checked_at", "must use YYYY-MM-DD when image_url is set"));
    if (!row.image_url) warnings.push(issue("places.csv", index, "image_url", "is blank; a branch colour fallback will be used"));
    if (row.logo_url && !row.logo_source_url) errors.push(issue("places.csv", index, "logo_source_url", "is required when logo_url is set"));
    if (row.logo_url && !validDate(row.logo_checked_at ?? "")) errors.push(issue("places.csv", index, "logo_checked_at", "must use YYYY-MM-DD when logo_url is set"));
    if (!row.logo_url && !row.group_id) warnings.push(issue("places.csv", index, "logo_url", "is blank; a text fallback will be used"));
    if (!row.menu_url) warnings.push(issue("places.csv", index, "menu_url", "is blank"));
  });

  batch.groups.forEach((row, index) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id ?? "")) errors.push(issue("groups.csv", index, "id", "must be kebab-case"));
    if (row.slug !== row.id) errors.push(issue("groups.csv", index, "slug", "must match id"));
    if (!CATEGORIES.has(row.category_id)) errors.push(issue("groups.csv", index, "category_id", "is not supported"));
    if (!validUrl(row.source_url ?? "")) errors.push(issue("groups.csv", index, "source_url", "must be an http(s) URL"));
    if (!validDate(row.source_checked_at ?? "")) errors.push(issue("groups.csv", index, "source_checked_at", "must use YYYY-MM-DD"));
    for (const feature of splitList(row.features)) if (!PLACE_FEATURES.has(feature)) errors.push(issue("groups.csv", index, "features", `contains unsupported value '${feature}'`));
    for (const field of ["website", "logo_url", "logo_source_url"]) if (row[field] && !validUrl(row[field])) errors.push(issue("groups.csv", index, field, "must be an http(s) URL"));
    if (row.logo_url && !row.logo_source_url) errors.push(issue("groups.csv", index, "logo_source_url", "is required when logo_url is set"));
    if (row.logo_url && !validDate(row.logo_checked_at ?? "")) errors.push(issue("groups.csv", index, "logo_checked_at", "must use YYYY-MM-DD when logo_url is set"));
    if (!row.logo_url) warnings.push(issue("groups.csv", index, "logo_url", "is blank; a text fallback will be used"));
  });

  const openingDays = new Map();
  const hoursKeys = new Set();
  hours.forEach((row, index) => {
    const key = `${row.place_id}:${row.hours_type}:${row.day_of_week}`;
    if (hoursKeys.has(key)) errors.push(issue("hours.csv", index, "day", "duplicates the same place, type and day"));
    hoursKeys.add(key);
    if (!placeIds.has(row.place_id)) errors.push(issue("hours.csv", index, "place_id", "does not exist in places.csv"));
    if (!HOURS_TYPES.has(row.hours_type)) errors.push(issue("hours.csv", index, "hours_type", "must be opening or kitchen"));
    if (!DAYS.has(row.day_of_week)) errors.push(issue("hours.csv", index, "day_of_week", "must be Mon through Sun"));
    if (Number(row.sort_order) !== DAYS.get(row.day_of_week)) errors.push(issue("hours.csv", index, "sort_order", "does not match day_of_week"));
    const closed = parseBoolean(row.is_closed);
    if (closed == null) errors.push(issue("hours.csv", index, "is_closed", "must be true or false"));
    if (!closed && (!validTime(row.open_time ?? "") || !validTime(row.close_time ?? ""))) errors.push(issue("hours.csv", index, "open_time/close_time", "must use HH:MM for open days"));
    if (!validUrl(row.source_url ?? "")) errors.push(issue("hours.csv", index, "source_url", "must be an http(s) URL"));
    if (!validDate(row.source_checked_at ?? "")) errors.push(issue("hours.csv", index, "source_checked_at", "must use YYYY-MM-DD"));
    if (row.hours_type === "opening") openingDays.set(row.place_id, (openingDays.get(row.place_id) ?? 0) + 1);
  });
  for (const row of batch.places) {
    const days = openingDays.get(row.id) ?? 0;
    if (row.hours_status === "unpublished") {
      if (days !== 0) errors.push(`hours.csv: ${row.id} is marked unpublished but has opening hours`);
      if (!row.data_notes) errors.push(`places.csv: ${row.id} needs data_notes explaining unpublished hours`);
    } else if (row.hours_status === "partial") {
      if (days < 1 || days > 6) errors.push(`hours.csv: ${row.id} needs one to six published opening days`);
      if (!row.data_notes) errors.push(`places.csv: ${row.id} needs data_notes explaining partial hours`);
    } else if (days !== 7) errors.push(`hours.csv: ${row.id} requires exactly seven opening days after ranges are expanded`);
  }

  return { errors, warnings };
}

async function readCsv(file, required = true) {
  try {
    const content = await readFile(file, "utf8");
    return parse(content, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (error) {
    if (!required && error.code === "ENOENT") return [];
    throw error;
  }
}

async function readLines(file) {
  try {
    return new Set((await readFile(file, "utf8")).split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  } catch (error) {
    if (error.code === "ENOENT") return new Set();
    throw error;
  }
}

export async function loadBatch(folder) {
  return {
    groups: await readCsv(path.join(folder, "groups.csv"), false),
    places: await readCsv(path.join(folder, "places.csv")),
    hours: await readCsv(path.join(folder, "hours.csv")),
    existingPlaceIds: await readLines(path.join(folder, "existing-place-ids.txt")),
    existingGroupIds: await readLines(path.join(folder, "existing-group-ids.txt"))
  };
}

export function generateImportSql(batch, batchName) {
  const statements = [`-- Generated KNOGO import: ${batchName}`, "begin;"];
  const upsert = (table, values, preserve = []) => {
    const columns = Object.keys(values);
    statements.push(`insert into public.${table} (${columns.join(", ")}, is_active) values (${Object.values(values).join(", ")}, false) on conflict (id) do update set ${columns.filter(column => column !== "id").map(column => `${column} = ${preserve.includes(column) ? `coalesce(excluded.${column}, ${table}.${column})` : `excluded.${column}`}`).join(", ")}, updated_at = now();`);
  };
  for (const row of batch.groups) upsert("place_groups", {
    ...Object.fromEntries(["id", "slug", "name", "category_id", "description", "website", "image_url", "logo_url", "logo_source_url", "logo_checked_at", "source_url", "source_checked_at"].map(key => [key, sqlString(row[key])])),
    features: sqlArray(row.features), tags: sqlArray(row.tags)
  }, ["description", "website", "image_url", "logo_url", "logo_source_url", "logo_checked_at"]);
  for (const row of batch.places) upsert("places", {
    ...Object.fromEntries(["id", "slug", "name", "group_id", "category_id", "region_id", "address", "phone", "website", "menu_url", "image_url", "image_source_url", "image_attribution", "image_checked_at", "logo_url", "logo_source_url", "logo_checked_at", "place_type", "source_url", "source_checked_at", "map_url", "data_notes"].map(key => [key, sqlString(row[key])])),
    latitude: Number(row.latitude), longitude: Number(row.longitude), features: sqlArray(row.features), tags: sqlArray(row.tags), service_details: `${sqlString(row.service_details || "{}")}::jsonb`
  }, ["image_url", "image_source_url", "image_attribution", "image_checked_at", "logo_url", "logo_source_url", "logo_checked_at", "phone", "menu_url"]);
  for (const row of expandHoursRows(batch.hours)) statements.push(`insert into public.place_hours (place_id, hours_type, day_of_week, open_time, close_time, is_closed, sort_order, source_url, source_checked_at) values (${sqlString(row.place_id)}, ${sqlString(row.hours_type)}, ${sqlString(row.day_of_week)}, ${sqlString(row.open_time)}, ${sqlString(row.close_time)}, ${parseBoolean(row.is_closed)}, ${Number(row.sort_order)}, ${sqlString(row.source_url)}, ${sqlString(row.source_checked_at)}) on conflict (place_id, hours_type, day_of_week) do update set open_time = excluded.open_time, close_time = excluded.close_time, is_closed = excluded.is_closed, sort_order = excluded.sort_order, source_url = excluded.source_url, source_checked_at = excluded.source_checked_at;`);
  statements.push("commit;", "");
  return statements.join("\n");
}

export function generateActivationSql(batch, batchName) {
  const ids = batch.places.map((row) => sqlString(row.id)).join(", ");
  const groupIds = [...new Set(batch.places.map((row) => row.group_id).filter(Boolean))].map(sqlString).join(", ");
  return [`-- Generated KNOGO activation: ${batchName}`, "begin;", `update public.places set is_active = true, updated_at = now() where id in (${ids});`, groupIds ? `update public.place_groups set is_active = true, updated_at = now() where id in (${groupIds});` : "", `insert into public.live_statuses (place_id, busy_level, confidence_score, source) select id, 'unknown', 0, 'unknown' from public.places where id in (${ids}) on conflict (place_id) do nothing;`, "commit;", ""].filter(Boolean).join("\n");
}

export function generateReview(batch, batchName, validation) {
  const newPlaces = batch.places.filter((row) => !batch.existingPlaceIds.has(row.id));
  const updates = batch.places.filter((row) => batch.existingPlaceIds.has(row.id));
  const lines = [`# Place Import Review: ${batchName}`, "", `- Places: ${batch.places.length}`, `- New: ${newPlaces.length}`, `- Updates: ${updates.length}`, `- Groups: ${batch.groups.length}`, `- Opening days: ${expandHoursRows(batch.hours).filter((row) => row.hours_type === "opening").length}`, `- Branch images: ${batch.places.filter((row) => row.image_url).length}`, `- Errors: ${validation.errors.length}`, `- Warnings: ${validation.warnings.length}`, "", "## Places", "", "| Place | Region | Tags | Fact source | Image source | Attribution | Image checked |", "| --- | --- | --- | --- | --- | --- | --- |", ...batch.places.map((row) => `| ${row.name} | ${row.region_id} | ${splitList(row.tags).join(", ")} | ${row.source_url} | ${row.image_source_url || "Not supplied"} | ${row.image_attribution || "Not supplied"} | ${row.image_checked_at || "Not supplied"} |`), "", "## Errors", "", ...(validation.errors.length ? validation.errors.map((item) => `- ${item}`) : ["- None"]), "", "## Warnings", "", ...(validation.warnings.length ? validation.warnings.map((item) => `- ${item}`) : ["- None"]), ""];
  return lines.join("\n");
}

async function run() {
  const [command, folderArg] = process.argv.slice(2);
  if (!command || !folderArg) throw new Error("Usage: node scripts/place-importer.mjs <validate|generate|activate> <batch-folder>");
  const folder = path.resolve(folderArg);
  const batch = await loadBatch(folder);
  const validation = validateBatch(batch);
  if (command === "validate") {
    console.log(JSON.stringify(validation, null, 2));
    if (validation.errors.length) process.exitCode = 1;
    return;
  }
  if (validation.errors.length) throw new Error(`Batch has ${validation.errors.length} validation error(s). Run validate for details.`);
  const generated = path.join(folder, "generated");
  await mkdir(generated, { recursive: true });
  const batchName = path.basename(folder);
  if (command === "generate") {
    await Promise.all([writeFile(path.join(generated, "import.sql"), generateImportSql(batch, batchName)), writeFile(path.join(generated, "review.md"), generateReview(batch, batchName, validation))]);
    console.log(`Generated inactive import and review for ${batch.places.length} place(s).`);
    return;
  }
  if (command === "activate") {
    await writeFile(path.join(generated, "activate.sql"), generateActivationSql(batch, batchName));
    console.log(`Generated activation SQL for ${batch.places.length} place(s).`);
    return;
  }
  throw new Error(`Unknown command '${command}'.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
