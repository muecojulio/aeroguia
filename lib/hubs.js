const CATEGORIES = {
  terminal: { label: "Terminal", emoji: "🏢", color: "#1d4ed8" },
  gate: { label: "Puertas", emoji: "🛂", color: "#0f766e" },
  security: { label: "Seguridad", emoji: "🛡️", color: "#b45309" },
  shop: { label: "Tiendas", emoji: "🛍️", color: "#7c3aed" },
  food: { label: "Comida", emoji: "🍽️", color: "#c2410c" },
  service: { label: "Servicios", emoji: "ℹ️", color: "#0369a1" },
  transport: { label: "Transporte", emoji: "🚆", color: "#334155" },
  lounge: { label: "Sala VIP", emoji: "✨", color: "#a16207" }
};

const DETAILED = new Set([
  "HND", "NRT", "KIX", "NGO", "FUK", "CTS", "OKA",
  "JFK", "LAX", "ORD", "MIA", "DFW", "ATL", "SFO", "SEA",
  "MEX", "CUN", "GDL", "MTY", "NLU", "MAD"
]);

export function poisForAirport(airport) {
  const lat = airport.lat;
  const lon = airport.lon;
  return [
    { id: "term", name: `${airport.iata} Terminal`, category: "terminal", lat, lon, label: "Terminal", emoji: "🏢", color: "#1d4ed8" },
    { id: "info", name: "Información / mostradores", category: "service", lat: lat + 0.002, lon: lon + 0.003, label: "Servicios", emoji: "ℹ️", color: "#0369a1" },
    { id: "food", name: "Zona de restaurantes", category: "food", lat: lat + 0.0015, lon: lon - 0.002, label: "Comida", emoji: "🍽️", color: "#c2410c" },
    { id: "park", name: "Acceso y transporte", category: "transport", lat: lat - 0.003, lon, label: "Transporte", emoji: "🚆", color: "#334155" },
    { id: "sec", name: "Control de seguridad", category: "security", lat: lat + 0.001, lon: lon + 0.001, label: "Seguridad", emoji: "🛡️", color: "#b45309" }
  ];
}

export function categoryMeta() {
  return CATEGORIES;
}

export function isDetailedHub(iata) {
  return DETAILED.has(iata);
}
