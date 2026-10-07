"use client";

import { cloneElement, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { COUNTRY_FLAG } from "../../lib/countries";
import { categoryMeta, poisForAirport } from "../../lib/hubs";
import { nearestAirports } from "../../lib/geo";
import { buildAirportIndex } from "../../lib/airportsIndex";
import { foldText } from "../../lib/text";
import { HomeTab, FlightsTab, NavTab, WeatherLine, NearbyList, InstallTab, PrivacyTab } from "./tabs";
import AirportCombobox from "./AirportCombobox";
import { Rail, useSwipeNav } from "./interactions";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

const TABS = [
  { id: "inicio", icon: "🏠", label: "Inicio" },
  { id: "mapa", icon: "🗺️", label: "Mapa" },
  { id: "vuelos", icon: "✈️", label: "Vuelos" },
  { id: "navegar", icon: "🧭", label: "Ruta" },
  { id: "instalar", icon: "📲", label: "Instalar" },
  { id: "privacidad", icon: "🔒", label: "Privacidad" }
];

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

const QUICK = ["HND","NRT","KIX","NGO","FUK","CTS","OKA","JFK","LAX","ORD","MIA","DFW","ATL","SFO","SEA","MEX","NLU","CUN","GDL","MTY","TIJ","SJD","PVR","MID","MAD"];

export default function AppClient() {
  const [airports, setAirports] = useState([]);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("ALL");
  const [tab, setTab] = useState("inicio");
  const [airport, setAirport] = useState(null);
  const [filter, setFilter] = useState("all");
  const [origin, setOrigin] = useState(null);
  const [geoMsg, setGeoMsg] = useState("");
  const [pickingOrigin, setPickingOrigin] = useState(false);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeMode, setRouteMode] = useState("driving");
  const [routeErr, setRouteErr] = useState("");
  const [arrive, setArrive] = useState(null);
  const [flights, setFlights] = useState([]);
  const [flightWarn, setFlightWarn] = useState("");
  const [flightQuery, setFlightQuery] = useState("");
  const [flightInfo, setFlightInfo] = useState(null);
  const [loadingFlight, setLoadingFlight] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [iosTip, setIosTip] = useState(false);
  const [weather, setWeather] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(true);
  // Estados de interacción (feedback de la interfaz, sin tocar la lógica).
  const [comboOpen, setComboOpen] = useState(false);
  const [dir, setDir] = useState(1);
  const [leaving, setLeaving] = useState(null);
  const [loadingSky, setLoadingSky] = useState(false);
  const [skyFlash, setSkyFlash] = useState(false);
  const [geoPending, setGeoPending] = useState(false);
  const [routing, setRouting] = useState(false);
  const leaveTimer = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || window.navigator.standalone === true;
    setInstalled(standalone);
    const onPrompt = (e) => { e.preventDefault(); setInstallEvent(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => { setInstalled(true); setInstallEvent(null); });
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);

  async function installApp() {
    if (installEvent) {
      installEvent.prompt();
      const res = await installEvent.userChoice;
      if (res.outcome === "accepted") setInstalled(true);
      setInstallEvent(null);
      return;
    }
    // Sin aviso nativo disponible: en iPhone/iPad el único camino es el menú Compartir.
    setIosTip(isIosDevice());
  }

  useEffect(() => {
    Promise.all([
      fetch("/data/airports.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/airports").then((r) => (r.ok ? r.json() : [])).catch(() => [])
    ]).then(([seed, remote]) => {
      const local = Array.isArray(seed) ? seed : [];
      const online = Array.isArray(remote) ? remote : [];
      const byIata = new Map();
      for (const a of online) if (a?.iata) byIata.set(a.iata, a);
      // El dataset local está curado (tipo large/medium y país verificados), así que gana empates.
      for (const a of local) if (a?.iata) byIata.set(a.iata, a);
      const list = [...byIata.values()];
      buildAirportIndex(list);
      setAirports(list);
      setAirport(list.find((x) => x.iata === "HND") || list[0]);
    }).catch(() => setAirports([]));
  }, []);

  const pois = useMemo(() => (airport ? poisForAirport(airport) : []), [airport]);
  const nearbyFromFocus = useMemo(() => {
    const focus = origin || airport;
    if (!focus) return [];
    return nearestAirports(focus.lat, focus.lon, airports, 10);
  }, [origin, airport, airports]);

  const results = useMemo(() => {
    // La búsqueda ignora mayúsculas y diacríticos («jose» encuentra «José»).
    const q = foldText(query.trim());
    const pool = country === "ALL" ? airports : airports.filter((a) => a.country === country);
    const filtered = pool.filter((a) => {
      if (!q) {
        if (country === "MX" || country === "US" || country === "JP") return true;
        return a.type === "large" || QUICK.includes(a.iata);
      }
      return foldText(a.iata).includes(q) || foldText(a.icao || "").includes(q) || foldText(a.name).includes(q) || foldText(a.city || "").includes(q);
    });
    filtered.sort((a, b) => {
      const rank = (x) => (x.type === "large" ? 0 : 1);
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return (a.city || a.name).localeCompare(b.city || b.name, "es");
    });
    return filtered.slice(0, q ? 80 : country === "ALL" ? 24 : 120);
  }, [airports, query, country]);

  /* ---------------- cambio de sección (pestañas + swipe) ---------------- */

  function changeTab(id) {
    if (id === tab) return;
    const from = TABS.findIndex((t) => t.id === tab);
    const to = TABS.findIndex((t) => t.id === id);
    setDir(to >= from ? 1 : -1);
    setLeaving(tab);
    setTab(id);
    setComboOpen(false);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setLeaving(null), 260);
  }

  function onTabListKeyDown(e) {
    const i = TABS.findIndex((t) => t.id === tab);
    let n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    if (n < 0) return;
    e.preventDefault();
    changeTab(TABS[n].id);
    const btn = document.getElementById(`tab-${TABS[n].id}`);
    if (btn) btn.focus();
  }

  const swipeHandlers = useSwipeNav({
    disabled: comboOpen,
    onSwipe: (direction) => {
      const i = TABS.findIndex((t) => t.id === tab);
      const n = direction === "next" ? i + 1 : i - 1;
      if (n < 0 || n >= TABS.length) return;
      changeTab(TABS[n].id);
    }
  });

  /* ---------------- acciones ---------------- */

  function selectAirport(a) {
    setAirport(a); setDestination(null); setRoute(null); setArrive(null); setFilter("all"); setPickingOrigin(false); setSheetOpen(true); changeTab("mapa");
  }
  function applyOrigin(point, extraMsg) {
    setOrigin(point); setPickingOrigin(false); setGeoMsg(extraMsg || `Punto de partida: ${point.name}`);
  }
  function setOriginFromAirport(a) {
    applyOrigin({ lat: a.lat, lon: a.lon, name: `${a.iata} · ${a.city || a.name}`, source: "airport", iata: a.iata }, `Salida en aeropuerto ${a.iata}`);
    setAirport(a);
  }
  function setOriginGps() {
    if (typeof window === "undefined") return;
    if (geoPending) return;
    if (!window.isSecureContext) { setGeoMsg("El GPS solo funciona en HTTPS o en localhost."); return; }
    if (!navigator.geolocation) { setGeoMsg("Este dispositivo no permite ubicación."); return; }
    setPickingOrigin(false);
    setGeoPending(true);
    setGeoMsg("Pidiendo permiso de ubicación…");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude; const lon = pos.coords.longitude;
      let name = "Mi ubicación (GPS)";
      try { const res = await fetch(`/api/lugar?lat=${lat}&lon=${lon}`); const data = await res.json(); if (data?.name) name = data.name; } catch {}
      applyOrigin({ lat, lon, name, source: "gps" }, "Punto de partida: tu GPS.");
      setGeoPending(false);
    }, (err) => {
      const map = { 1: "Permiso de ubicación denegado. Actívalo en el navegador.", 2: "No pude leer el GPS. Revisa que la ubicación esté encendida.", 3: "Se agotó el tiempo de espera del GPS. Inténtalo otra vez." };
      setGeoMsg(map[err.code] || "No pude leer el GPS.");
      setGeoPending(false);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
  }
  function startPickOrigin() {
    setPickingOrigin(true); setSheetOpen(true); setGeoMsg("Toca el mapa o un aeropuerto para marcar el punto de partida."); changeTab("mapa");
  }
  async function onPickOrigin(point) {
    let named = point;
    if (point.source === "map") {
      try { const res = await fetch(`/api/lugar?lat=${point.lat}&lon=${point.lon}`); const data = await res.json(); if (data?.name) named = { ...point, name: data.name }; } catch {}
    }
    applyOrigin(named, "Punto de partida marcado.");
  }
  function setOriginFromPoi(p) {
    applyOrigin({ lat: p.lat, lon: p.lon, name: p.name, source: "poi" }, `Salida: ${p.name}`);
  }
  async function buildRoute(dest) {
    if (!origin) { setRouteErr("Primero elige un punto de partida (GPS, mapa o aeropuerto)."); changeTab("navegar"); return; }
    if (routing) return;
    setRouting(true);
    setDestination(dest); setRouteErr("Calculando ruta a pie y en carro…"); setArrive(null); changeTab("navegar");
    const params = new URLSearchParams({ fromLat: String(origin.lat), fromLon: String(origin.lon), toLat: String(dest.lat), toLon: String(dest.lon), dest: dest.name || "destino" });
    try {
      const res = await fetch(`/api/llegar?${params}`);
      const data = await res.json();
      if (!res.ok) { setRoute(null); setArrive(null); setRouteErr(data.error || "No se pudo calcular."); return; }
      setArrive(data);
      const chosen = data[routeMode] && !data[routeMode].error ? data[routeMode] : data.driving || data.foot;
      setRoute(chosen && !chosen.error ? chosen : null);
      setRouteErr(chosen?.error || "");
    } catch { setRouteErr("Error de red al calcular cómo llegar."); }
    finally { setRouting(false); }
  }
  useEffect(() => {
    if (!arrive) return;
    const chosen = arrive[routeMode];
    if (chosen && !chosen.error) { setRoute(chosen); setRouteErr(""); }
  }, [routeMode, arrive]);
  async function loadSky() {
    if (!airport) return false;
    setLoadingSky(true);
    try {
      const pad = 0.6;
      const params = new URLSearchParams({ lamin: String(airport.lat - pad), lomin: String(airport.lon - pad), lamax: String(airport.lat + pad), lomax: String(airport.lon + pad) });
      const res = await fetch(`/api/flights?${params}`);
      const data = await res.json();
      setFlights(data.flights || []);
      setFlightWarn(data.warning || "");
      return !data.warning;
    } catch {
      setFlightWarn("No se pudo actualizar la lista de aviones.");
      return false;
    } finally {
      setLoadingSky(false);
    }
  }
  async function reloadSky() {
    const ok = await loadSky();
    if (!ok) return;
    setSkyFlash(true);
    setTimeout(() => setSkyFlash(false), 1600);
  }
  useEffect(() => { if (!airport) return; loadSky(); const id = setInterval(loadSky, 45000); return () => clearInterval(id); }, [airport?.iata]);
  useEffect(() => {
    if (!airport) return;
    setWeather(null);
    fetch(`/api/clima?lat=${airport.lat}&lon=${airport.lon}`).then((r) => r.json()).then((data) => { if (data && data.temp !== undefined) setWeather(data); }).catch(() => {});
  }, [airport?.iata, airport?.lat, airport?.lon]);
  async function lookupFlight(e) {
    e.preventDefault();
    if (!flightQuery.trim() || loadingFlight) return;
    setLoadingFlight(true);
    try {
      const res = await fetch(`/api/vuelo?q=${encodeURIComponent(flightQuery.trim())}`);
      setFlightInfo(await res.json());
    } catch {
      setFlightInfo({ error: "Sin conexión para consultar el vuelo. Reinténtalo." });
    } finally {
      setLoadingFlight(false);
    }
  }
  const cats = categoryMeta();
  const counts = useMemo(() => {
    const c = { MX: 0, US: 0, JP: 0 };
    for (const a of airports) { if (c[a.country] !== undefined) c[a.country] += 1; }
    return c;
  }, [airports]);

  /* ---------------- paneles ---------------- */

  function screenFor(id) {
    if (id === "inicio") {
      return (
        <main className="screen">
          <HomeTab country={country} setCountry={setCountry} results={results} airports={airports} query={query} onSelect={selectAirport} airport={airport} weather={weather} counts={counts} />
        </main>
      );
    }
    if (id === "instalar") {
      return (
        <main className="screen">
          <InstallTab installed={installed} installApp={installApp} iosTip={iosTip} canPrompt={!!installEvent} />
        </main>
      );
    }
    if (id === "privacidad") {
      return (
        <main className="screen">
          <PrivacyTab />
        </main>
      );
    }
    if (!airport) return null;
    if (id === "mapa") {
      return (
        <main className="screen map-screen">
          <div className="map-full"><MapView airport={airport} pois={pois} filter={filter} origin={origin} destination={destination} routeGeo={route?.geometry} flights={flights} nearbyAirports={nearbyFromFocus} pickingOrigin={pickingOrigin} onPickOrigin={onPickOrigin} onPickAirport={setOriginFromAirport} visible={mapVisible} /></div>          <Rail label="Filtros de categorías del mapa" className="map-float" wrapClassName="map-float-wrap" scrollTo={filter}>
            <button type="button" data-key="all" className={`filter ${filter === "all" ? "on" : ""}`} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Todo</button>
            {Object.entries(cats).map(([key, meta]) => (
              <button type="button" key={key} data-key={key} className={`filter ${filter === key ? "on" : ""}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>{meta.emoji} {meta.label}</button>
            ))}
          </Rail>
          {pickingOrigin && <div className="banner-pick" role="status">Toca el mapa o un código IATA para el punto de partida</div>}
          <div className={`map-sheet ${sheetOpen ? "open" : "min"}`} id="map-sheet-panel">
            <button type="button" className="sheet-handle" onClick={() => setSheetOpen((v) => !v)} aria-expanded={sheetOpen} aria-controls="map-sheet-panel"><span aria-hidden="true" />{sheetOpen ? "Ocultar panel" : "Mostrar panel"}</button>
            <div className="sheet-body" inert={!sheetOpen}>
              <p className="kicker">{COUNTRY_FLAG[airport.country]} {airport.iata}</p>
              <h3>{airport.name}</h3>
              <p className="muted">{airport.city || "—"}</p>
              <WeatherLine weather={weather} compact />
              <div className="btn-row sticky-actions">
                <button type="button" className="btn teal" onClick={setOriginGps} aria-busy={geoPending} disabled={geoPending}>
                  {geoPending ? <><span className="spinner" aria-hidden="true" /> Localizando…</> : "Partida con GPS"}
                </button>
                <button type="button" className="btn primary" onClick={startPickOrigin}>Elegir punto de partida</button>
              </div>
              {origin && <p className="status ok" role="status">Inicio: {origin.name}</p>}
              {geoMsg && <p className="status info" role="status">{geoMsg}</p>}
              <NearbyList title="Aeropuertos cerca del punto" items={nearbyFromFocus} onPick={setOriginFromAirport} />
            </div>
          </div>
        </main>
      );
    }
    if (id === "vuelos") {
      return (
        <main className="screen">
          <FlightsTab airport={airport} flights={flights} flightWarn={flightWarn} flightQuery={flightQuery} setFlightQuery={setFlightQuery} lookupFlight={lookupFlight} flightInfo={flightInfo} loadingFlight={loadingFlight} reload={reloadSky} loadingSky={loadingSky} skyFlash={skyFlash} />
        </main>
      );
    }
    if (id === "navegar") {
      return (
        <main className="screen">
          <NavTab airport={airport} pois={pois} origin={origin} setOriginGps={setOriginGps} startPickOrigin={startPickOrigin} setOriginFromPoi={setOriginFromPoi} geoMsg={geoMsg} destination={destination} route={route} routeErr={routeErr} routeMode={routeMode} setRouteMode={setRouteMode} buildRoute={buildRoute} nearby={nearbyFromFocus} setOriginFromAirport={setOriginFromAirport} arrive={arrive} geoPending={geoPending} routing={routing} />
        </main>
      );
    }
    return null;
  }

  /* El panel del mapa vive siempre montado con clave estable: al cambiar de
     pestaña NO se destruye. Se oculta con CSS (display:none) y Leaflet
     recalcula su tamaño al volver (prop `visible`). Así el mapa no parpadea
     en gris ni se pierde la posición/zoom del usuario. */
  const mapActive = tab === "mapa";
  const mapVisible = mapActive || leaving === "mapa";
  const mapScreen = airport ? screenFor("mapa") : null;
  const current = tab === "mapa" ? null : screenFor(tab);
  const prev = !leaving || leaving === "mapa" ? null : screenFor(leaving);
  const mapCls =
    "screen map-screen panel" +
    (mapActive
      ? leaving && leaving !== "mapa"
        ? " enter"
        : ""
      : leaving === "mapa"
        ? " leave"
        : " off");
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.id === tab));

  return (
    <div className="shell">
      {tab !== "mapa" && (
        <header className="topbar">
          <div className="topbar-row">
            <div className="brand"><div className="mark" aria-hidden="true">✈</div><div><h1>AeroGuía</h1><small>App de aeropuerto</small></div></div>
            {airport && <span className="chip">{COUNTRY_FLAG[airport.country]} {airport.iata}</span>}
          </div>
          <AirportCombobox
            value={query}
            onChange={(v) => { setQuery(v); changeTab("inicio"); }}
            results={results}
            onSelect={selectAirport}
            onSubmit={() => { if (results[0]) selectAirport(results[0]); }}
            selectedKey={airport?.iata}
            ready={airports.length > 0}
            open={comboOpen}
            setOpen={setComboOpen}
          />
        </header>
      )}

      <nav className="tabs" aria-label="Navegación principal">
        <div className="tabs-list" style={{ "--n": String(TABS.length) }} role="tablist" aria-label="Secciones" aria-orientation="horizontal" onKeyDown={onTabListKeyDown}>
          <span className="tabs-indicator" aria-hidden="true" style={{ "--i": String(activeIndex) }} />
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              id={`tab-${t.id}`}
              role="tab"
              className="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => changeTab(t.id)}
            >
              <strong aria-hidden="true">{t.icon}</strong>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="panels" {...swipeHandlers}>
        {mapScreen && cloneElement(mapScreen, {
          key: "mapa",
          className: mapCls,
          id: "panel-mapa",
          role: "tabpanel",
          "aria-labelledby": "tab-mapa",
          "aria-hidden": mapActive ? undefined : true,
          inert: !mapActive ? true : undefined,
          style: { "--dir": String(dir) }
        })}
        {prev && cloneElement(prev, {
          key: `leave-${leaving}`,
          className: `${prev.props.className || ""} panel leave`,
          id: undefined,
          "aria-hidden": true,
          inert: true,
          style: { "--dir": String(dir) }
        })}
        {current && cloneElement(current, {
          key: `cur-${tab}`,
          className: `${current.props.className || ""} panel enter`,
          id: `panel-${tab}`,
          role: "tabpanel",
          "aria-labelledby": `tab-${tab}`,
          style: { "--dir": String(dir) }
        })}
      </div>
    </div>
  );
}
