// Utilidades compartidas entre pantallas.
import {tr} from './idioma';
import {h, storage} from './util';
import {cargarEquipos, Equipo} from './equipos';
import {RESERVAS, Reserva} from './aleatorio';
import {musica} from './musica';

export const app = document.getElementById('app')!;

let limpiar: (() => void) | null = null;
export function setLimpiar(f: (() => void) | null) { limpiar = f; }
export function cambiarPantalla(f: () => void) {
  const l = limpiar; limpiar = null;
  try { l?.(); } catch (e) { console.error(e); }
  window.scrollTo(0, 0);
  musica('menu');   // si la pantalla nueva es un combate, el combate la cambia
  f();
}

/** Navegación entre pantallas (se rellena en app.ts para evitar dependencias circulares) */
export const nav: {inicio: () => void, online: () => void, practica: () => void, equipos: () => void, pokedex: () => void, avatares: () => void, creditos: () => void, pbs: () => void, perfil: () => void, historia: () => void} = {
  inicio() {}, online() {}, practica() {}, equipos() {}, pokedex() {}, avatares() {}, creditos() {}, pbs() {}, perfil() {}, historia() {},
};

export function nombreJugador(): string { return storage.get('cnx.nombre', ''); }

export const VERSION_DATOS = (() => {
  const w = window as any;
  const txt = JSON.stringify([w.DATOS_POKEMON, Object.keys(w.DATOS_HABILIDADES || {}), Object.keys(w.DATOS_MOVIMIENTOS || {}), Object.keys(w.DATOS_OBJETOS || {})]);
  let hsh = 0;
  for (let i = 0; i < txt.length; i++) hsh = (hsh * 31 + txt.charCodeAt(i)) | 0;
  return (hsh >>> 0).toString(36);
})();

const ETIQUETA_FORMATO: {[k: string]: string} = {singles: tr('Individual', 'Singles'), doubles: tr('Dobles', 'Doubles'), draft: 'Draft'};

/** Desplegable con los equipos guardados. soloDraft: muestra solo plantillas (o equipos de 6+). */
export function selectorEquipo(filtro: 'normal' | 'draft' | null, onCambio?: () => void) {
  const todos = cargarEquipos();
  const equipos = todos.filter(e => !filtro || (filtro === 'draft' ? e.sets.length >= 6 : e.formato !== 'draft'));
  const sel = h('select', {class: 'select'}, ...equipos.map(e => h('option', {value: e.id},
    tr(`${e.nombre} (${ETIQUETA_FORMATO[e.formato] || ''}, ${e.sets.length} Pokémon)`, `${e.nombre} (${ETIQUETA_FORMATO[e.formato] || ''}, ${e.sets.length} Pokémon)`))));
  const clave = filtro === 'draft' ? 'cnx.ultimaPlantilla' : 'cnx.ultimoEquipo';
  const ultimo = storage.get(clave, '');
  if (equipos.some(e => e.id === ultimo)) sel.value = ultimo;
  sel.addEventListener('change', () => { storage.set(clave, sel.value); onCambio?.(); });
  return {el: sel, equipo: (): Equipo | undefined => cargarEquipos().find(e => e.id === sel.value), vacio: !equipos.length};
}

export function selectorReserva(onCambio?: () => void) {
  const el = h('select', {class: 'select'}, ...Object.entries(RESERVAS).map(([k, v]) => h('option', {value: k}, v)));
  el.value = storage.get('cnx.reserva', 'mezcla');
  el.addEventListener('change', () => { storage.set('cnx.reserva', el.value); onCambio?.(); });
  return {el, valor: () => el.value as Reserva};
}

export type TipoSerie = 'uno' | 'bo3' | 'draft';
export const SERIES: {[k in TipoSerie]: string} = {
  uno: tr('Un combate', 'Single battle'),
  bo3: tr('Al mejor de 3', 'Best of 3'),
  draft: tr('Draft al mejor de 3 (plantilla de hasta 12, eliges 6 antes de cada combate)', 'Draft, best of 3 (roster of up to 12, pick 6 before each battle)'),
};
export function selectorSerie(valor: TipoSerie, onCambio: (v: TipoSerie) => void) {
  const el = h('select', {class: 'select'}, ...Object.entries(SERIES).map(([k, v]) => h('option', {value: k, selected: k === valor}, v)));
  el.addEventListener('change', () => onCambio(el.value as TipoSerie));
  return el;
}

export function campo(etq: string, control: any, ayuda?: string) {
  return h('label', {class: 'campo'}, h('span', {class: 'etq'}, etq), control, ayuda ? h('small', {class: 'ayuda'}, ayuda) : null);
}
