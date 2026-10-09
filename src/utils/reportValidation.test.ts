import { describe, expect, it } from "vitest";
import { reportValidationError, type ConfirmationAnswer } from "@knogo/core";

const answers: ConfirmationAnswer[] = [
  { type: "open_status", value: "open" },
  { type: "kitchen_status", value: "yes" },
  { type: "busy_level", value: "quiet" }
];

describe("report submit validation", () => {
  it("rejects duplicate observations and invalid values", () => {
    expect(reportValidationError({ answers: [answers[0], answers[0]], reportSource: "phone" })).toContain("Review");
    expect(reportValidationError({ answers: [{ type: "open_status", value: "maybe" }], reportSource: "phone" })).toContain("Review");
  });
  it("explains why a missing check method cannot submit", () => {
    expect(reportValidationError({ answers, reportSource: null })).toContain("Choose how you checked");
  });
  it("accepts venue and phone reports without a URL", () => {
    expect(reportValidationError({ answers, reportSource: "in_person" })).toBeNull();
    expect(reportValidationError({ answers, reportSource: "phone" })).toBeNull();
  });
  it("requires an HTTP address for online reports and accepts surrounding spaces", () => {
    for (const sourceUrl of ["", "https://", "example.com", "javascript:alert(1)"]) {
      expect(reportValidationError({ answers, reportSource: "online", sourceUrl })).toContain("website address");
    }
    expect(reportValidationError({ answers, reportSource: "online", sourceUrl: " https://example.com/page " })).toBeNull();
  });
  it("requires one observation without forcing open, kitchen or busyness", () => {
    expect(reportValidationError({ answers: [], reportSource: "phone" })).toContain("at least one");
    for (const answer of [...answers, { type: "open_status" as const, value: "closed" }, { type: "card_machine" as const, value: "yes" }]) {
      expect(reportValidationError({ answers: [answer], reportSource: "phone" })).toBeNull();
    }
  });
});
