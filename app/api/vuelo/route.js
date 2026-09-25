export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  if (!q) {
    return Response.json({ error: "Escribe un número de vuelo" }, { status: 400 });
  }

  const key = process.env.AVIATIONSTACK_KEY;
  if (!key) {
    return Response.json({
      demo: true,
      flight: demoFlight(q)
    });
  }

  const url = `https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(key)}&flight_iata=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    const data = await res.json();
    const row = data?.data?.[0];
    if (!row) {
      return Response.json({
        demo: false,
        empty: true,
        message: "No encontré ese vuelo ahora. Revisa el código (ej. AA100, NH203)."
      });
    }
    return Response.json({
      demo: false,
      flight: {
        iata: row.flight?.iata || q,
        airline: row.airline?.name,
        status: row.flight_status,
        departure: {
          airport: row.departure?.airport,
          iata: row.departure?.iata,
          gate: row.departure?.gate,
          terminal: row.departure?.terminal,
          delay: row.departure?.delay,
          scheduled: row.departure?.scheduled,
          estimated: row.departure?.estimated
        },
        arrival: {
          airport: row.arrival?.airport,
          iata: row.arrival?.iata,
          gate: row.arrival?.gate,
          terminal: row.arrival?.terminal,
          delay: row.arrival?.delay,
          scheduled: row.arrival?.scheduled,
          estimated: row.arrival?.estimated
        }
      }
    });
  } catch {
    return Response.json({ error: "No se pudo consultar el vuelo" }, { status: 500 });
  }
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
