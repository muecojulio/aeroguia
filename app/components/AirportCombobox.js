"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "./interactions";

// Combobox con búsqueda: filtra mientras se escribes (la lista llega ya
// filtrada desde la app), mantiene la semántica accesible de
// combobox/listbox y se puede usar entero con teclado.
//   - Flechas arriba/abajo: mueven la opción activa (aria-activedescendant)
//   - Inicio/Fin: primera/última opción
//   - Enter: confirma la opción activa · Escape: cierra la lista
//   - Alto limitado con scroll propio; fuera del campo cierra la lista.
export default function AirportCombobox({
  value,
  onChange,
  results,
  onSelect,
  onSubmit,
  selectedKey,
  ready,
  open,
  setOpen
}) {
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const reduced = useReducedMotion();
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const inputId = `${uid}-input`;
  const optionId = (i) => `${uid}-opt-${i}`;
  // La lista puede encogerse; la opción activa nunca debe quedar fuera de rango.
  const safeActive = results.length ? Math.min(active, results.length - 1) : 0;

  useEffect(() => {
    setActive(0);
  }, [value]);

  // Mantiene visible la opción activa dentro de la lista.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current && listRef.current.children[safeActive];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    }
  }, [safeActive, open, results.length, reduced]);

  // Cierra al tocar/flickear fuera del campo.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, setOpen]);

  function choose(a) {
    onSelect(a);
    setOpen(false);
    if (inputRef.current) inputRef.current.focus();
  }

  function handleChange(e) {
    onChange(e.target.value);
    // Siempre reabre: al escribir desde otra pestaña la app cambia de
    // sección (que cierra el combo) y la lista debe seguir visible.
    setOpen(true);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (!results.length) return;
      const n = results.length;
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
      return;
    }
    if (!open) {
      // Enter con la lista cerrada: deja que el formulario seleccione el primero.
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(Math.max(0, results.length - 1));
    } else if (e.key === "Enter") {
      if (results[safeActive]) {
        e.preventDefault();
        choose(results[safeActive]);
      } else {
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  const noMatch = open && !results.length;

  return (
    <form
      className="search combo"
      ref={rootRef}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="combo-field">
        <label className="sr-only" htmlFor={inputId}>
          Buscar aeropuerto por ciudad, código IATA o ICAO
        </label>
        <input
          id={inputId}
          ref={inputRef}
          role="combobox"
          autoComplete="off"
          spellCheck="false"
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onPointerDown={() => {
            if (!open) setOpen(true);
          }}
          placeholder="Aeropuerto, ciudad o código"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open && results.length ? optionId(safeActive) : undefined}
        />
        <button
          type="button"
          className="combo-toggle"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-label={open ? "Ocultar opciones de aeropuerto" : "Mostrar opciones de aeropuerto"}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true">{open ? "▾" : "▸"}</span>
        </button>

        {open && results.length > 0 && (
          <ul id={listboxId} role="listbox" className="combo-list" aria-label="Aeropuertos encontrados" ref={listRef}>
            {results.map((a, i) => (
              <li
                key={a.iata + a.icao}
                id={optionId(i)}
                role="option"
                aria-selected={selectedKey === a.iata}
                className={`${i === safeActive ? "is-active" : ""} ${selectedKey === a.iata ? "is-selected" : ""}`.trim()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(a)}
              >
                <span className="combo-iata">{a.iata}</span>
                <span className="combo-text">
                  <strong>{a.city || a.name}</strong>
                  <span className="muted">{a.name}</span>
                </span>
                {selectedKey === a.iata && (
                  <span className="combo-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {noMatch && (
          <div id={listboxId} className="combo-empty" role="status">
            {ready ? <>No hay aeropuertos que coincidan con «{value}».</> : <>Cargando la lista de aeropuertos…</>}
          </div>
        )}

        <p className="sr-only" role="status">
          {open ? `${results.length} aeropuertos disponibles${value ? ` para «${value}»` : ""}.` : ""}
        </p>
      </div>
      <button type="submit" className="combo-submit">
        Buscar
      </button>
    </form>
  );
}
