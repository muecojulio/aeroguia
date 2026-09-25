"use client";

import Link from "next/link";
import { COUNTRY_FLAG } from "../../lib/countries";
import { isDetailedHub } from "../../lib/hubs";
import { formatKm } from "../../lib/geo";

export function NearbyList({ title, items, onPick }) {
  if (!items?.length) return null;
  return (
    <div className="nearby">
      <p className="kicker">{title}</p>
      <div className="row-scroll">
        {items.map((a) => (
          <button type="button" key={a.iata + a.icao} className="pill airport-pill" onClick={() => onPick(a)}>
            {COUNTRY_FLAG[a.country] || ""} {a.iata} · {formatKm(a.km)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HomeTab({ country, setCountry, results, query, onSelect, airport, installed, installApp, iosTip, weather, counts }) {
  return (
    <>
      <section className="hero">
        <p className="kicker">En el bolsillo</p>
        <h2>Tu aeropuerto, en formato app.</h2>
        <p className="muted">{counts.JP} aeropuertos en Japón, {counts.US} en Estados Unidos y {counts.MX} en México. Elige salida con GPS, tocando el mapa o un aeropuerto cercano.</p>
        {!installed && <div className="btn-row"><button type="button" className="btn primary full" onClick={installApp}>Instalar en este dispositivo</button></div>}
        {installed && <p className="status ok">App instalada. Se abre a pantalla completa.</p>}
        {iosTip && !installed && <p className="status info">iPhone/iPad: toca Compartir y luego «Añadir a pantalla de inicio».</p>}
      </section>
      {airport && <section className="card"><p className="kicker">Tiempo en {airport.iata}</p><WeatherLine weather={weather} /></section>}
      <div className="row-scroll">
        <button type="button" className={`pill ${country === "ALL" ? "active" : ""}`} onClick={() => setCountry("ALL")}>Destacados</button>
        <button type="button" className={`pill ${country === "JP" ? "active" : ""}`} onClick={() => setCountry("JP")}>🇯🇵 Japón ({counts.JP})</button>
        <button type="button" className={`pill ${country === "US" ? "active" : ""}`} onClick={() => setCountry("US")}>🇺🇸 EE. UU. ({counts.US})</button>
        <button type="button" className={`pill ${country === "MX" ? "active" : ""}`} onClick={() => setCountry("MX")}>🇲🇽 México ({counts.MX})</button>
        <button type="button" className={`pill ${country === "ES" ? "active" : ""}`} onClick={() => setCountry("ES")}>🇪🇸 España</button>
      </div>
      {airport && !query && <p className="muted" style={{ marginBottom: 8 }}>Ahora: {airport.iata} · {results.length} aeropuertos en esta lista</p>}
      <div className="grid two">
        {results.map((a) => (
          <button type="button" key={a.iata + a.icao} className="airport-card" onClick={() => onSelect(a)}>
            <div><div className="iata">{a.iata}</div><strong>{a.city || a.name}</strong><p className="muted">{COUNTRY_FLAG[a.country]} {a.name}</p></div>
            {isDetailedHub(a.iata) ? <span className="badge">Detalle</span> : null}
          </button>
        ))}
      </div>
      {!results.length && <div className="empty">No encontré ese aeropuerto.</div>}
      <p className="muted" style={{ marginTop: 16 }}><Link href="/privacidad">Política de privacidad</Link></p>
    </>
  );
}

export function FlightsTab({ airport, flights, flightWarn, flightQuery, setFlightQuery, lookupFlight, flightInfo, loadingFlight, reload }) {
  return (
    <>
      <section className="card">
        <p className="kicker">Tu vuelo</p>
        <h3>Número de vuelo</h3>
        <form className="search" onSubmit={lookupFlight}>
          <input value={flightQuery} onChange={(e) => setFlightQuery(e.target.value.toUpperCase())} placeholder="NH203, AA100…" />
          <button type="submit">{loadingFlight ? "…" : "Ver"}</button>
        </form>
        {flightInfo?.flight && (
          <div className="kv">
            <div><small>Vuelo</small><strong>{flightInfo.flight.iata}</strong></div>
            <div><small>Estado</small><strong>{labelStatus(flightInfo.flight.status)}</strong></div>
            <div><small>Salida {flightInfo.flight.departure.iata}</small><strong>T{flightInfo.flight.departure.terminal || "—"} · puerta {flightInfo.flight.departure.gate || "—"}</strong></div>
            <div><small>Llegada {flightInfo.flight.arrival.iata}</small><strong>T{flightInfo.flight.arrival.terminal || "—"} · puerta {flightInfo.flight.arrival.gate || "—"}</strong></div>
          </div>
        )}
        {flightInfo?.demo && <p className="muted" style={{ marginTop: 8 }}>Ficha de ejemplo. Sin key de Aviationstack no hay dato real de puerta.</p>}
        {flightInfo?.empty && <p className="status">{flightInfo.message}</p>}
      </section>
      <section className="card">
        <div className="topbar-row"><div><p className="kicker">Cielo cerca</p><h3>Aviones en {airport.iata}</h3></div><button type="button" className="btn ghost" onClick={reload}>Actualizar</button></div>
        {flightWarn && <p className="status">{flightWarn}</p>}
        <div className="grid" style={{ marginTop: 10 }}>
          {flights.slice(0, 16).map((f) => (
            <div key={f.icao24 + String(f.lat)} className="card" style={{ margin: 0, boxShadow: "none", border: "1px solid var(--line)" }}>
              <strong>{f.callsign || f.icao24}</strong>
              <p className="muted">{f.onGround ? "En tierra" : "En vuelo"}</p>
            </div>
          ))}
          {!flights.length && <div className="empty">No hay aviones visibles ahora.</div>}
        </div>
      </section>
    </>
  );
}

export function NavTab({ airport, pois, origin, setOriginGps, startPickOrigin, setOriginFromPoi, geoMsg, destination, route, routeErr, routeMode, setRouteMode, buildRoute, nearby, setOriginFromAirport, arrive }) {
  return (
    <>
      <section className="hero">
        <p className="kicker">Ruta</p>
        <h2>De un punto a otro</h2>
        <p className="muted">GPS, un toque en el mapa o un aeropuerto cercano. Luego ves llegada a pie y en carro.</p>
        <div className="btn-row">
          <button type="button" className="btn teal" onClick={setOriginGps}>Punto de partida con GPS</button>
          <button type="button" className="btn primary" onClick={startPickOrigin}>Elegir punto de partida</button>
        </div>
        <div className="switch-row" role="tablist" aria-label="Modo de llegada">
          <button type="button" className={`switch ${routeMode === "driving" ? "on" : ""}`} aria-pressed={routeMode === "driving"} onClick={() => setRouteMode("driving")}>En carro</button>
          <button type="button" className={`switch ${routeMode === "foot" ? "on" : ""}`} aria-pressed={routeMode === "foot"} onClick={() => setRouteMode("foot")}>A pie</button>
        </div>
        {origin ? <p className="status ok">Inicio: {origin.name}</p> : <p className="status info">{geoMsg || "Aún no hay punto de partida."}</p>}
      </section>
      <section className="card"><NearbyList title="Aeropuertos para usar como partida" items={nearby} onPick={setOriginFromAirport} /></section>
      <section className="card">
        <h3>También puedes salir desde un servicio</h3>
        <div className="grid" style={{ marginTop: 8 }}>
          {pois.map((p) => (<button type="button" key={"o-" + p.id} className="choice" onClick={() => setOriginFromPoi(p)}><span>{p.emoji} Usar {p.name} como inicio</span></button>))}
        </div>
      </section>
      <section className="card">
        <h3>Destino en {airport.iata}</h3>
        <div className="grid" style={{ marginTop: 8 }}>
          {pois.map((p) => (<button type="button" key={p.id} className="poi" onClick={() => buildRoute(p)}><span>{p.emoji} <strong>{p.name}</strong><br /><span className="muted">{p.label}</span></span><span className="muted">Ir</span></button>))}
        </div>
      </section>
      {routeErr && <p className="status">{routeErr}</p>}
      {arrive && destination && (
        <section className="card">
          <h3>Cómo llegar a {destination.name}</h3>
          <div className="kv">
            <div><small>A pie</small><strong>{arrive.foot && !arrive.foot.error ? `${formatMeters(arrive.foot.distance)} · ${formatMin(arrive.foot.duration)}` : arrive.foot?.error || "—"}</strong></div>
            <div><small>En carro</small><strong>{arrive.driving && !arrive.driving.error ? `${formatMeters(arrive.driving.distance)} · ${formatMin(arrive.driving.duration)}` : arrive.driving?.error || "—"}</strong></div>
          </div>
          {(arrive.howTo || []).map((line, i) => (<p key={i} className="muted" style={{ marginTop: 8 }}>{line}</p>))}
        </section>
      )}
      {route && destination && (
        <section className="card">
          <h3>Indicaciones {routeMode === "foot" ? "a pie" : "en carro"} hacia {destination.name}</h3>
          <p className="muted">{formatMeters(route.distance)} · {formatMin(route.duration)}</p>
          <ol className="steps">{(route.steps || []).map((s, i) => (<li key={i}><span className="dot">{i + 1}</span><span>{s.instruction}</span><span className="muted">{s.distance} m</span></li>))}</ol>
        </section>
      )}
    </>
  );
}

export function WeatherLine({ weather, compact }) {
  if (!weather) return <p className="muted">{compact ? "Cargando clima…" : "Cargando el tiempo en el aeropuerto…"}</p>;
  return (
    <p style={{ margin: compact ? "6px 0 0" : "0" }}>
      <strong>{weather.emoji} {weather.temp} °C · {weather.label}</strong>
      {!compact && <span className="muted"><br />Viento {weather.wind} km/h{weather.rain > 0 ? ` · lluvia ${weather.rain} mm` : ""}</span>}
      {compact && <span className="muted"> · viento {weather.wind} km/h</span>}
    </p>
  );
}

function labelStatus(status) {
  const map = { scheduled: "Programado", active: "En vuelo", landed: "Aterrizó", cancelled: "Cancelado", incident: "Incidente", diverted: "Desviado" };
  return map[status] || status || "—";
}
function formatMeters(m) {
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
