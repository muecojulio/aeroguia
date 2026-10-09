# AeroGuía

Compañera web para aeropuertos de México, Estados Unidos, Japón y otros hubs: mapa, servicios, aviones cercanos, clima y cómo llegar a pie o en carro. La interfaz es una PWA en español, con búsquedas y permisos de ubicación activados únicamente por la persona usuaria.

Requiere **Node.js 24.x** (`engines` en `package.json`). Usa Next.js 16 y React 19.

## Qué usa

Sin key:

- Mapas: [Leaflet](https://github.com/Leaflet/Leaflet) + teselas de OpenStreetMap
- Aeropuertos: semilla estática `public/data/airports.json` (~950 aeropuertos curados de datos OurAirports) y lista ampliada de `/api/airports`
- Nombres de lugares: Nominatim de OpenStreetMap
- Aviones en vivo: OpenSky Network
- Rutas: OSRM público ([Project-OSRM/osrm-backend](https://github.com/Project-OSRM/osrm-backend))
- Clima: Open-Meteo

Con key opcional:

- Aviationstack para consultar la ficha de un vuelo (`AVIATIONSTACK_KEY`). Sin la key se muestra una ficha de demostración y no se consulta ese proveedor.

## Seguridad y datos

- Las coordenadas se validan y limitan antes de usarse en servicios externos; los puntos GPS y las rutas se envían por POST y reciben `Cache-Control: private, no-store`.
- Los nombres externos se acotan y escapan antes de mostrarse en marcadores y ventanas del mapa.
- Next.js envía una política CSP, restricciones de permisos del navegador y cabeceras de seguridad; las solicitudes a proveedores tienen tiempo límite.
- El service worker `aeroguia-v6` guarda archivos estáticos y la interfaz básica para uso sin conexión, no respuestas de API ni datos GPS o de vuelos.
- Las cachés de servidor son temporales y en memoria. No hay una base SQL, cuentas de usuario, analítica ni almacenamiento local de perfiles.
- Revisa `/privacidad` para conocer los datos que reciben los proveedores externos y los plazos de caché.

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
