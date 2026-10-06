import { describe, expect, it, vi } from "vitest";
import { drainRiskQueue } from "../../supabase/functions/_shared/riskQueue";

const job = { report_id: "report", lease_id: "lease" };
const assessed = { risk: "low", reasons: ["no_pattern_detected"], model: "test", outcome: "assessed" };

describe("risk queue worker", () => {
  it("leaves an empty queue without making an assessment", async () => {
    const assess = vi.fn();
    expect(await drainRiskQueue({ claim: async () => null, assess, finish: async () => true })).toEqual({ completed: 0, deferred: 0 });
    expect(assess).not.toHaveBeenCalled();
  });
  it("claims one job at a time and stops after three", async () => {
    const claim = vi.fn(async () => job);
    const finish = vi.fn(async () => true);
    expect(await drainRiskQueue({ claim, assess: async () => assessed, finish, maxJobs: 100 })).toEqual({ completed: 3, deferred: 0 });
    expect(claim).toHaveBeenCalledTimes(3);
    expect(finish).toHaveBeenCalledWith(job, assessed);
  });
  it("records unknown risk when assessment throws and leaves remaining jobs alone", async () => {
    const claim = vi.fn(async () => job);
    const finish = vi.fn(async () => true);
    expect(await drainRiskQueue({ claim, assess: async () => { throw new Error("offline"); }, finish })).toEqual({ completed: 0, deferred: 1 });
    expect(finish).toHaveBeenCalledWith(job, expect.objectContaining({ risk: "unknown", outcome: "provider_error" }));
    expect(claim).toHaveBeenCalledTimes(1);
  });
  it("stops at quota instead of draining retry attempts for all reports", async () => {
    const claim = vi.fn(async () => job);
    expect(await drainRiskQueue({ claim, assess: async () => ({ ...assessed, risk: "unknown", outcome: "quota" }), finish: async () => true })).toEqual({ completed: 0, deferred: 1 });
    expect(claim).toHaveBeenCalledTimes(1);
  });
  it("does not count a result whose lease was rejected", async () => {
    expect(await drainRiskQueue({ claim: async () => job, assess: async () => assessed, finish: async () => false })).toEqual({ completed: 0, deferred: 1 });
  });
});
