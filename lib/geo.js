export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function nearestAirports(lat, lon, airports, limit = 8) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Array.isArray(airports)) {
    return [];
  }
  return airports
    .filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lon) && a.iata)
    .map((a) => ({
      iata: a.iata,
      icao: a.icao,
      name: a.name,
      city: a.city,
      country: a.country,
      lat: a.lat,
      lon: a.lon,
      type: a.type,
      km: haversineKm(lat, lon, a.lat, a.lon)
    }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

export function formatKm(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
