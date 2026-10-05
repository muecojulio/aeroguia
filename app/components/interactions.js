"use client";

// Sistema reutilizable de interacciones: hooks y contenedores compartidos
// por pestañas, carruseles, chips y gestos. Sin dependencias externas.
import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Media queries accesibles al cliente                                 */
/* ------------------------------------------------------------------ */

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [query]);
  return matches;
}

export function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/* ------------------------------------------------------------------ */
/* Carriles horizontales (scroll nativo + indicadores de desbordamiento) */
/* ------------------------------------------------------------------ */

// Centra `item` dentro de `rail` solo si queda fuera de la zona visible.
// Respeta `prefers-reduced-motion` (scroll inmediato en lugar de suave).
export function centerRailItem(rail, item, reduced) {
  if (!rail || !item || rail.scrollWidth <= rail.clientWidth + 2) return;
  const railRect = rail.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const pad = 8;
  if (itemRect.left >= railRect.left + pad && itemRect.right <= railRect.right - pad) return;
  const target = rail.scrollLeft + (itemRect.left - railRect.left) - (rail.clientWidth - itemRect.width) / 2;
  rail.scrollTo({ left: Math.max(0, target), behavior: reduced ? "auto" : "smooth" });
}

// Gestiona un carril: calcula si hay contenido desbordado a izquierda/derecha
// y evita que un arrastre para desplazar active accidentalmente una opción.
export function useRail() {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const guard = useRef({ x: null, scroll: 0, moved: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const start = el.scrollLeft > 2;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  // Recalcula tras cada render (el contenido del carril puede cambiar).
  useEffect(() => {
    update();
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onChange = () => update();
    el.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onChange);
      ro.observe(el);
    }
    return () => {
      el.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
      if (ro) ro.disconnect();
    };
  }, [update]);

  const railProps = {
    onPointerDownCapture: (e) => {
      guard.current = { x: e.clientX, scroll: ref.current ? ref.current.scrollLeft : 0, moved: false, movedAt: 0 };
    },
    onPointerMoveCapture: (e) => {
      const g = guard.current;
      const el = ref.current;
      if (g.x === null || !el || g.moved) return;
      if (Math.abs(e.clientX - g.x) > 8 || Math.abs(el.scrollLeft - g.scroll) > 8) {
        g.moved = true;
        g.movedAt = performance.now();
      }
    },
    onPointerUpCapture: () => {
      guard.current.x = null;
    },
    onClickCapture: (e) => {
      const g = guard.current;
      // Solo descarta el clic inmediato posterior a un arrastre; un clic
      // llegado después (p. ej. teclado) no debe quedar bloqueado.
      const suppress = g.moved && performance.now() - (g.movedAt || 0) < 600;
      g.moved = false;
      if (suppress) {
        e.stopPropagation();
        e.preventDefault();
      }
    }
  };

  return { ref, edges, railProps, update };
}

// Carril accesible: contenedor con scrollbar oculta solo visualmente,
// bordes difuminados cuando hay contenido fuera de vista, nombre de grupo
// y centrado automático de la opción seleccionada cuando cambia `scrollTo`.
export function Rail({ label, className = "", variant, scrollTo, wrapClassName = "", children }) {
  const { ref, edges, railProps } = useRail();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (scrollTo == null) return;
    const rail = ref.current;
    if (!rail) return;
    const key = String(scrollTo).replace(/["\\]/g, "\\$&");
    const item = rail.querySelector(`[data-key="${key}"]`);
    if (item) centerRailItem(rail, item, reduced);
    // Solo al cambiar la selección: evita "tirar" del carril mientras el
    // usuario se desplaza o escribe en la búsqueda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTo, reduced]);

  return (
    <div className={`rail-wrap ${edges.start ? "edge-start" : ""} ${edges.end ? "edge-end" : ""} ${wrapClassName}`.trim()}>
      <div
        {...railProps}
        ref={ref}
        className={`rail ${variant === "grid" ? "grid-rail" : ""} ${className}`.trim()}
        role="group"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gesto horizontal con bloqueo de eje para cambiar de sección          */
/* ------------------------------------------------------------------ */

// El gesto solo se considera horizontal cuando el desplazamiento lateral
// supera claramente al vertical (proporción ~1,2) con distancia o
// velocidad suficientes; si empieza sobre un control interactivo, un mapa
// o un carril, se ignora y el navegador/gestos nativos siguen su curso.
const SWIPE_EXCLUDE = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "summary",
  "details",
  '[role="tablist"]',
  '[role="radiogroup"]',
  '[role="listbox"]',
  '[role="combobox"]',
  "[data-no-swipe]",
  ".leaflet-container",
  ".leaflet-marker-icon",
  ".map-full",
  ".map-sheet",
  ".rail",
  ".swipe-card",
  ".combo-list",
  "iframe",
  "video",
  "audio",
  '[contenteditable="true"]'
].join(",");

const RATIO = 1.2;
const MIN_START = 12;

export function useSwipeNav({ onSwipe, disabled = false }) {
  const state = useRef(null);
  const suppressUntil = useRef(0);
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  const onPointerDown = (e) => {
    if (disabled) return;
    if (e.pointerType === "mouse") return; // cambio de sección: gesto táctil
    if (!e.isPrimary) return;
    if (e.target instanceof Element && e.target.closest(SWIPE_EXCLUDE)) return;
    state.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      t0: performance.now(),
      x: e.clientX,
      t: performance.now(),
      vx: 0,
      axis: null,
      width: e.currentTarget.clientWidth || 0
    };
  };

  const onPointerMove = (e) => {
    const s = state.current;
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x0;
    const dy = e.clientY - s.y0;
    if (!s.axis) {
      if (Math.abs(dx) < MIN_START && Math.abs(dy) < MIN_START) return;
      if (Math.abs(dx) >= MIN_START && Math.abs(dx) > Math.abs(dy) * RATIO) {
        s.axis = "h";
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* captura opcional */
        }
      } else {
        s.axis = "v"; // gesto vertical: el navegador controla el scroll
        state.current = null;
      }
      return;
    }
    if (s.axis !== "h") return;
    const now = performance.now();
    if (now - s.t >= 32) {
      s.vx = (e.clientX - s.x) / (now - s.t);
      s.x = e.clientX;
      s.t = now;
    }
  };

  const end = (e) => {
    const s = state.current;
    state.current = null;
    if (!s || (e && e.pointerId !== s.id) || s.axis !== "h") return;
    const dist = e ? e.clientX - s.x0 : s.x - s.x0;
    const threshold = Math.max(56, Math.round(s.width * 0.18));
    const quick = Math.abs(dist) >= 26 && Math.abs(s.vx) >= 0.45;
    if (Math.abs(dist) < threshold && !quick) return;
    // Ventana corta: descarta el clic accidental del propio gesto, sin
    // bloquear un toque deliberado justo después.
    suppressUntil.current = performance.now() + 350;
    if (dist < 0) onSwipeRef.current?.("next");
    else onSwipeRef.current?.("prev");
  };

  const handlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp: end,
    onPointerCancel: () => {
      state.current = null;
    },
    onClickCapture: (e) => {
      if (performance.now() < suppressUntil.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    }
  };

  return handlers;
}
