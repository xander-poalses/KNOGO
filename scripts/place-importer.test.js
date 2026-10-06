import { describe, expect, it } from "vitest";
import { expandHoursRows, generateActivationSql, generateImportSql, generateReview, sqlString, validateBatch } from "./place-importer.mjs";

function batch(overrides = {}) {
  const place = { id: "test-place", slug: "test-place", name: "Test Place", group_id: "", category_id: "restaurant", region_id: "menlyn", address: "1 Test Road, Menlyn", latitude: "-25.78", longitude: "28.27", phone: "+27 12 000 0000", website: "https://example.com", menu_url: "", image_url: "", features: "walk_ins|card_payments", tags: "Cafe|Breakfast", source_url: "https://example.com/place", map_url: "https://www.openstreetmap.org/node/1", source_checked_at: "2026-08-26" };
  const hours = [...Array(7)].map((_, index) => ({ place_id: "test-place", hours_type: "opening", day_of_week: [...new Map([["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6], ["Sun", 7]]).keys()][index], open_time: "08:00", close_time: "17:00", is_closed: "false", sort_order: String(index + 1), source_url: "https://example.com/place", source_checked_at: "2026-08-26" }));
  return { groups: [], places: [{ ...place, ...overrides }], hours, existingPlaceIds: new Set(), existingGroupIds: new Set() };
}

describe("place importer", () => {
  it("validates a complete place with seven opening rows", () => expect(validateBatch(batch()).errors).toEqual([]));
  it("expands day ranges before validation and SQL generation", () => {
    const ranged = batch();
    ranged.hours = [{ ...ranged.hours[0], day_of_week: "Mon-Sun", sort_order: "1" }];
    expect(expandHoursRows(ranged.hours)).toHaveLength(7);
    expect(validateBatch(ranged).errors).toEqual([]);
    expect(generateImportSql(ranged, "test").match(/insert into public\.place_hours/g)).toHaveLength(7);
  });
  it("rejects unsupported features and missing contact details", () => {
    const result = validateBatch(batch({ features: "wifi", phone: "", website: "", region_id: "cape-town" }));
    expect(result.errors.some((error) => error.includes("phone/website"))).toBe(true);
    expect(result.errors.some((error) => error.includes("unsupported value 'wifi'"))).toBe(true);
    expect(result.errors.some((error) => error.includes("region_id is not supported"))).toBe(true);
  });
  it("escapes SQL and generates inactive idempotent upserts", () => {
    expect(sqlString("Joe's")).toBe("'Joe''s'");
    const sql = generateImportSql(batch({ name: "Joe's" }), "test");
    expect(sql).toContain("Joe''s");
    expect(sql).toContain("false) on conflict (id) do update");
  });
  it("creates live status rows only in activation SQL", () => {
    const sql = generateActivationSql(batch(), "test");
    expect(sql).toContain("update public.places set is_active = true");
    expect(sql).toContain("insert into public.live_statuses");
    expect(sql).toContain("on conflict (place_id) do nothing");
  });
  it("keeps branch image provenance in generated SQL and review output", () => {
    const image = batch({ image_url: "https://cdn.example.com/place.jpg", image_source_url: "https://example.com/photos", image_attribution: "Example Restaurant", image_checked_at: "2026-08-30" });
    const validation = validateBatch(image);
    expect(validation.errors).toEqual([]);
    expect(generateImportSql(image, "test")).toContain("image_source_url, image_attribution, image_checked_at");
    const review = generateReview(image, "test", validation);
    expect(review).toContain("Example Restaurant");
    expect(review).toContain("2026-08-30");
  });
});
