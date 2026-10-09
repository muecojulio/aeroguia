import { cacheGet, cacheSet } from "../../../lib/cache";
import { parseCoordinate } from "../../../lib/requestValidation";

const CACHE_KEY = "airports-public";
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const CACHE_HEADERS = { "Cache-Control": "public, max-age=86400" };

export async function GET() {
  const hit = cacheGet(CACHE_KEY);
  if (hit) return Response.json(hit, { headers: CACHE_HEADERS });

  try {
    const res = await fetch("https://raw.githubusercontent.com/mwgg/Airports/master/airports.json", {
      headers: { "User-Agent": "AeroGuia/1.1", Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 86400 }
    });
    const size = Number(res.headers.get("content-length"));
    if (res.ok && (!Number.isFinite(size) || size <= MAX_SOURCE_BYTES)) {
      const text = await res.text();
      if (new TextEncoder().encode(text).byteLength <= MAX_SOURCE_BYTES) {
        const list = normalize(JSON.parse(text));
        if (list.length) {
          cacheSet(CACHE_KEY, list, 24 * 60 * 60 * 1000);
          return Response.json(list, { headers: CACHE_HEADERS });
        }
      }
    }
  } catch {
    // La lista local del cliente sigue disponible si el proveedor externo falla.
  }

  return Response.json([], { headers: CACHE_HEADERS });
}

function normalize(raw) {
  const rows = Array.isArray(raw) ? raw : Object.values(raw || {});
  const out = [];
  const seen = new Set();

  for (const airport of rows) {
    if (!airport || typeof airport !== "object") continue;

    const iata = cleanText(airport.iata || airport.IATA || airport.code, 3).toUpperCase();
    if (!/^[A-Z0-9]{3}$/.test(iata) || seen.has(iata)) continue;

    const lat = parseCoordinate(airport.lat ?? airport.latitude ?? airport.latDeg, -90, 90);
    const lon = parseCoordinate(airport.lon ?? airport.lng ?? airport.longitude ?? airport.lonDeg, -180, 180);
    if (lat == null || lon == null) continue;

    const rawCountry = cleanText(airport.iso || airport.country || airport.country_code, 2).toUpperCase();
    const rawType = cleanText(airport.size || airport.type, 20).toLowerCase();
    const rawIcao = cleanText(airport.icao || airport.ICAO, 4).toUpperCase();
    seen.add(iata);
    out.push({
      iata,
      icao: /^[A-Z0-9]{3,4}$/.test(rawIcao) ? rawIcao : "",
      name: cleanText(airport.name, 160) || iata,
      city: cleanText(airport.city || airport.municipality, 100),
      country: /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : "XX",
      lat,
      lon,
      type: rawType.includes("large") ? "large" : "medium"
    });
  }
  return out;
}

function cleanText(value, maxLength) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
