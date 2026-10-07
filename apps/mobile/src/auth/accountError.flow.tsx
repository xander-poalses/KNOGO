import { describe, expect, it } from "vitest";
import { accountError } from "./accountError";

describe("account error guidance", () => {
  it.each([
    [{ status: 429 }, "Wait"],
    [{ code: "invalid_credentials" }, "email and password"],
    [{ code: "email_not_confirmed" }, "Confirm your email"],
    [{ code: "email_address_invalid" }, "typo"],
    [{ code: "over_email_send_rate_limit", status: 429 }, "Email limit"],
    [{ code: "email_address_not_authorized" }, "not available"],
    [{ code: "weak_password" }, "8 characters"]
  ])("maps provider codes to guidance", (cause, expected) => {
    expect(accountError(cause, "signup")).toContain(expected);
  });
  it("does not reveal provider messages or account existence", () => {
    const cause = { code: "user_already_exists", message: "secret token person@example.com" };
    expect(accountError(cause, "signup")).not.toMatch(/secret|person@example|exists/);
    expect(accountError(null, "signin")).toContain("connection");
  });
});
