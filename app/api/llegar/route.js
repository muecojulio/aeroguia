import { cacheGet, cacheSet, cacheKey } from "../../../lib/cache";
import { isSameOriginRequest, parseCoordinate, privateJson, readJsonBody } from "../../../lib/requestValidation";

const MODES = [
  { id: "driving", osrm: "driving" },
  { id: "foot", osrm: "foot" }
];
const MAX_ROUTE_BYTES = 3 * 1024 * 1024;
const MAX_STEPS = 300;

export async function POST(request) {
  if (!isSameOriginRequest(request)) return privateJson({ error: "Solicitud no permitida" }, 403);

  const body = await readJsonBody(request);
  const fromLat = parseCoordinate(body?.fromLat, -90, 90);
  const fromLon = parseCoordinate(body?.fromLon, -180, 180);
  const toLat = parseCoordinate(body?.toLat, -90, 90);
  const toLon = parseCoordinate(body?.toLon, -180, 180);
  if ([fromLat, fromLon, toLat, toLon].some((value) => value == null)) {
    return privateJson({ error: "Los puntos de la ruta no son válidos" }, 400);
  }

  const destName = cleanText(body?.dest, 80) || "el destino";
  const key = cacheKey(["llegar", fromLat, fromLon, toLat, toLon, destName]);
  const hit = cacheGet(key);
  if (hit) return privateJson(hit);

  const results = await Promise.all(
    MODES.map((mode) => fetchOsrm(mode.osrm, fromLon, fromLat, toLon, toLat))
  );
  const modes = Object.fromEntries(MODES.map((mode, index) => [mode.id, results[index]]));
  const payload = {
    destName,
    driving: modes.driving,
    foot: modes.foot,
    howTo: howToCopy(destName, modes.driving, modes.foot)
  };
  cacheSet(key, payload, 3 * 60 * 1000);
  return privateJson(payload);
}

async function fetchOsrm(profile, fromLon, fromLat, toLon, toLat) {
  const coordinates = [fromLon, fromLat, toLon, toLat].map((value) => Number(value.toFixed(6)));
  const [safeFromLon, safeFromLat, safeToLon, safeToLat] = coordinates;
  const params = new URLSearchParams({ overview: "full", geometries: "geojson", steps: "true" });
  const url = `https://router.project-osrm.org/route/v1/${profile}/${safeFromLon},${safeFromLat};${safeToLon},${safeToLat}?${params}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AeroGuia/1.1", Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store"
    });
    if (!res.ok) return { error: "El calculador de rutas no respondió" };

    const contentLength = Number(res.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_ROUTE_BYTES) {
      return { error: "La ruta recibida es demasiado grande" };
    }
    const text = await res.text();
    if (new TextEncoder().encode(text).byteLength > MAX_ROUTE_BYTES) {
      return { error: "La ruta recibida es demasiado grande" };
    }
    const data = JSON.parse(text);
    const route = data?.routes?.[0];
    if (!route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) {
      return { error: "No hay una ruta viable" };
    }

    const geometry = validGeometry(route.geometry);
    if (!geometry) return { error: "La geometría de la ruta no es válida" };

    const steps = [];
    for (const leg of Array.isArray(route.legs) ? route.legs : []) {
      for (const step of Array.isArray(leg.steps) ? leg.steps : []) {
        if (steps.length >= MAX_STEPS) break;
        const distance = Number(step.distance);
        const duration = Number(step.duration);
        if (!Number.isFinite(distance) || !Number.isFinite(duration)) continue;
        const name = cleanText(step.name, 100) || "el camino";
        steps.push({
          instruction: humanStep(step.maneuver?.type, step.maneuver?.modifier, name),
          distance: Math.round(distance),
          duration: Math.round(duration)
        });
      }
      if (steps.length >= MAX_STEPS) break;
    }

    return {
      distance: route.distance,
      duration: route.duration,
      geometry,
      steps
    };
  } catch {
    return { error: "No se pudo calcular esta ruta ahora" };
  }
}

function validGeometry(geometry) {
  if (geometry?.type !== "LineString" || !Array.isArray(geometry.coordinates)) return null;
  if (geometry.coordinates.length < 2 || geometry.coordinates.length > 20000) return null;
  const coordinates = [];
  for (const pair of geometry.coordinates) {
    if (!Array.isArray(pair) || pair.length < 2) return null;
    const lon = Number(pair[0]);
    const lat = Number(pair[1]);
    if (!Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isFinite(lat) || lat < -90 || lat > 90) return null;
    coordinates.push([lon, lat]);
  }
  return { type: "LineString", coordinates };
}

function howToCopy(dest, driving, foot) {
  const lines = [];
  if (foot && !foot.error) {
    lines.push(
      `A pie: ${formatKm(foot.distance)} · ${formatMin(foot.duration)}. ` +
        "Útil dentro de la terminal o si estás en el predio del aeropuerto."
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

function formatKm(meters) {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatMin(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
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
  if (["turn", "end of road", "fork", "new name"].includes(type)) {
    return `${turn[modifier] || "continúa"} por ${name}`;
  }
  if (type === "merge") return `Incorpórate hacia ${name}`;
  return `Continúa por ${name}`;
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
