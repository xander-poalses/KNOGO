import { describe, expect, it } from "vitest";
import { getPlaceDisplayName } from "@knogo/core";

describe("place display names", () => {
  it.each(["", " ", "\t\n"])("names a blank record without hiding it (%j)", name => {
    expect(getPlaceDisplayName(name)).toBe("Unnamed place");
  });
  it("keeps the full name and trims its edges", () => {
    expect(getPlaceDisplayName(" Caf\u00e9 S\u00e3o Jo\u00e3o ")).toBe("Caf\u00e9 S\u00e3o Jo\u00e3o");
  });
});
