export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lamin = searchParams.get("lamin");
  const lomin = searchParams.get("lomin");
  const lamax = searchParams.get("lamax");
  const lomax = searchParams.get("lomax");

  if (!lamin || !lomin || !lamax || !lomax) {
    return Response.json({ error: "Faltan coordenadas" }, { status: 400 });
  }

  const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AeroGuia/1.1 (personal airport companion)" },
      next: { revalidate: 20 }
    });

    if (!res.ok) {
      return Response.json(
        { flights: [], warning: "OpenSky ocupado o con límite. Prueba en un minuto." },
        { status: 200 }
      );
    }

    const data = await res.json();
    const states = Array.isArray(data.states) ? data.states : [];
    const flights = states
      .map((s) => ({
        icao24: s[0],
        callsign: (s[1] || "").trim(),
        country: s[2],
        lon: s[5],
        lat: s[6],
        altitude: s[7],
        onGround: s[8],
        velocity: s[9],
        heading: s[10]
      }))
      .filter((f) => f.lat && f.lon);

    return Response.json({ time: data.time, flights });
  } catch {
    return Response.json(
      { flights: [], warning: "No se pudo contactar OpenSky ahora." },
      { status: 200 }
    );
  }
}
