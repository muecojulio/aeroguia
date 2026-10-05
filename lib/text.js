// Utilidades de texto para búsquedas en español.
// `foldText` normaliza a minúsculas sin acentos ni diacríticos para que
// «jose», «José» y «JOSE» coincidan. Se aplica igual al texto y a la
// consulta, así que «espana» encuentra «España» (ñ → n en ambos lados).
export function foldText(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .normalize("NFC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
