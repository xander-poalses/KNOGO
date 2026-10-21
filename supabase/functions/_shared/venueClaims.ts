// Types
export type VenueDelivery = {
  send: (input: { phone: string; channel: "sms" | "voice" }) => Promise<{ reference: string }>;
  verify: (input: { phone: string; reference: string; code: string }) => Promise<boolean>;
};

type Dependencies = {
  origins: string[];
  authenticate: (token: string) => Promise<{ id: string; is_anonymous?: boolean } | null>;
  rpc: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  delivery: VenueDelivery | null;
};

// State and Helpers
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const phone = /^\+[1-9]\d{7,14}$/;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));

// Functions
async function providerCall<T>(action: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([action(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("delivery_timeout")), 10_000);
    })]);
  } finally {
    clearTimeout(timer);
  }
}

async function readBody(req: Request): Promise<unknown> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("invalid");
  let size = 0;
  let text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 4096) { await reader.cancel(); throw new Error("too_large"); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } finally {
    reader.releaseLock();
  }
}

export function createVenueClaimHandler(deps: Dependencies) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get("origin") ?? "";
    const reply = (body: unknown, status: number) => new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json", "Cache-Control": "no-store", Vary: "Origin",
        ...(origin && deps.origins.includes(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
        "Access-Control-Allow-Headers": "authorization,apikey,content-type",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
      }
    });
    if (origin && !deps.origins.includes(origin)) return reply({ error: "Origin not allowed." }, 403);
    if (req.method === "OPTIONS") return reply({}, 200);
    if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);
    const token = req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) return reply({ error: "Sign in before claiming a venue." }, 401);
    let user: Awaited<ReturnType<Dependencies["authenticate"]>>;
    try { user = await deps.authenticate(token); }
    catch { return reply({ error: "Account check unavailable. Try again later." }, 503); }
    if (!user || !uuid.test(user.id) || user.is_anonymous) return reply({ error: "Sign in before claiming a venue." }, 401);
    let body: unknown;
    try { body = await readBody(req); }
    catch (cause) { return reply({ error: "Invalid request." }, cause instanceof Error && cause.message === "too_large" ? 413 : 400); }
    if (!record(body)) return reply({ error: "Invalid request." }, 400);
    const start = body.action === "start";
    const verify = body.action === "verify";
    const keys = start ? ["action", "placeId", "channel"] : ["action", "challengeId", "code"];
    if ((!start && !verify) || Object.keys(body).some((key) => !keys.includes(key)) ||
      (start && (typeof body.placeId !== "string" || !/^[a-z0-9][a-z0-9_-]{0,199}$/.test(body.placeId) || !["sms", "voice"].includes(String(body.channel)))) ||
      (verify && (typeof body.challengeId !== "string" || !uuid.test(body.challengeId) || typeof body.code !== "string" || !/^\d{6}$/.test(body.code)))) {
      return reply({ error: "Invalid request." }, 400);
    }
    const delivery = deps.delivery;
    if (!delivery) return reply({ error: "Venue phone verification is not configured. Community reports remain available." }, 503);
    try {
      if (start) {
        const challenge = await deps.rpc("start_venue_claim", { p_place_id: body.placeId, p_user_id: user.id, p_channel: body.channel });
        if (!record(challenge) || typeof challenge.challengeId !== "string" || !uuid.test(challenge.challengeId) || typeof challenge.phone !== "string" || !phone.test(challenge.phone)) throw new Error("invalid_server_result");
        let reference: string;
        try {
          const sent = await providerCall(() => delivery.send({ phone: challenge.phone as string, channel: body.channel as "sms" | "voice" }));
          if (typeof sent.reference !== "string" || !sent.reference.trim() || sent.reference.length > 200) throw new Error("invalid_delivery_result");
          reference = sent.reference;
        } catch {
          await deps.rpc("attach_venue_claim_delivery", { p_challenge_id: challenge.challengeId, p_user_id: user.id, p_reference: null });
          return reply({ error: "Could not send a venue code. Delivery requests still count towards the limit." }, 503);
        }
        const attached = await deps.rpc("attach_venue_claim_delivery", { p_challenge_id: challenge.challengeId, p_user_id: user.id, p_reference: reference });
        if (attached !== true) throw new Error("delivery_not_attached");
        return reply({ challengeId: challenge.challengeId, phoneHint: `Ending ${challenge.phone.slice(-4)}`, notice: "Codes expire ten minutes after the request is reserved." }, 200);
      }
      const attempt = await deps.rpc("begin_venue_claim_verification", { p_challenge_id: body.challengeId, p_user_id: user.id });
      if (!record(attempt) || typeof attempt.attemptId !== "string" || !uuid.test(attempt.attemptId) || typeof attempt.phone !== "string" || !phone.test(attempt.phone) || typeof attempt.reference !== "string" || !attempt.reference || attempt.reference.length > 200) throw new Error("invalid_server_result");
      let approved = false;
      let failed = false;
      try {
        approved = (await providerCall(() => delivery.verify({ phone: attempt.phone as string, reference: attempt.reference as string, code: body.code as string }))) === true;
      } catch { failed = true; }
      const verified = await deps.rpc("finish_venue_claim_verification", { p_challenge_id: body.challengeId, p_user_id: user.id, p_attempt_id: attempt.attemptId, p_verified: approved });
      if (failed) return reply({ error: "Code check unavailable. No access has been granted." }, 503);
      if (!approved || verified !== true) return reply({ error: "Code not accepted or verification expired. No access has been granted." }, 400);
      return reply({ verified: true, notice: "Phone access verified. This does not prove legal ownership." }, 200);
    } catch {
      return reply({ error: "Venue verification unavailable. The code may have expired or a request limit may apply." }, 503);
    }
  };
}
