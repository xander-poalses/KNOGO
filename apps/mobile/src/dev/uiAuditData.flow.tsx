import { describe, expect, it } from "vitest";
import { uiAuditPlaces } from "./uiAuditData";

describe("UI audit fixtures", () => {
  it("keeps all place identifiers outside business data and covers collection bounds", () => {
    for (const [state, length] of [["empty", 0], ["one", 1], ["worst", 8], ["huge", 1000]] as const) {
      const places = uiAuditPlaces(state);
      expect(places).toHaveLength(length);
      expect(new Set(places.map(place => place.id)).size).toBe(length);
      expect(places.every(place => place.id.startsWith("audit-"))).toBe(true);
    }
  });
});
