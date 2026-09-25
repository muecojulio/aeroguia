import { cacheGet, cacheSet, cacheKey } from "../../../lib/cache";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: "Faltan coordenadas" }, { status: 400 });
  }

  const key = cacheKey(["lugar", lat.toFixed(4), lon.toFixed(4)]);
  const hit = cacheGet(key);
  if (hit) {
    return Response.json(hit, { headers: { "Cache-Control": "public, max-age=300" } });
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "jsonv2",
    zoom: "16",
    addressdetails: "1"
  });
  const url = `https://nominatim.openstreetmap.org/reverse?${params}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AeroGuia/1.1 (airport companion; personal use)",
        Accept: "application/json"
      },
      next: { revalidate: 3600 }
    });
    if (!res.ok) {
      return Response.json({ name: "Punto en el mapa", source: "map" });
    }
    const data = await res.json();
    const addr = data.address || {};
    const name =
      data.name ||
      addr.aerodrome ||
      addr.amenity ||
      addr.road ||
      addr.suburb ||
      addr.city ||
      addr.town ||
      data.display_name?.split(",")[0] ||
      "Punto en el mapa";
    const payload = {
      name,
      display: data.display_name || name,
      source: "nominatim"
    };
    cacheSet(key, payload, 30 * 60 * 1000);
    return Response.json(payload, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json({ name: "Punto en el mapa", source: "map" });
  }
}
