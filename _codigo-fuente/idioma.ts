// Idioma de la interfaz (español / inglés). Se elige en la pantalla de inicio y se guarda en el navegador.
export type Idioma = 'es' | 'en';
export const IDIOMA: Idioma = (() => {
  try { return JSON.parse(localStorage.getItem('arena.idioma') || '"es"') === 'en' ? 'en' : 'es'; } catch { return 'es'; }
})();
export const EN = IDIOMA === 'en';
/** Devuelve el texto en el idioma elegido */
export const tr = (es: string, en: string) => EN ? en : es;
export function cambiarIdioma(i: Idioma) {
  try { localStorage.setItem('arena.idioma', JSON.stringify(i)); } catch { /* sin almacenamiento */ }
  location.reload();
}
