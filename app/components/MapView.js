"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

export default function MapView({
  airport,
  pois,
  filter,
  origin,
  destination,
  routeGeo,
  flights,
  nearbyAirports,
  pickingOrigin,
  onPickOrigin,
  onPickAirport,
  visible = true
}) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({});
  const pickRef = useRef({ pickingOrigin, onPickOrigin, onPickAirport });
  // `ready` avisa cuando Leaflet terminó de cargar (import asíncrono) para que
  // los efectos de capas se ejecuten aunque las props no cambien después.
  const [ready, setReady] = useState(false);
  // Referencia con las props más recientes: la inicialización es asíncrona y
  // no debe quedarse con un aeropuerto obsoleto.
  const latestRef = useRef({});
  latestRef.current = { airport };

  pickRef.current = { pickingOrigin, onPickOrigin, onPickAirport };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || mapRef.current) return;

      const center = latestRef.current.airport;
      const map = L.map(ref.current, {
        zoomControl: true,
        attributionControl: true
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        // Atribución requerida por la política de teselas de OpenStreetMap.
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
      }).addTo(map);
      map.attributionControl.setPrefix(false);
      map.setView(center ? [center.lat, center.lon] : [0, 0], center ? 14 : 2);
      map.on("click", (e) => {
        const cur = pickRef.current;
        if (!cur.pickingOrigin || !cur.onPickOrigin) return;
        cur.onPickOrigin({
          lat: e.latlng.lat,
          lon: e.latlng.lng,
          name: "Punto elegido en el mapa",
          source: "map"
        });
      });
      mapRef.current = map;
      layersRef.current = {
        L,
        markers: L.layerGroup().addTo(map),
        extras: L.layerGroup().addTo(map),
        airports: L.layerGroup().addTo(map)
      };
      setTimeout(() => map.invalidateSize(), 80);
      setTimeout(() => map.invalidateSize(), 320);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Al volver a mostrarse (cambio de pestaña) el contenedor pasó por
  // display:none: hay que recalcular el tamaño para que Leaflet dibuje bien.
  useEffect(() => {
    if (!ready || !visible) return;
    const map = mapRef.current;
    if (!map) return;
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const timers = [240, 620].map((ms) => setTimeout(() => map.invalidateSize(), ms));
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [ready, visible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !airport) return;
    map.setView([airport.lat, airport.lon], 14);
    setTimeout(() => map.invalidateSize(), 60);
  }, [ready, airport?.iata, airport?.lat, airport?.lon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const el = map.getContainer();
    if (el) el.style.cursor = pickingOrigin ? "crosshair" : "";
    setTimeout(() => map.invalidateSize(), 40);
  }, [pickingOrigin]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!ready || !map || !layers.L) return;
    const L = layers.L;
    layers.markers.clearLayers();
    const visiblePois = filter === "all" ? pois : pois.filter((p) => p.category === filter);
    visiblePois.forEach((p) => {
      const color = /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#1d4ed8";
      const icon = L.divIcon({
        className: "",
        html: `<div class="map-pin" style="background:${color}">${escapeHtml(p.emoji)}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      const marker = L.marker([p.lat, p.lon], { icon }).bindPopup(
        `<strong>${escapeHtml(p.name)}</strong><br/>${escapeHtml(p.label || "")}`
      );
      marker.on("click", (ev) => {
        const cur = pickRef.current;
        if (cur.pickingOrigin && cur.onPickOrigin) {
          L.DomEvent.stopPropagation(ev);
          cur.onPickOrigin({
            lat: p.lat,
            lon: p.lon,
            name: p.name,
            source: "poi"
          });
        }
      });
      marker.addTo(layers.markers);
    });
  }, [ready, pois, filter, airport?.iata]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!ready || !map || !layers.L || !layers.airports) return;
    const L = layers.L;
    layers.airports.clearLayers();
    const list = nearbyAirports || [];
    list.forEach((a) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="map-pin airport">${escapeHtml(a.iata)}</div>`,
        iconSize: [44, 28],
        iconAnchor: [22, 14]
      });
      const marker = L.marker([a.lat, a.lon], { icon, zIndexOffset: 400 }).bindPopup(
        `<strong>${escapeHtml(a.iata)}</strong><br/>${escapeHtml(a.name)}`
      );
      marker.on("click", (ev) => {
        L.DomEvent.stopPropagation(ev);
        const cur = pickRef.current;
        cur.onPickAirport?.(a);
      });
      marker.addTo(layers.airports);
    });
  }, [ready, nearbyAirports]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!ready || !map || !layers.L) return;
    const L = layers.L;
    layers.extras.clearLayers();

    if (origin) {
      L.circleMarker([origin.lat, origin.lon], {
        radius: 9,
        color: "#1d4ed8",
        fillColor: "#2f6fed",
        fillOpacity: 1,
        weight: 3
      })
        .bindPopup(`Inicio: ${escapeHtml(origin.name)}`)
        .addTo(layers.extras);
    }

    if (destination) {
      L.circleMarker([destination.lat, destination.lon], {
        radius: 9,
        color: "#0f766e",
        fillColor: "#14b8a6",
        fillOpacity: 1,
        weight: 3
      })
        .bindPopup(`Destino: ${escapeHtml(destination.name)}`)
        .addTo(layers.extras);
    }

    if (routeGeo) {
      L.geoJSON(routeGeo, { style: { color: "#2f6fed", weight: 5, opacity: 0.9 } }).addTo(
        layers.extras
      );
    }

    (flights || []).forEach((f) => {
      if (!Number.isFinite(f.lat) || !Number.isFinite(f.lon)) return;
      const heading = Number.isFinite(f.heading) ? f.heading : 0;
      const icon = L.divIcon({
        className: "",
        html: `<div style="transform:rotate(${heading}deg);font-size:16px">✈️</div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      L.marker([f.lat, f.lon], { icon })
        .bindPopup(`<strong>${escapeHtml(f.callsign || "Vuelo")}</strong>`)
        .addTo(layers.extras);
    });
  }, [ready, origin, destination, routeGeo, flights]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={ref} className="leaflet-host" />;
}
