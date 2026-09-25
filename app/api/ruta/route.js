import { cacheGet, cacheSet, cacheKey } from "../../../lib/cache";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fromLat = searchParams.get("fromLat");
  const fromLon = searchParams.get("fromLon");
  const toLat = searchParams.get("toLat");
  const toLon = searchParams.get("toLon");
  const mode = searchParams.get("mode") === "foot" ? "foot" : "driving";

  if (!fromLat || !fromLon || !toLat || !toLon) {
    return Response.json({ error: "Faltan puntos" }, { status: 400 });
  }

  const key = cacheKey(["ruta", mode, fromLat, fromLon, toLat, toLon]);
  const hit = cacheGet(key);
  if (hit) {
    return Response.json(hit, { headers: { "Cache-Control": "public, max-age=120" } });
  }

  const url = `https://router.project-osrm.org/route/v1/${mode}/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AeroGuia/1.1" },
      next: { revalidate: 120 }
    });
    if (!res.ok) {
      return Response.json({ error: "El calculador de rutas no respondió" }, { status: 502 });
    }
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) {
      return Response.json({ error: "No hay una ruta viable entre esos puntos" }, { status: 404 });
    }

    const steps = [];
    for (const leg of route.legs || []) {
      for (const step of leg.steps || []) {
        const name = step.name || "el camino";
        steps.push({
          instruction: humanStep(step.maneuver?.type, step.maneuver?.modifier, name),
          distance: Math.round(step.distance),
          duration: Math.round(step.duration)
        });
      }
    }

    const payload = {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      mode,
      steps
    };
    cacheSet(key, payload, 3 * 60 * 1000);
    return Response.json(payload, { headers: { "Cache-Control": "public, max-age=120" } });
  } catch {
    return Response.json({ error: "Error de red al calcular la ruta" }, { status: 500 });
  }
}

function humanStep(type, modifier, name) {
  const turn = {
    left: "gira a la izquierda",
    right: "gira a la derecha",
    "slight left": "inclínate a la izquierda",
    "slight right": "inclínate a la derecha",
    "sharp left": "gira cerrado a la izquierda",
    "sharp right": "gira cerrado a la derecha",
    straight: "sigue recto",
    uturn: "da la vuelta"
  };
  if (type === "depart") return `Sal hacia ${name}`;
  if (type === "arrive") return `Has llegado a ${name}`;
  if (type === "roundabout") return `Entra en la rotonda y sal hacia ${name}`;
  if (type === "turn" || type === "end of road" || type === "fork" || type === "new name") {
    return `${turn[modifier] || "continúa"} por ${name}`;
  }
  if (type === "merge") return `Incorpórate hacia ${name}`;
  return `Continúa por ${name}`;
}
