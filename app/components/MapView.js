"use client";

import { useEffect, useRef } from "react";

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
  onPickAirport
}) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({});
  const pickRef = useRef({ pickingOrigin, onPickOrigin, onPickAirport });

  pickRef.current = { pickingOrigin, onPickOrigin, onPickAirport };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current || mapRef.current) return;

      const map = L.map(ref.current, {
        zoomControl: true,
        attributionControl: false,
        tap: true
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(map);
      map.setView([airport.lat, airport.lon], 14);
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
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !airport) return;
    map.setView([airport.lat, airport.lon], 14);
    setTimeout(() => map.invalidateSize(), 60);
  }, [airport?.iata, airport?.lat, airport?.lon]);

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
    if (!map || !layers.L) return;
    const L = layers.L;
    layers.markers.clearLayers();
    const visible = filter === "all" ? pois : pois.filter((p) => p.category === filter);
    visible.forEach((p) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="map-pin" style="background:${p.color}">${p.emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      const marker = L.marker([p.lat, p.lon], { icon }).bindPopup(
        `<strong>${p.name}</strong><br/>${p.label || ""}`
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
  }, [pois, filter, airport?.iata]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers.L || !layers.airports) return;
    const L = layers.L;
    layers.airports.clearLayers();
    const list = nearbyAirports || [];
    list.forEach((a) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="map-pin airport">${a.iata}</div>`,
        iconSize: [44, 28],
        iconAnchor: [22, 14]
      });
      const marker = L.marker([a.lat, a.lon], { icon, zIndexOffset: 400 }).bindPopup(
        `<strong>${a.iata}</strong><br/>${a.name}`
      );
      marker.on("click", (ev) => {
        L.DomEvent.stopPropagation(ev);
        const cur = pickRef.current;
        if (cur.pickingOrigin && cur.onPickAirport) {
          cur.onPickAirport(a);
        } else if (cur.onPickAirport) {
          cur.onPickAirport(a);
        }
      });
      marker.addTo(layers.airports);
    });
  }, [nearbyAirports]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers.L) return;
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
        .bindPopup(`Inicio: ${origin.name}`)
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
        .bindPopup(`Destino: ${destination.name}`)
        .addTo(layers.extras);
    }

    if (routeGeo) {
      L.geoJSON(routeGeo, { style: { color: "#2f6fed", weight: 5, opacity: 0.9 } }).addTo(
        layers.extras
      );
    }

    (flights || []).forEach((f) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="transform:rotate(${f.heading || 0}deg);font-size:16px">✈️</div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      L.marker([f.lat, f.lon], { icon })
        .bindPopup(`<strong>${f.callsign || "Vuelo"}</strong>`)
        .addTo(layers.extras);
    });
  }, [origin, destination, routeGeo, flights]);

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
