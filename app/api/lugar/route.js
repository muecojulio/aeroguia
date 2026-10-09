import { cacheGet, cacheSet, cacheKey } from "../../../lib/cache";
import { isSameOriginRequest, parseCoordinate, privateJson, readJsonBody } from "../../../lib/requestValidation";

export async function POST(request) {
  if (!isSameOriginRequest(request)) return privateJson({ error: "Solicitud no permitida" }, 403);

  const body = await readJsonBody(request);
  const lat = parseCoordinate(body?.lat, -90, 90);
  const lon = parseCoordinate(body?.lon, -180, 180);
  if (lat == null || lon == null) {
    return privateJson({ error: "Coordenadas inválidas" }, 400);
  }

  const key = cacheKey(["lugar", lat.toFixed(4), lon.toFixed(4)]);
  const hit = cacheGet(key);
  if (hit) return privateJson(hit);

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "jsonv2",
    zoom: "16",
    addressdetails: "1"
  });

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: {
        "User-Agent": "AeroGuia/1.1 (airport companion; personal use)",
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store"
    });
    if (!res.ok) return privateJson({ name: "Punto en el mapa", source: "map" });

    const data = await res.json();
    const address = data?.address || {};
    const name = cleanText(
      data?.name || address.aerodrome || address.amenity || address.road || address.suburb ||
        address.city || address.town || String(data?.display_name || "").split(",")[0] || "Punto en el mapa",
      120
    );
    const payload = {
      name: name || "Punto en el mapa",
      display: cleanText(data?.display_name, 300) || name || "Punto en el mapa",
      source: "nominatim"
    };
    cacheSet(key, payload, 30 * 60 * 1000);
    return privateJson(payload);
  } catch {
    return privateJson({ name: "Punto en el mapa", source: "map" });
  }
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
