"use client";

import { useEffect, useState } from "react";
import { COUNTRY_FLAG } from "../../lib/countries";
import { isDetailedHub } from "../../lib/hubs";
import { formatKm } from "../../lib/geo";
import { Rail } from "./interactions";
import PrivacyContent from "./PrivacyContent";
import SwipeCard from "./SwipeCard";

export function NearbyList({ title, items, onPick }) {
  if (!items?.length) return null;
  return (
    <div className="nearby">
      <p className="kicker">{title}</p>
      <Rail label={title} className="pills-rail">
        {items.map((a) => (
          <button type="button" key={a.iata + a.icao} className="pill airport-pill" onClick={() => onPick(a)}>
            {COUNTRY_FLAG[a.country] || ""} {a.iata} · {formatKm(a.km)}
          </button>
        ))}
      </Rail>
    </div>
  );
}

export function HomeTab({ country, setCountry, results, query, onSelect, airport, weather, counts }) {
  const selectedKey = airport ? `${airport.iata}${airport.icao || ""}` : null;
  const filters = [
    { id: "ALL", label: "Destacados" },
    { id: "JP", label: `🇯🇵 Japón (${counts.JP})` },
    { id: "US", label: `🇺🇸 EE. UU. (${counts.US})` },
    { id: "MX", label: `🇲🇽 México (${counts.MX})` },
    { id: "ES", label: "🇪🇸 España" }
  ];
  return (
    <>
      <section className="hero">
        <p className="kicker">En el bolsillo</p>
        <h2>Tu aeropuerto, en formato app.</h2>
        <p className="muted">
          {counts.JP} aeropuertos en Japón, {counts.US} en Estados Unidos y {counts.MX} en México. Elige salida con GPS,
          tocando el mapa o un aeropuerto cercano.
        </p>
      </section>
      {airport && (
        <section className="card">
          <p className="kicker">Tiempo en {airport.iata}</p>
          <WeatherLine weather={weather} />
        </section>
      )}

      <Rail label="Filtros por país" className="pills-rail" scrollTo={country}>
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            data-key={f.id}
            className={`pill ${country === f.id ? "active" : ""}`}
            aria-pressed={country === f.id}
            onClick={() => setCountry(f.id)}
          >
            {f.label}
          </button>
        ))}
      </Rail>

      {airport && !query && (
        <p className="muted" style={{ marginBottom: 8 }}>
          Ahora: {airport.iata} · {results.length} aeropuertos en esta lista
        </p>
      )}

      <Rail
        label="Resultados de aeropuertos"
        variant="grid"
        className="two"
        scrollTo={selectedKey}
        wrapClassName="results-wrap"
      >
        {results.map((a) => {
          const key = `${a.iata}${a.icao || ""}`;
          const isSelected = key === selectedKey;
          return (
            <button
              type="button"
              key={key}
              data-key={key}
              className="airport-card"
              aria-current={isSelected ? "true" : undefined}
              onClick={() => onSelect(a)}
            >
              <div>
                <div className="iata">{a.iata}</div>
                <strong>{a.city || a.name}</strong>
                <p className="muted">
                  {COUNTRY_FLAG[a.country]} {a.name}
                </p>
              </div>
              <span className="badges">
                {isSelected && <span className="badge current">✓ Seleccionado</span>}
                {isDetailedHub(a.iata) ? <span className="badge">Detalle</span> : null}
              </span>
            </button>
          );
        })}
        {!results.length && <div className="empty">No encontré ese aeropuerto.</div>}
      </Rail>
    </>
  );
}

export function InstallTab({ installed, installApp, iosTip, canPrompt }) {
  return (
    <>
      <section className="hero">
        <p className="kicker">Instalación</p>
        <h2>Instalar en este dispositivo</h2>
        <p className="muted">
          AeroGuía funciona como app instalable: se abre a pantalla completa, con su propio icono, y guarda el
          contenido básico para volver a abrirla sin conexión.
        </p>
        {installed ? (
          <p className="status ok" role="status">
            App instalada. Se abre a pantalla completa.
          </p>
        ) : (
          <div className="btn-row">
            <button type="button" className="btn primary full" onClick={installApp}>
              Instalar en este dispositivo
            </button>
          </div>
        )}
        {!installed && iosTip && (
          <p className="status info" role="status">
            iPhone/iPad: toca Compartir y luego «Añadir a pantalla de inicio».
          </p>
        )}
        {!installed && !iosTip && !canPrompt && (
          <p className="muted" style={{ marginTop: 8 }} role="status">
            Si tu navegador no ofrece el aviso, usa su menú y elige «Instalar app» o «Añadir a pantalla de inicio».
          </p>
        )}
      </section>

      <section className="card">
        <h3>Qué incluye la versión instalada</h3>
        <ul className="plain">
          <li>
            <span aria-hidden="true">📴</span> <span>Pantalla completa, sin la barra del navegador.</span>
          </li>
          <li>
            <span aria-hidden="true">🚀</span> <span>Abre directo desde el icono de tu inicio o escritorio.</span>
          </li>
          <li>
            <span aria-hidden="true">🧭</span> <span>GPS, mapa y rutas siguen pidiendo permiso solo cuando los usas.</span>
          </li>
          <li>
            <span aria-hidden="true">🔄</span> <span>Se actualiza sola cuando hay una versión nueva.</span>
          </li>
        </ul>
      </section>

      <section className="card">
        <h3>Cómo instalarla</h3>
        <div className="steps-plain">
          <div>
            <span className="dot" aria-hidden="true">1</span>
            <p className="muted">
              <strong>Android (Chrome o Edge):</strong> toca «Instalar en este dispositivo» aquí arriba; si no
              aparece, abre el menú ⋮ y elige «Instalar app» o «Añadir a pantalla de inicio».
            </p>
          </div>
          <div>
            <span className="dot" aria-hidden="true">2</span>
            <p className="muted">
              <strong>iPhone o iPad (Safari):</strong> toca Compartir <span aria-hidden="true">⬆️</span> y luego
              «Añadir a pantalla de inicio».
            </p>
          </div>
          <div>
            <span className="dot" aria-hidden="true">3</span>
            <p className="muted">
              <strong>Computadora (Chrome o Edge):</strong> icono de instalar en la barra de direcciones, o menú ⋮ →
              «Instalar AeroGuía».
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export function PrivacyTab() {
  return (
    <section className="card legal-embed">
      <PrivacyContent />
    </section>
  );
}

export function FlightsTab({
  airport,
  flights,
  flightWarn,
  flightQuery,
  setFlightQuery,
  lookupFlight,
  flightInfo,
  loadingFlight,
  reload,
  loadingSky,
  skyFlash
}) {
  const [btnFeedback, setBtnFeedback] = useState(null);

  // Estado del botón de búsqueda: éxito breve o error con vibramiento sutil.
  useEffect(() => {
    if (!flightInfo) return;
    if (flightInfo.error) setBtnFeedback("error");
    else if (flightInfo.flight) setBtnFeedback("ok");
    else return;
    const t = setTimeout(() => setBtnFeedback(null), 1500);
    return () => clearTimeout(t);
  }, [flightInfo]);

  return (
    <>
      <section className="card">
        <p className="kicker">Tu vuelo</p>
        <h3 id="flight-title">Número de vuelo</h3>
        <form className="search" onSubmit={lookupFlight}>
          <label className="sr-only" htmlFor="flight-q">
            Número de vuelo
          </label>
          <input
            id="flight-q"
            value={flightQuery}
            onChange={(e) => setFlightQuery(e.target.value.toUpperCase())}
            placeholder="NH203, AA100…"
            aria-labelledby="flight-title"
          />
          <button
            type="submit"
            aria-busy={loadingFlight}
            disabled={loadingFlight}
            data-state={loadingFlight ? "busy" : btnFeedback || undefined}
          >
            {loadingFlight ? (
              <>
                <span className="spinner" aria-hidden="true" /> Buscando
              </>
            ) : btnFeedback === "error" ? (
              "Reintentar"
            ) : btnFeedback === "ok" ? (
              "✓ Listo"
            ) : (
              "Ver"
            )}
          </button>
        </form>
        <div id="flight-status">
          {flightInfo?.flight && (
            <div className="kv">
              <div>
                <small>Vuelo</small>
                <strong>{flightInfo.flight.iata}</strong>
              </div>
              <div>
                <small>Estado</small>
                <strong>{labelStatus(flightInfo.flight.status)}</strong>
              </div>
              <div>
                <small>Salida {flightInfo.flight.departure.iata}</small>
                <strong>
                  T{flightInfo.flight.departure.terminal || "—"} · puerta {flightInfo.flight.departure.gate || "—"}
                </strong>
              </div>
              <div>
                <small>Llegada {flightInfo.flight.arrival.iata}</small>
                <strong>
                  T{flightInfo.flight.arrival.terminal || "—"} · puerta {flightInfo.flight.arrival.gate || "—"}
                </strong>
              </div>
            </div>
          )}
          {flightInfo?.demo && (
            <p className="muted" style={{ marginTop: 8 }} role="status">
              Ficha de ejemplo. Sin key de Aviationstack no hay dato real de puerta.
            </p>
          )}
          {flightInfo?.empty && (
            <p className="status" role="status">
              {flightInfo.message}
            </p>
          )}
          {flightInfo?.error && (
            <p className="status" role="status">
              {flightInfo.error}
            </p>
          )}
        </div>
      </section>
      <section className="card">
        <div className="topbar-row">
          <div>
            <p className="kicker">Cielo cerca</p>
            <h3>Aviones en {airport.iata}</h3>
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={reload}
            aria-busy={loadingSky}
            disabled={loadingSky}
          >
            {loadingSky ? (
              <>
                <span className="spinner" aria-hidden="true" /> Actualizando
              </>
            ) : skyFlash ? (
              "✓ Listo"
            ) : (
              "Actualizar"
            )}
          </button>
        </div>
        {flightWarn && (
          <p className="status" role="status">
            {flightWarn}
          </p>
        )}
        <Rail label="Aviones cerca del aeropuerto" variant="grid" className="flights-rail" wrapClassName="flights-wrap">
          {flights.slice(0, 16).map((f) => (
            <div key={f.icao24 + String(f.lat)} className="card mini">
              <strong>{f.callsign || f.icao24}</strong>
              <p className="muted">{f.onGround ? "En tierra" : "En vuelo"}</p>
            </div>
          ))}
          {!flights.length && <div className="empty">No hay aviones visibles ahora.</div>}
        </Rail>
      </section>
    </>
  );
}

const MODES = [
  { id: "driving", label: "En carro" },
  { id: "foot", label: "A pie" }
];

export function NavTab({
  airport,
  pois,
  origin,
  setOriginGps,
  startPickOrigin,
  setOriginFromPoi,
  geoMsg,
  destination,
  route,
  routeErr,
  routeMode,
  setRouteMode,
  buildRoute,
  nearby,
  setOriginFromAirport,
  arrive,
  geoPending,
  routing
}) {
  const modeIndex = Math.max(0, MODES.findIndex((m) => m.id === routeMode));

  function onModeKeyDown(e) {
    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (modeIndex + 1) % MODES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (modeIndex - 1 + MODES.length) % MODES.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = MODES.length - 1;
    if (n < 0) return;
    e.preventDefault();
    setRouteMode(MODES[n].id);
    const el = document.getElementById(`mode-${MODES[n].id}`);
    if (el) el.focus();
  }

  return (
    <>
      <section className="hero">
        <p className="kicker">Ruta</p>
        <h2>De un punto a otro</h2>
        <p className="muted">GPS, un toque en el mapa o un aeropuerto cercano. Luego ves llegada a pie y en carro.</p>
        <div className="btn-row">
          <button
            type="button"
            className="btn teal"
            onClick={setOriginGps}
            aria-busy={geoPending}
            disabled={geoPending}
          >
            {geoPending ? (
              <>
                <span className="spinner" aria-hidden="true" /> Localizando…
              </>
            ) : (
              "Punto de partida con GPS"
            )}
          </button>
          <button type="button" className="btn primary" onClick={startPickOrigin}>
            Elegir punto de partida
          </button>
        </div>
        <div className="switch-row" role="radiogroup" aria-label="Modo de llegada">
          <span className="seg-indicator" aria-hidden="true" style={{ "--i": String(modeIndex) }} />
          {MODES.map((m, i) => (
            <button
              key={m.id}
              id={`mode-${m.id}`}
              type="button"
              role="radio"
              className={`switch ${routeMode === m.id ? "on" : ""}`}
              aria-checked={routeMode === m.id}
              tabIndex={routeMode === m.id ? 0 : -1}
              onClick={() => setRouteMode(m.id)}
              onKeyDown={onModeKeyDown}
            >
              {m.label}
            </button>
          ))}
        </div>
        {origin ? (
          <p className="status ok" role="status">
            Inicio: {origin.name}
          </p>
        ) : (
          <p className="status info" role="status">
            {geoMsg || "Aún no hay punto de partida."}
          </p>
        )}
      </section>
      <section className="card">
        <NearbyList title="Aeropuertos para usar como partida" items={nearby} onPick={setOriginFromAirport} />
      </section>
      <section className="card">
        <h3>También puedes salir desde un servicio</h3>
        <div className="grid" style={{ marginTop: 8 }}>
          {pois.map((p) => (
            <button type="button" key={"o-" + p.id} className="choice" onClick={() => setOriginFromPoi(p)}>
              <span>{p.emoji} Usar {p.name} como inicio</span>
            </button>
          ))}
        </div>
      </section>
      <section className="card">
        <h3>Destino en {airport.iata}</h3>
        <p className="muted" style={{ marginTop: 4, marginBottom: 8 }}>
          Toca para calcular la ruta, o desliza la tarjeta (usa «⋯» con teclado) para más acciones.
        </p>
        <div className="grid poi-grid" style={{ marginTop: 8 }}>
          {pois.map((p) => (
            <SwipeCard
              key={p.id}
              label={p.name}
              className="poi-card"
              onPrimary={() => buildRoute(p)}
              primaryDisabled={routing}
              actions={[{ label: `Usar «${p.name}» como inicio`, onClick: () => setOriginFromPoi(p) }]}
            >
              <span>
                {p.emoji} <strong>{p.name}</strong>
                <br />
                <span className="muted">{p.label}</span>
              </span>
              <span className="muted">Ir</span>
            </SwipeCard>
          ))}
        </div>
      </section>
      {routeErr && (
        <p className="status" role="status">
          {routeErr}
        </p>
      )}
      {arrive && destination && (
        <section className="card">
          <h3>Cómo llegar a {destination.name}</h3>
          <div className="kv">
            <div>
              <small>A pie</small>
              <strong>
                {arrive.foot && !arrive.foot.error
                  ? `${formatMeters(arrive.foot.distance)} · ${formatMin(arrive.foot.duration)}`
                  : arrive.foot?.error || "—"}
              </strong>
            </div>
            <div>
              <small>En carro</small>
              <strong>
                {arrive.driving && !arrive.driving.error
                  ? `${formatMeters(arrive.driving.distance)} · ${formatMin(arrive.driving.duration)}`
                  : arrive.driving?.error || "—"}
              </strong>
            </div>
          </div>
          {(arrive.howTo || []).map((line, i) => (
            <p key={i} className="muted" style={{ marginTop: 8 }}>
              {line}
            </p>
          ))}
        </section>
      )}
      {route && destination && (
        <section className="card">
          <h3>
            Indicaciones {routeMode === "foot" ? "a pie" : "en carro"} hacia {destination.name}
          </h3>
          <p className="muted">
            {formatMeters(route.distance)} · {formatMin(route.duration)}
          </p>
          <ol className="steps">
            {(route.steps || []).map((s, i) => (
              <li key={i}>
                <span className="dot">{i + 1}</span>
                <span>{s.instruction}</span>
                <span className="muted">{s.distance} m</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

export function WeatherLine({ weather, compact }) {
  if (!weather) return <p className="muted">{compact ? "Cargando clima…" : "Cargando el tiempo en el aeropuerto…"}</p>;
  return (
    <p style={{ margin: compact ? "6px 0 0" : "0" }}>
      <strong>
        {weather.emoji} {weather.temp} °C · {weather.label}
      </strong>
      {!compact && (
        <span className="muted">
          <br />
          Viento {weather.wind} km/h{weather.rain > 0 ? ` · lluvia ${weather.rain} mm` : ""}
        </span>
      )}
      {compact && <span className="muted"> · viento {weather.wind} km/h</span>}
    </p>
  );
}

function labelStatus(status) {
  const map = {
    scheduled: "Programado",
    active: "En vuelo",
    landed: "Aterrizó",
    cancelled: "Cancelado",
    incident: "Incidente",
    diverted: "Desviado"
  };
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
