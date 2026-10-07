export default function PrivacyContent() {
  return (
    <>
      <p className="kicker">AeroGuía</p>
      <h1>Política de privacidad</h1>
      <p className="muted">Última actualización: 25 de septiembre de 2026. Documento informativo; no es asesoría legal.</p>
      <h2>Qué es esta app</h2>
      <p>AeroGuía es una guía de aeropuertos que funciona en el navegador. No crea cuentas ni pide correo.</p>
      <h2>Datos que se usan en el dispositivo</h2>
      <ul>
        <li>Ubicación GPS, solo si pulsas «Partida con GPS». El permiso lo concede el navegador.</li>
        <li>Un punto que marques tú en el mapa.</li>
        <li>Búsquedas de aeropuerto y número de vuelo que escribes.</li>
      </ul>
      <p>No guardamos esos datos en una base de datos propia ni los vendemos.</p>
      <h2>Servicios de terceros</h2>
      <ul>
        <li>OpenStreetMap y Leaflet</li>
        <li>Nominatim (OSM)</li>
        <li>OSRM público</li>
        <li>Open-Meteo</li>
        <li>OpenSky Network</li>
        <li>Aviationstack solo si hay key</li>
      </ul>
    </>
  );
}
