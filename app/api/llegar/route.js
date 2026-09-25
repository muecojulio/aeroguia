import { cacheGet, cacheSet, cacheKey } from "../../../lib/cache";

const MODES = [
  { id: "driving", osrm: "driving", label: "En carro" },
  { id: "foot", osrm: "foot", label: "A pie" }
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fromLat = searchParams.get("fromLat");
  const fromLon = searchParams.get("fromLon");
  const toLat = searchParams.get("toLat");
  const toLon = searchParams.get("toLon");
  const destName = searchParams.get("dest") || "el destino";

  if (!fromLat || !fromLon || !toLat || !toLon) {
    return Response.json({ error: "Faltan puntos" }, { status: 400 });
  }

  const key = cacheKey(["llegar", fromLat, fromLon, toLat, toLon]);
  const hit = cacheGet(key);
  if (hit) {
    return Response.json(hit, { headers: { "Cache-Control": "public, max-age=120" } });
  }

  const modes = {};
  for (const mode of MODES) {
    modes[mode.id] = await fetchOsrm(mode.osrm, fromLon, fromLat, toLon, toLat);
  }

  const driving = modes.driving;
  const foot = modes.foot;
  const payload = {
    destName,
    driving,
    foot,
    howTo: howToCopy(destName, driving, foot)
  };
  cacheSet(key, payload, 3 * 60 * 1000);
  return Response.json(payload, { headers: { "Cache-Control": "public, max-age=120" } });
}

async function fetchOsrm(profile, fromLon, fromLat, toLon, toLat) {
  const url =
    `https://router.project-osrm.org/route/v1/${profile}/` +
    `${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=true`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AeroGuia/1.1" },
      next: { revalidate: 120 }
    });
    if (!res.ok) return { error: "El calculador de rutas no respondió" };
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return { error: "No hay una ruta viable" };
    const steps = [];
    for (const leg of route.legs || []) {
      for (const step of leg.steps || []) {
        steps.push({
          instruction: humanStep(step.maneuver?.type, step.maneuver?.modifier, step.name || "el camino"),
          distance: Math.round(step.distance),
          duration: Math.round(step.duration)
        });
      }
    }
    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      steps
    };
  } catch {
    return { error: "Error de red al calcular la ruta" };
  }
}

function howToCopy(dest, driving, foot) {
  const lines = [];
  if (foot && !foot.error) {
    lines.push(
      `A pie: ${formatKm(foot.distance)} · ${formatMin(foot.duration)}. ` +
        `Útil dentro de la terminal o si estás en el predio del aeropuerto.`
    );
  }
  if (driving && !driving.error) {
    lines.push(
      `En carro: ${formatKm(driving.distance)} · ${formatMin(driving.duration)}. ` +
        `Sigue la señalización hacia ${dest}, accesos de terminal y zonas de drop-off.`
    );
  }
  if (!lines.length) {
    return ["No pude calcular cómo llegar ahora. Revisa el punto de partida e inténtalo de nuevo."];
  }
  lines.push("El GPS dentro de edificios pierde precisión; combina estas indicaciones con la señalética del aeropuerto.");
  return lines;
}

function formatKm(m) {
  if (!Number.isFinite(m)) return "—";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatMin(s) {
  if (!Number.isFinite(s)) return "—";
  const min = Math.max(1, Math.round(s / 60));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
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
