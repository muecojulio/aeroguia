const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/** Parse a plain decimal coordinate and reject coercions such as Infinity or 0x10. */
export function parseCoordinate(value, min, max) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || text.length > 24 || !DECIMAL.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export function readCoordinate(params, name, min, max) {
  return parseCoordinate(params.get(name), min, max);
}

/** Accept browser JSON requests only from this app's own origin when Origin is present. */
export function isSameOriginRequest(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const expected = new Set([new URL(request.url).origin]);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProto || new URL(request.url).protocol.slice(0, -1);
    if (host && (protocol === "http" || protocol === "https")) {
      expected.add(new URL(`${protocol}://${host}`).origin);
    }
    return expected.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export async function readJsonBody(request, maxBytes = 2048) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) return null;

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return null;

  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) return null;
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export function privateJson(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store" }
  });
}
