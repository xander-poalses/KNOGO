export type RiskJob = { report_id: string; lease_id: string };
export type RiskResult = { risk: string; reasons: string[]; model: string; outcome: string };

export async function drainRiskQueue(input: {
  claim: () => Promise<RiskJob | null>;
  assess: (reportId: string) => Promise<RiskResult>;
  finish: (job: RiskJob, result: RiskResult) => Promise<boolean>;
  maxJobs?: number;
}) {
  let completed = 0;
  let deferred = 0;
  const requested = Number.isFinite(input.maxJobs) ? input.maxJobs! : 3;
  const limit = Math.min(3, Math.max(1, Math.floor(requested)));
  for (let index = 0; index < limit; index += 1) {
    const job = await input.claim();
    if (!job) break;
    let result: RiskResult;
    try {
      result = await input.assess(job.report_id);
    } catch {
      result = { risk: "unknown", reasons: [], model: "unavailable", outcome: "provider_error" };
    }
    if (!await input.finish(job, result)) {
      deferred += 1;
      break;
    }
    if (result.outcome === "assessed") completed += 1;
    else deferred += 1;
    if (["quota", "disabled", "provider_error", "timeout"].includes(result.outcome)) break;
  }
  return { completed, deferred };
}
