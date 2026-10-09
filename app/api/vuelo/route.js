import { isSameOriginRequest, privateJson, readJsonBody } from "../../../lib/requestValidation";

export async function POST(request) {
  if (!isSameOriginRequest(request)) return privateJson({ error: "Solicitud no permitida" }, 403);

  const body = await readJsonBody(request);
  const q = String(body?.q || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  if (!q) return privateJson({ error: "Escribe un número de vuelo" }, 400);

  const key = process.env.AVIATIONSTACK_KEY;
  if (!key) return privateJson({ demo: true, flight: demoFlight(q) });

  const params = new URLSearchParams({ access_key: key, flight_iata: q });
  try {
    const res = await fetch(`https://api.aviationstack.com/v1/flights?${params}`, {
      headers: { Accept: "application/json", "User-Agent": "AeroGuia/1.1" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store"
    });
    if (!res.ok) return privateJson({ error: "El servicio de vuelos no respondió" }, 502);

    const data = await res.json();
    const row = Array.isArray(data?.data) ? data.data[0] : null;
    if (!row) {
      return privateJson({
        demo: false,
        empty: true,
        message: "No encontré ese vuelo ahora. Revisa el código (ej. AA100, NH203)."
      });
    }

    return privateJson({
      demo: false,
      flight: {
        iata: cleanText(row.flight?.iata, 10) || q,
        airline: cleanText(row.airline?.name, 100),
        status: cleanText(row.flight_status, 40),
        departure: airportInfo(row.departure),
        arrival: airportInfo(row.arrival)
      }
    });
  } catch {
    return privateJson({ error: "No se pudo consultar el vuelo" }, 502);
  }
}

function airportInfo(value) {
  const delay = Number(value?.delay);
  return {
    airport: cleanText(value?.airport, 120),
    iata: cleanText(value?.iata, 4),
    gate: cleanText(value?.gate, 20),
    terminal: cleanText(value?.terminal, 20),
    delay: Number.isFinite(delay) ? delay : null,
    scheduled: cleanText(value?.scheduled, 40),
    estimated: cleanText(value?.estimated, 40)
  };
}

function cleanText(value, maxLength) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

function demoFlight(q) {
  return {
    iata: q,
    airline: "Demostración AeroGuía",
    status: "active",
    departure: {
      airport: "Aeropuerto de origen",
      iata: "NRT",
      gate: "104",
      terminal: "1",
      delay: 12,
      scheduled: new Date(Date.now() - 3600000).toISOString(),
      estimated: new Date(Date.now() - 2800000).toISOString()
    },
    arrival: {
      airport: "Aeropuerto de destino",
      iata: "LAX",
      gate: "134",
      terminal: "B",
      delay: 8,
      scheduled: new Date(Date.now() + 7200000).toISOString(),
      estimated: new Date(Date.now() + 7600000).toISOString()
    }
  };
}
