"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { COUNTRY_FLAG } from "../../lib/countries";
import { categoryMeta, poisForAirport } from "../../lib/hubs";
import { nearestAirports } from "../../lib/geo";
import { buildAirportIndex } from "../../lib/airportsIndex";
import { HomeTab, FlightsTab, NavTab, WeatherLine, NearbyList } from "./tabs";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

const TABS = [
  { id: "inicio", icon: "🏠", label: "Inicio" },
  { id: "mapa", icon: "🗺️", label: "Mapa" },
  { id: "vuelos", icon: "✈️", label: "Vuelos" },
  { id: "navegar", icon: "🧭", label: "Ruta" }
];

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

  async function installApp() {
    if (installEvent) {
      installEvent.prompt();
      const res = await installEvent.userChoice;
      if (res.outcome === "accepted") setInstalled(true);
      setInstallEvent(null);
      return;
    }
    setIosTip(true);
  }

  useEffect(() => {
    Promise.all([
      fetch("/data/airports.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/airports").then((r) => (r.ok ? r.json() : [])).catch(() => [])
    ]).then(([single, remote]) => {
      const list = Array.isArray(single) && single.length ? single : remote || [];
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
    const q = query.trim().toLowerCase();
    const pool = country === "ALL" ? airports : airports.filter((a) => a.country === country);
    const filtered = pool.filter((a) => {
      if (!q) {
        if (country === "MX" || country === "US" || country === "JP") return true;
        return a.type === "large" || QUICK.includes(a.iata);
      }
      return a.iata.toLowerCase().includes(q) || (a.icao || "").toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || (a.city || "").toLowerCase().includes(q);
    });
    filtered.sort((a, b) => {
      const rank = (x) => (x.type === "large" ? 0 : 1);
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return (a.city || a.name).localeCompare(b.city || b.name, "es");
    });
    return filtered.slice(0, q ? 80 : country === "ALL" ? 24 : 120);
  }, [airports, query, country]);

  function selectAirport(a) {
    setAirport(a); setDestination(null); setRoute(null); setArrive(null); setFilter("all"); setPickingOrigin(false); setSheetOpen(true); setTab("mapa");
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
    if (!window.isSecureContext) { setGeoMsg("El GPS solo funciona en HTTPS o en localhost."); return; }
    if (!navigator.geolocation) { setGeoMsg("Este dispositivo no permite ubicación."); return; }
    setPickingOrigin(false);
    setGeoMsg("Pidiendo permiso de ubicación…");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude; const lon = pos.coords.longitude;
      let name = "Mi ubicación (GPS)";
      try { const res = await fetch(`/api/lugar?lat=${lat}&lon=${lon}`); const data = await res.json(); if (data?.name) name = data.name; } catch {}
      applyOrigin({ lat, lon, name, source: "gps" }, "Punto de partida: tu GPS.");
    }, (err) => {
      const map = { 1: "Permiso de ubicación denegado. Actívalo en el navegador.", 2: "No pude leer el GPS. Revisa que la ubicación esté encendida.", 3: "Se agotó el tiempo de espera del GPS. Inténtalo otra vez." };
      setGeoMsg(map[err.code] || "No pude leer el GPS.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
  }
  function startPickOrigin() {
    setPickingOrigin(true); setSheetOpen(true); setGeoMsg("Toca el mapa o un aeropuerto para marcar el punto de partida."); setTab("mapa");
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
    if (!origin) { setRouteErr("Primero elige un punto de partida (GPS, mapa o aeropuerto)."); setTab("navegar"); return; }
    setDestination(dest); setRouteErr("Calculando ruta a pie y en carro…"); setArrive(null); setTab("navegar");
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
  }
  useEffect(() => {
    if (!arrive) return;
    const chosen = arrive[routeMode];
    if (chosen && !chosen.error) { setRoute(chosen); setRouteErr(""); }
  }, [routeMode, arrive]);
  async function loadSky() {
    if (!airport) return;
    const pad = 0.6;
    const params = new URLSearchParams({ lamin: String(airport.lat - pad), lomin: String(airport.lon - pad), lamax: String(airport.lat + pad), lomax: String(airport.lon + pad) });
    const res = await fetch(`/api/flights?${params}`);
    const data = await res.json();
    setFlights(data.flights || []);
    setFlightWarn(data.warning || "");
  }
  useEffect(() => { if (!airport) return; loadSky(); const id = setInterval(loadSky, 45000); return () => clearInterval(id); }, [airport?.iata]);
  useEffect(() => {
    if (!airport) return;
    setWeather(null);
    fetch(`/api/clima?lat=${airport.lat}&lon=${airport.lon}`).then((r) => r.json()).then((data) => { if (data && data.temp !== undefined) setWeather(data); }).catch(() => {});
  }, [airport?.iata, airport?.lat, airport?.lon]);
  async function lookupFlight(e) {
    e.preventDefault();
    if (!flightQuery.trim()) return;
    setLoadingFlight(true);
    const res = await fetch(`/api/vuelo?q=${encodeURIComponent(flightQuery.trim())}`);
    setFlightInfo(await res.json());
    setLoadingFlight(false);
  }
  const cats = categoryMeta();
  const counts = useMemo(() => {
    const c = { MX: 0, US: 0, JP: 0 };
    for (const a of airports) { if (c[a.country] !== undefined) c[a.country] += 1; }
    return c;
  }, [airports]);

  return (
    <div className="shell">
      {tab !== "mapa" && (
        <header className="topbar">
          <div className="topbar-row">
            <div className="brand"><div className="mark">✈</div><div><h1>AeroGuía</h1><small>App de aeropuerto</small></div></div>
            {airport && <span className="chip">{COUNTRY_FLAG[airport.country]} {airport.iata}</span>}
          </div>
          <form className="search" onSubmit={(e) => { e.preventDefault(); if (results[0]) selectAirport(results[0]); }}>
            <input value={query} onChange={(e) => { setQuery(e.target.value); setTab("inicio"); }} placeholder="Aeropuerto, ciudad o código" />
            <button type="submit">Buscar</button>
          </form>
        </header>
      )}
      {tab === "inicio" && <main className="screen"><HomeTab country={country} setCountry={setCountry} results={results} airports={airports} query={query} onSelect={selectAirport} airport={airport} installed={installed} installApp={installApp} iosTip={iosTip} weather={weather} counts={counts} /></main>}
      {tab === "mapa" && airport && (
        <main className="screen map-screen">
          <div className="map-full"><MapView airport={airport} pois={pois} filter={filter} origin={origin} destination={destination} routeGeo={route?.geometry} flights={flights} nearbyAirports={nearbyFromFocus} pickingOrigin={pickingOrigin} onPickOrigin={onPickOrigin} onPickAirport={setOriginFromAirport} /></div>
          <div className="map-chrome map-float">
            <button type="button" className={`filter ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>Todo</button>
            {Object.entries(cats).map(([key, meta]) => (
              <button type="button" key={key} className={`filter ${filter === key ? "on" : ""}`} onClick={() => setFilter(key)}>{meta.emoji} {meta.label}</button>
            ))}
          </div>
          {pickingOrigin && <div className="banner-pick">Toca el mapa o un código IATA para el punto de partida</div>}
          <div className={`map-sheet ${sheetOpen ? "open" : "min"}`}>
            <button type="button" className="sheet-handle" onClick={() => setSheetOpen((v) => !v)} aria-expanded={sheetOpen}><span />{sheetOpen ? "Ocultar panel" : "Mostrar panel"}</button>
            <p className="kicker">{COUNTRY_FLAG[airport.country]} {airport.iata}</p>
            <h3>{airport.name}</h3>
            <p className="muted">{airport.city || "—"}</p>
            <WeatherLine weather={weather} compact />
            <div className="btn-row sticky-actions">
              <button type="button" className="btn teal" onClick={setOriginGps}>Partida con GPS</button>
              <button type="button" className="btn primary" onClick={startPickOrigin}>Elegir punto de partida</button>
            </div>
            {origin && <p className="status ok">Inicio: {origin.name}</p>}
            {geoMsg && <p className="status info">{geoMsg}</p>}
            <NearbyList title="Aeropuertos cerca del punto" items={nearbyFromFocus} onPick={setOriginFromAirport} />
          </div>
        </main>
      )}
      {tab === "vuelos" && airport && <main className="screen"><FlightsTab airport={airport} flights={flights} flightWarn={flightWarn} flightQuery={flightQuery} setFlightQuery={setFlightQuery} lookupFlight={lookupFlight} flightInfo={flightInfo} loadingFlight={loadingFlight} reload={loadSky} /></main>}
      {tab === "navegar" && airport && <main className="screen"><NavTab airport={airport} pois={pois} origin={origin} setOriginGps={setOriginGps} startPickOrigin={startPickOrigin} setOriginFromPoi={setOriginFromPoi} geoMsg={geoMsg} destination={destination} route={route} routeErr={routeErr} routeMode={routeMode} setRouteMode={setRouteMode} buildRoute={buildRoute} nearby={nearbyFromFocus} setOriginFromAirport={setOriginFromAirport} arrive={arrive} /></main>}
      <nav className="tabs">{TABS.map((t) => (<button key={t.id} type="button" className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}><strong>{t.icon}</strong><span>{t.label}</span></button>))}</nav>
    </div>
  );
}
