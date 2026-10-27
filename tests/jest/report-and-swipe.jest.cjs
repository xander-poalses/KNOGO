const { getApplicableReportAnswers, reportValidationError } = require("../../packages/core/src/reportDraft");
const { shouldDismissSheet } = require("../../apps/mobile/src/components/swipeDismiss");
const open = { type: "open_status", value: "open" };
const practical = [{ type: "kitchen_status", value: "yes" }, { type: "busy_level", value: "busy" }, { type: "walk_ins", value: "yes" }, { type: "card_machine", value: "cash_only" }, { type: "backup_power", value: "normal" }];

describe("report scope", () => {
  test("removes every service answer when a venue is closed", () => {
    const closed = { type: "open_status", value: "closed" };
    expect(getApplicableReportAnswers([closed, ...practical], "in_person")).toEqual([closed]);
  });
  test.each(["phone", "online"])("removes every service answer for %s checks", method => {
    expect(getApplicableReportAnswers([...practical, open], method)).toEqual([open]);
  });
  test("does not change the draft while filtering it", () => {
    const draft = Object.freeze([Object.freeze(open), ...practical.map(answer => Object.freeze({ ...answer }))]);
    expect(getApplicableReportAnswers(draft, "phone")).toEqual([open]);
    expect(draft).toHaveLength(6);
  });
  test("rejects an unknown check method", () => {
    expect(reportValidationError({ answers: [open], reportSource: "email" })).toContain("Choose how");
  });
  test("rejects a script URL even when an opening answer exists", () => {
    expect(reportValidationError({ answers: [open], reportSource: "online", sourceUrl: "javascript:alert(1)" })).toContain("website address");
  });
});

describe("swipe dismissal boundaries", () => {
  test.each([
    ["exact drag threshold", 140, 0, 800, false],
    ["past drag threshold", 141, 0, 800, true],
    ["exact flick travel threshold", 24, 701, 800, false],
    ["exact flick speed threshold", 25, 700, 800, false],
    ["past both flick thresholds", 25, 701, 800, true],
    ["quarter-height pull on a short screen", 101, 0, 400, true]
  ])("%s", (_label, distance, velocity, height, expected) => {
    expect(shouldDismissSheet(distance, velocity, height)).toBe(expected);
  });
});
