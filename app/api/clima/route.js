import { cacheGet, cacheSet, cacheKey } from "../../../lib/cache";
import { readCoordinate } from "../../../lib/requestValidation";

const CACHE_HEADERS = { "Cache-Control": "public, max-age=300" };

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = readCoordinate(searchParams, "lat", -90, 90);
  const lon = readCoordinate(searchParams, "lon", -180, 180);
  if (lat == null || lon == null) {
    return Response.json({ error: "Coordenadas inválidas" }, { status: 400 });
  }

  // Coordinates are rounded to keep equivalent lookups in the same cache entry.
  const roundedLat = Number(lat.toFixed(3));
  const roundedLon = Number(lon.toFixed(3));
  const key = cacheKey(["clima", roundedLat, roundedLon]);
  const hit = cacheGet(key);
  if (hit) return Response.json(hit, { headers: CACHE_HEADERS });

  const params = new URLSearchParams({
    latitude: String(roundedLat),
    longitude: String(roundedLon),
    current: "temperature_2m,weather_code,wind_speed_10m,precipitation,relative_humidity_2m",
    timezone: "auto"
  });

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      headers: { "User-Agent": "AeroGuia/1.1", Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 600 }
    });
    if (!res.ok) {
      return Response.json({ error: "Clima no disponible ahora" }, { status: 502 });
    }

    const data = await res.json();
    const current = data?.current;
    const temp = Number(current?.temperature_2m);
    const wind = Number(current?.wind_speed_10m);
    const code = Number(current?.weather_code);
    const rain = Number(current?.precipitation);
    const humidity = Number(current?.relative_humidity_2m);
    if (![temp, wind, code, rain, humidity].every(Number.isFinite)) {
      return Response.json({ error: "Respuesta de clima inválida" }, { status: 502 });
    }

    const payload = {
      temp: Math.round(temp),
      wind: Math.round(wind),
      rain,
      humidity,
      code,
      label: weatherLabel(code),
      emoji: weatherEmoji(code)
    };
    cacheSet(key, payload, 10 * 60 * 1000);
    return Response.json(payload, { headers: CACHE_HEADERS });
  } catch {
    return Response.json({ error: "No se pudo consultar el clima" }, { status: 502 });
  }
}

function weatherLabel(code) {
  if (code === 0) return "Despejado";
  if (code === 1) return "Mayormente despejado";
  if (code === 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if (code === 45 || code === 48) return "Niebla";
  if (code >= 51 && code <= 57) return "Llovizna";
  if (code >= 61 && code <= 67) return "Lluvia";
  if (code >= 71 && code <= 77) return "Nieve";
  if (code >= 80 && code <= 82) return "Chubascos";
  if (code === 85 || code === 86) return "Chubascos de nieve";
  if (code === 95) return "Tormenta";
  if (code === 96 || code === 99) return "Tormenta con granizo";
  return "Cielo variable";
}

function weatherEmoji(code) {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 85) return "⛈️";
  return "🌤️";
}
