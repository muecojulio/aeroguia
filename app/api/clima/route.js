import { cacheGet, cacheSet, cacheKey } from "../../../lib/cache";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  if (!lat || !lon) {
    return Response.json({ error: "Faltan coordenadas" }, { status: 400 });
  }

  const key = cacheKey(["clima", lat, lon]);
  const hit = cacheGet(key);
  if (hit) {
    return Response.json(hit, { headers: { "Cache-Control": "public, max-age=300" } });
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&current=temperature_2m,weather_code,wind_speed_10m,precipitation,relative_humidity_2m` +
    `&timezone=auto`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AeroGuia/1.1" },
      next: { revalidate: 600 }
    });
    if (!res.ok) {
      return Response.json({ error: "Clima no disponible ahora" }, { status: 502 });
    }
    const data = await res.json();
    const c = data.current || {};
    const code = Number(c.weather_code);
    const payload = {
      temp: Math.round(c.temperature_2m),
      wind: Math.round(c.wind_speed_10m),
      rain: c.precipitation || 0,
      humidity: c.relative_humidity_2m,
      code,
      label: weatherLabel(code),
      emoji: weatherEmoji(code)
    };
    cacheSet(key, payload, 10 * 60 * 1000);
    return Response.json(payload, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json({ error: "No se pudo leer el clima" }, { status: 500 });
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
