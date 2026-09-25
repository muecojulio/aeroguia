const store = new Map();

export function cacheGet(key) {
  const row = store.get(key);
  if (!row) return null;
  if (Date.now() > row.exp) {
    store.delete(key);
    return null;
  }
  return row.value;
}

export function cacheSet(key, value, ttlMs) {
  store.set(key, { value, exp: Date.now() + ttlMs });
  if (store.size > 400) {
    const first = store.keys().next().value;
    store.delete(first);
  }
}

export function cacheKey(parts) {
  return parts.map((p) => String(p ?? "")).join("|");
}
