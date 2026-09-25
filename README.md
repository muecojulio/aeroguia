# AeroGuía

App web para aeropuertos de México, Estados Unidos, Japón y otros hubs: mapa, servicios, aviones cerca y cómo llegar a pie o en carro.

Requiere **Node.js 24.x** (`engines` en `package.json`).

## Qué usa

Sin key (siguen activas):

- Mapas: [Leaflet](https://github.com/Leaflet/Leaflet) + teselas de OpenStreetMap
- Lista de aeropuertos: datos OurAirports de dominio público (`public/data/airports.json`)
- Nombre del punto marcado: Nominatim OSM
- Aviones en vivo: OpenSky Network
- Rutas a pie y en carro: OSRM público ([Project-OSRM/osrm-backend](https://github.com/Project-OSRM/osrm-backend))
- Clima: Open-Meteo

Con key opcional (no se quitó):

- Aviationstack para la ficha de un vuelo concreto (`AVIATIONSTACK_KEY`)

## Índices

No hay base SQL. `lib/airportsIndex.js` arma mapas en memoria por IATA, ICAO y país. Si el dataset pasa a Postgres/SQLite, los índices equivalentes están documentados en ese archivo.

## Caché

- Memoria en servidor para clima, geocodificación y rutas
- `Cache-Control` en APIs y en `/data`
- Service worker `aeroguia-v4` para estáticos

## Arranque local

```bash
npm install
npm run dev
```

## Vercel

Sube este directorio (o el zip). Framework: Next.js. Node 24.x.

Variable opcional: `AVIATIONSTACK_KEY`.

## Privacidad

Ruta `/privacidad`.
