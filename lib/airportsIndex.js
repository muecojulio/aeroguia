/**
 * Indices en memoria sobre airports.json.
 * No hay motor SQL.
 * CREATE INDEX idx_airports_iata ON airports (iata);
 * CREATE INDEX idx_airports_icao ON airports (icao);
 * CREATE INDEX idx_airports_country ON airports (country);
 * CREATE INDEX idx_airports_country_type ON airports (country, type);
 */
let built = null;

export function buildAirportIndex(list) {
  const byIata = new Map();
  const byIcao = new Map();
  const byCountry = new Map();
  for (const a of list || []) {
    if (a.iata) byIata.set(String(a.iata).toUpperCase(), a);
    if (a.icao) byIcao.set(String(a.icao).toUpperCase(), a);
    const cc = a.country || "XX";
    if (!byCountry.has(cc)) byCountry.set(cc, []);
    byCountry.get(cc).push(a);
  }
  built = { byIata, byIcao, byCountry, all: list || [], size: (list || []).length };
  return built;
}

export function getAirportIndex() {
  return built;
}

export function airportsByCountry(code) {
  if (!built) return [];
  if (!code || code === "ALL") return built.all;
  return built.byCountry.get(code) || [];
}

export function findAirport(code) {
  if (!built || !code) return null;
  const k = String(code).toUpperCase();
  return built.byIata.get(k) || built.byIcao.get(k) || null;
}
