import twilio from "twilio";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendWhatsApp } from "@/lib/channels/twilio";

vi.mock("@/lib/jobs/queue", () => ({
  enqueueJob: vi.fn(async () => "job-1"),
  processJob: vi.fn(async () => {}),
  sweep: vi.fn(async () => 0),
}));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));

afterEach(() => vi.unstubAllEnvs());

describe("sendWhatsApp", () => {
  it("sends audio, waits ~3.1 s, then the text — one message at a time", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC123");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tok");
    vi.stubEnv("TWILIO_WHATSAPP_FROM", "whatsapp:+17372508034");
    const bodies: URLSearchParams[] = [];
    const sleeps: number[] = [];
    const fake = (async (_url: string, init: RequestInit) => (
      bodies.push(init.body as URLSearchParams),
      new Response("{}", { status: 201 })
    )) as unknown as typeof fetch;
    await sendWhatsApp("whatsapp:+910000000000", [{ mediaUrl: "https://a/x.mp3" }, { body: "Ravi: 35" }], {
      fetch: fake,
      sleep: async (ms) => void sleeps.push(ms),
    });
    expect(bodies.map((b) => [b.get("MediaUrl"), b.get("Body")])).toEqual([
      ["https://a/x.mp3", null],
      [null, "Ravi: 35"],
    ]);
    expect(bodies[0]!.get("From")).toBe("whatsapp:+17372508034");
    expect(sleeps).toEqual([3100]);
  });
});

describe("POST /api/whatsapp/webhook", () => {
  const url = "https://app.test/api/whatsapp/webhook";
  const params = { From: "whatsapp:+910000000000", Body: "hi", MessageSid: "SM1234567890" };
  const req = (sig: string) =>
    new Request(url, { method: "POST", headers: { "x-twilio-signature": sig }, body: new URLSearchParams(params) });

  it("answers TwiML for a correctly signed message and refuses a forged one", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tok");
    vi.stubEnv("PUBLIC_BASE_URL", "https://app.test");
    const { POST } = await import("@/app/api/whatsapp/webhook/route");
    const good = await POST(req(twilio.getExpectedTwilioSignature("tok", url, params)));
    expect(good.status).toBe(200);
    expect(await good.text()).toBe("<Response></Response>");
    const { enqueueJob } = await import("@/lib/jobs/queue");
    expect(enqueueJob).toHaveBeenCalledWith("wa_inbound", expect.objectContaining({ MessageSid: "SM1234567890" }), {
      dedupeKey: "SM1234567890",
    });
    expect((await POST(req("forged"))).status).toBe(403);
  });
});

describe("GET /api/cron/sweep", () => {
  it("needs the right key", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-s3cret");
    const { GET } = await import("@/app/api/cron/sweep/route");
    expect((await GET(new Request("https://a/api/cron/sweep?key=wrong"))).status).toBe(403);
    const ok = await GET(new Request("https://a/api/cron/sweep?key=s3cret-s3cret"));
    expect(await ok.text()).toBe("ok");
  });
});
