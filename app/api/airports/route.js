import { cacheGet, cacheSet } from "../../../lib/cache";

export async function GET() {
  const hit = cacheGet("airports-public");
  if (hit) {
    return Response.json(hit, { headers: { "Cache-Control": "public, max-age=86400" } });
  }

  const sources = [
    "https://raw.githubusercontent.com/mwgg/Airports/master/airports.json"
  ];

  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "AeroGuia/1.1" },
        next: { revalidate: 86400 }
      });
      if (!res.ok) continue;
      const raw = await res.json();
      const list = normalize(raw);
      if (list.length) {
        cacheSet("airports-public", list, 24 * 60 * 60 * 1000);
        return Response.json(list, { headers: { "Cache-Control": "public, max-age=86400" } });
      }
    } catch {
      /* try next */
    }
  }

  return Response.json([], { status: 200 });
}

function normalize(raw) {
  const rows = Array.isArray(raw) ? raw : Object.values(raw || {});
  const out = [];
  for (const a of rows) {
    const iata = String(a.iata || a.IATA || a.code || "").toUpperCase();
    if (!iata || iata.length !== 3) continue;
    const lat = Number(a.lat || a.latitude || a.latDeg);
    const lon = Number(a.lon || a.lng || a.longitude || a.lonDeg);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const iso = String(a.iso || a.country || a.country_code || "").toUpperCase().slice(0, 2);
    const size = String(a.size || a.type || "").toLowerCase();
    const type = size.includes("large") ? "large" : "medium";
    out.push({
      iata,
      icao: String(a.icao || a.ICAO || "").toUpperCase(),
      name: a.name || iata,
      city: a.city || a.municipality || "",
      country: iso,
      lat,
      lon,
      type
    });
  }
  return out;
}
