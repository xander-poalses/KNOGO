const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const cache = new Map<string, Promise<string>>();

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
}

function encode(bytes: Uint8Array): string {
  const parts: string[] = [];
  let chunk = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const word = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    chunk += alphabet[word >>> 18] + alphabet[(word >>> 12) & 63] + (i + 1 < bytes.length ? alphabet[(word >>> 6) & 63] : "=") + (i + 2 < bytes.length ? alphabet[word & 63] : "=");
    if (chunk.length >= 8192) { parts.push(chunk); chunk = ""; }
  }
  if (chunk) parts.push(chunk);
  return `data:image/jpeg;base64,${parts.join("")}`;
}

export function loadJpegLogo(uri: string): Promise<string> {
  const existing = cache.get(uri);
  if (existing) return existing;
  const load = async () => {
    const url = new URL(uri);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Logo URL not supported");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(uri, { signal: controller.signal, credentials: "omit" });
      if (!response.ok) throw new Error("Logo unavailable");
      const declared = response.headers.get("content-length");
      if (declared && Number(declared) > 2 * 1024 * 1024) throw new Error("Logo exceeds size limit");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 2 * 1024 * 1024 || !isJpeg(bytes)) throw new Error("Logo must be JPEG");
      return encode(bytes);
    } finally { clearTimeout(timeout); }
  };
  const promise = load().catch(cause => { cache.delete(uri); throw cause; });
  if (cache.size >= 12) cache.delete(cache.keys().next().value!);
  cache.set(uri, promise);
  return promise;
}
