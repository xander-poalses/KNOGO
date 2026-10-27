import { describe, expect, it } from "vitest";
import { mapSupabaseConfirmation, mapSupabasePlace, mapSupabasePlaceGroup } from "./supabaseMapper";
import { getCurrentStatus } from "@knogo/core";

describe("Supabase mappers", () => {
  it("does not restore legacy booleans when the API sends an unsupported trust snapshot", () => {
    const place = mapSupabasePlace({
      place: { id: "branch", slug: "branch", name: "Branch", category_id: "restaurant", region_id: "hazelwood", address: "Hazelwood", latitude: -25.779, longitude: 28.257, phone: null, website: null, menu_url: null, features: [], tags: [], is_active: true },
      hours: [],
      liveStatus: { place_id: "branch", is_open: true, is_service_available: true, accepts_walk_ins: true, busy_level: "quiet", has_backup_power: true, card_machine_working: true, last_confirmed_at: null, confidence_score: 99, source: "community", trust_snapshot: { version: 99, claims: {} } as any }
    });
    expect(getCurrentStatus(place.currentStatus)).toMatchObject({ isOpen: null, isKitchenServing: null, confidenceScore: 0 });
  });
  it("maps place rows into the app place model", () => {
    const place = mapSupabasePlace({
      place: {
        id: "culture-corner",
        slug: "culture-corner",
        name: "Culture Club",
        category_id: "restaurant",
        region_id: "hazelwood",
        address: "Hazelwood, Pretoria",
        latitude: -25.779,
        longitude: 28.257,
        phone: null,
        website: null,
        menu_url: null,
        features: ["card_payments", "walk_ins"],
        tags: ["Mediterranean"],
        is_active: true,
        service_details: { description: "  A cafe serving coffee and meals.  " }
      },
      region: {
        id: "hazelwood",
        name: "Hazelwood",
        slug: "hazelwood",
        region_type: "suburb_area",
        parent_id: "pretoria",
        sort_order: 1
      },
      hours: [
        {
          place_id: "culture-corner",
          hours_type: "opening",
          day_of_week: "Mon",
          open_time: "11:00:00",
          close_time: "22:00:00",
          is_closed: false,
          sort_order: 1
        }
      ],
      liveStatus: {
        place_id: "culture-corner",
        is_open: true,
        is_service_available: null,
        accepts_walk_ins: null,
        busy_level: null,
        has_backup_power: true,
        card_machine_working: true,
        last_confirmed_at: null,
        confidence_score: 0,
        source: "estimated"
      }
    });

    expect(place.area).toBe("Hazelwood");
    expect(place.description).toBe("A cafe serving coffee and meals.");
    expect(place.currentStatus.busyLevel).toBe("unknown");
    expect(place.currentStatus.isKitchenServing).toBeNull();
    expect(place.openingHours[0].openTime).toBe("11:00");
    expect(place.openingHours[0].closeTime).toBe("22:00");
  });

  it("maps confirmation rows", () => {
    expect(
      mapSupabaseConfirmation({
        id: "1",
        place_id: "culture-corner",
        confirmation_type: "kitchen_status",
        value: "yes",
        created_at: "2026-07-07T10:00:00Z",
        location_verified: null,
        user_id: "00000000-0000-0000-0000-000000000000"
      })
    ).toMatchObject({
      placeId: "culture-corner",
      locationVerified: false,
      source: "user"
    });
  });

  it("maps grouped restaurant rows", () => {
    const group = mapSupabasePlaceGroup({
      group: {
        id: "doppio-zero",
        slug: "doppio-zero",
        name: "Doppio Zero",
        category_id: "restaurant",
        description: "Italian cafe group",
        website: "https://doppio.co.za",
        image_url: "https://example.com/doppio.jpg",
        features: null,
        tags: null,
        is_active: true
      },
      branches: [
        {
          id: "doppio-zero-hazelwood",
          slug: "doppio-zero-hazelwood",
          name: "Doppio Zero Hazelwood",
          category_id: "restaurant",
          region_id: "hazelwood",
          address: "Hazelwood",
          latitude: -25.779,
          longitude: 28.257,
          phone: null,
          website: null,
          menu_url: null,
          features: ["takeaway"],
          tags: ["Italian"],
          is_active: true,
          group_id: "doppio-zero",
          image_url: null
        }
      ]
    });

    expect(group.branchIds).toEqual(["doppio-zero-hazelwood"]);
    expect(group.cuisine).toEqual(["Italian"]);
    expect(group.features).toEqual(["takeaway"]);
  });

  it("keeps branch imagery separate from group imagery", () => {
    const place = mapSupabasePlace({
      place: {
        id: "branch", slug: "branch", name: "Branch", category_id: "restaurant", region_id: "hazelwood", address: "Hazelwood",
        latitude: -25.779, longitude: 28.257, phone: null, website: null, menu_url: null, features: [], tags: [], is_active: true,
        group_id: "group", image_url: null, image_source_url: null, image_attribution: null, image_checked_at: null
      },
      group: { id: "group", slug: "group", name: "Group", category_id: "restaurant", description: null, website: null, image_url: "https://example.com/group.jpg", tags: [], features: [], is_active: true },
      hours: []
    });
    expect(place.imageUrl).toBeUndefined();
  });
});
