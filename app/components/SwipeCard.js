"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "./interactions";

// Tarjeta con acciones contextuales que se revelan deslizando horizontalmente.
// Garantías de accesibilidad y comportamiento:
//   - El swipe nunca es la única vía: hay un botón «⋯» visible con
//     aria-expanded que abre/cierra las mismas acciones.
//   - En escritorio (pointer fino) las acciones se muestran directamente y
//     el arrastre se desactiva.
//   - Bloqueo de eje (proporción 1,2): el scroll vertical de la página es
//     del navegador; solo se arrastra cuando el gesto es claramente
//     horizontal (touch-action: pan-y en CSS).
//   - Los controles anidados marcados con data-no-swipe (el propio «⋯» y
//     los botones de acción) no inician el arrastre; el clic posterior a un
//     arrastre se descarta para no activar la tarjeta por accidente.
//   - Mientras están ocultas, las acciones llevan `inert` + aria-hidden:
//     fuera del orden de foco y sin anuncios.
const RATIO = 1.2;
const MIN_START = 10;

export default function SwipeCard({ label, actions = [], onPrimary, primaryDisabled, className = "", children }) {
  const cardRef = useRef(null);
  const actionsRef = useRef(null);
  const toggleRef = useRef(null);
  const drag = useRef(null);
  const suppress = useRef(0);
  const [open, setOpen] = useState(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [actionsW, setActionsW] = useState(0);
  const desktop = useMediaQuery("(hover: hover) and (pointer: fine)");
  const revealed = desktop || open;

  // Ancho real del panel de acciones (para limitar el arrastre).
  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const measure = () => setActionsW(el.offsetWidth || 0);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [actions.length, desktop]);

  // Mantiene sincronizado el desplazamiento con el estado abierto/cerrado.
  useEffect(() => {
    if (desktop) setDx(0);
    else setDx(open ? -actionsW : 0);
  }, [open, actionsW, desktop]);

  // Al abrir, cerrar al tocar fuera de la tarjeta.
  useEffect(() => {
    if (!open || desktop) return;
    const onDown = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, desktop]);

  function onPointerDown(e) {
    if (desktop) return;
    if (e.pointerType === "mouse") return;
    if (!e.isPrimary) return;
    if (e.target instanceof Element && e.target.closest("[data-no-swipe], a, input, select, textarea")) return;
    drag.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      base: open ? -actionsW : 0,
      x: e.clientX,
      t: performance.now(),
      vx: 0,
      axis: null
    };
  }

  function onPointerMove(e) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const ddx = e.clientX - d.x0;
    const ddy = e.clientY - d.y0;
    if (!d.axis) {
      if (Math.abs(ddx) < MIN_START && Math.abs(ddy) < MIN_START) return;
      if (Math.abs(ddx) >= MIN_START && Math.abs(ddx) > Math.abs(ddy) * RATIO) {
        d.axis = "h";
        setDragging(true);
        try {
          cardRef.current && cardRef.current.setPointerCapture(e.pointerId);
        } catch {
          /* captura opcional */
        }
      } else {
        d.axis = "v"; // vertical: el navegador mantiene el scroll
        drag.current = null;
      }
      return;
    }
    if (d.axis !== "h") return;
    const now = performance.now();
    if (now - d.t >= 32) {
      d.vx = (e.clientX - d.x) / (now - d.t);
      d.x = e.clientX;
      d.t = now;
    }
    const next = Math.max(-actionsW, Math.min(0, d.base + (e.clientX - d.x0)));
    setDx(next);
  }

  function endDrag(e) {
    const d = drag.current;
    drag.current = null;
    if (!d || (e && e.pointerId !== d.id) || d.axis !== "h") return;
    setDragging(false);
    const dist = e ? e.clientX - d.x0 : 0;
    const moved = Math.abs(dist);
    if (moved > 8) suppress.current = performance.now() + 400;
    const half = Math.max(actionsW / 2, 40);
    const wasOpen = d.base < 0;
    const quickOpen = moved >= 16 && d.vx <= -0.5;
    const quickClose = moved >= 16 && d.vx >= 0.5;
    // Decide el estado final y lleva la tarjeta exactamente ahí:
    // si no hay umbral suficiente, vuelve a la posición coherente con `open`.
    const nextOpen = wasOpen ? !(moved >= half || quickClose) : moved >= half || quickOpen;
    setOpen(nextOpen);
    setDx(desktop ? 0 : nextOpen ? -actionsW : 0);
  }

  function onClickCapture(e) {
    if (performance.now() < suppress.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
      if (toggleRef.current) toggleRef.current.focus();
    }
  }

  function runPrimary() {
    if (performance.now() < suppress.current) return;
    setOpen(false);
    if (onPrimary) onPrimary();
  }

  const shift = desktop ? 0 : dx;
  const shownActions = revealed;

  return (
    <div
      ref={cardRef}
      className={`swipe-card ${open && !desktop ? "open" : ""} ${dragging ? "dragging" : ""} ${className}`.trim()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
        setDx(open ? -actionsW : 0);
      }}
      onClickCapture={onClickCapture}
      onKeyDown={onKeyDown}
    >
      <div
        className="swipe-actions"
        ref={actionsRef}
        aria-hidden={!shownActions}
        inert={!shownActions}
      >
        {actions.map((a, i) => (
          <button
            key={i}
            type="button"
            className="swipe-action"
            data-no-swipe
            onClick={() => {
              setOpen(false);
              if (a.onClick) a.onClick();
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="swipe-face" style={{ transform: `translateX(${shift}px)` }}>
        <button type="button" className="poi swipe-main" onClick={runPrimary} disabled={primaryDisabled}>
          {children}
        </button>
        {actions.length > 0 && (
          <button
            type="button"
            className="poi-more"
            ref={toggleRef}
            data-no-swipe
            aria-expanded={open}
            aria-label={
              (open ? "Ocultar acciones de " : "Mostrar acciones de ") + label
            }
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden="true">{open ? "×" : "⋯"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
