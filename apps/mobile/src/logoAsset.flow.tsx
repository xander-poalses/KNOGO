import { afterEach, describe, expect, it, vi } from "vitest";
import { isJpeg, loadJpegLogo } from "./logoAsset";

afterEach(() => vi.restoreAllMocks());
describe("JPEG logos", () => {
  it("recognises JPEG bytes, not a filename or content-type claim", () => {
    expect(isJpeg(new Uint8Array([255, 216, 255, 224]))).toBe(true);
    expect(isJpeg(new Uint8Array([137, 80, 78, 71]))).toBe(false);
    expect(isJpeg(new Uint8Array())).toBe(false);
  });
  it("keeps the downloaded JPEG bytes without adding a background", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new Uint8Array([255, 216, 255, 224])));
    expect(await loadJpegLogo("https://example.com/logo-one.jpg")).toBe("data:image/jpeg;base64,/9j/4A==");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "omit" });
  });
  it("rejects a PNG returned from a JPEG URL", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new Uint8Array([137, 80, 78, 71])));
    await expect(loadJpegLogo("https://example.com/not-jpeg.jpg")).rejects.toThrow("JPEG");
  });
  it("rejects a failed load and unsupported URL", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    await expect(loadJpegLogo("https://example.com/missing.jpg")).rejects.toThrow("unavailable");
    await expect(loadJpegLogo("data:image/png;base64,AAAA")).rejects.toThrow("not supported");
  });
});
