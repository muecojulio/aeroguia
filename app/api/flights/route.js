import { readCoordinate } from "../../../lib/requestValidation";

const MAX_BOX_SPAN = 5;
const RESPONSE_HEADERS = { "Cache-Control": "public, max-age=15" };

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lamin = readCoordinate(searchParams, "lamin", -90, 90);
  const lomin = readCoordinate(searchParams, "lomin", -180, 180);
  const lamax = readCoordinate(searchParams, "lamax", -90, 90);
  const lomax = readCoordinate(searchParams, "lomax", -180, 180);

  if (
    lamin == null || lomin == null || lamax == null || lomax == null ||
    lamax <= lamin || lomax <= lomin ||
    lamax - lamin > MAX_BOX_SPAN || lomax - lomin > MAX_BOX_SPAN
  ) {
    return Response.json({ error: "El área solicitada no es válida" }, { status: 400 });
  }

  const params = new URLSearchParams({ lamin: String(lamin), lomin: String(lomin), lamax: String(lamax), lomax: String(lomax) });
  try {
    const res = await fetch(`https://opensky-network.org/api/states/all?${params}`, {
      headers: { "User-Agent": "AeroGuia/1.1 (personal airport companion)", Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 20 }
    });

    if (!res.ok) {
      return Response.json(
        { flights: [], warning: "OpenSky está ocupado o alcanzó su límite. Prueba en un minuto." },
        { headers: RESPONSE_HEADERS }
      );
    }

    const data = await res.json();
    const states = Array.isArray(data?.states) ? data.states : [];
    const flights = states
      .filter(Array.isArray)
      .map((state) => ({
        icao24: cleanText(state[0], 12),
        callsign: cleanText(state[1], 16),
        country: cleanText(state[2], 80),
        lon: finiteNumber(state[5], -180, 180),
        lat: finiteNumber(state[6], -90, 90),
        altitude: finiteNumber(state[7]),
        onGround: state[8] === true,
        velocity: finiteNumber(state[9], 0),
        heading: finiteNumber(state[10], 0, 360)
      }))
      .filter((flight) => flight.lat != null && flight.lon != null)
      .slice(0, 100);

    return Response.json({ time: finiteNumber(data?.time), flights }, { headers: RESPONSE_HEADERS });
  } catch {
    return Response.json(
      { flights: [], warning: "No se pudo contactar OpenSky ahora." },
      { headers: RESPONSE_HEADERS }
    );
  }
}

function finiteNumber(value, min = -Infinity, max = Infinity) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function cleanText(value, maxLength) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}
