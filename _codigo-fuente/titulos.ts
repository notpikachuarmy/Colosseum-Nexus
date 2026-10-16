// Títulos y logros: se comprueban al terminar un combate y al cambiar la colección.
import {tr} from './idioma';
import {h, storage, toast, dex} from './util';
import {INFO} from './mod';
import {perfil, nivelDe, TipoNivel} from './nivel';
import {AVATARES, coleccion, cambiarColeccion} from './avatares';
import type {Estado} from './estado';

export interface Titulo {id: string; nombre: string; texto: string; pv: number}
const W: any = window;
export const TITULOS: Titulo[] = ((W.TITULOS || []) as any[]).filter(t => t && t.id).map(t => ({
  id: String(t.id), nombre: String(t.nombre || t.id), texto: String(t.texto || ''), pv: Math.max(0, Math.floor(+t.pv || 0)),
}));
export const tituloDe = (id: string | undefined | null) => TITULOS.find(t => t.id === id);

// ------------------------------------------------------------------ guardado --
/** conseguidos: títulos ya ganados (una vez) · equipado: el que se enseña en el VS ('' = ninguno)
 *  contadores: victorias que cuentan para cada logro · premiados: combates ya contados */
interface EstadoTitulos {conseguidos: string[]; equipado: string; contadores: {[k: string]: number}; poderes: string[]; premiados: string[]}
const CLAVE = 'cnx.titulos.v1';
function leer(): EstadoTitulos {
  const g = storage.get<any>(CLAVE, {});
  const lista = (x: any) => Array.isArray(x) ? x.filter((y: any) => typeof y === 'string') : [];
  const contadores: {[k: string]: number} = {};
  for (const [k, v] of Object.entries<any>(g.contadores || {})) if (Number.isFinite(+v) && +v > 0) contadores[k] = Math.floor(+v);
  const conseguidos = lista(g.conseguidos);
  return {conseguidos, equipado: typeof g.equipado === 'string' && conseguidos.includes(g.equipado) ? g.equipado : '', contadores, poderes: lista(g.poderes), premiados: lista(g.premiados).slice(-200)};
}
const guardar = (e: EstadoTitulos) => storage.set(CLAVE, e);

export const titulosConseguidos = () => leer().conseguidos;
export const tituloEquipado = () => leer().equipado;
export const contador = (k: string) => leer().contadores[k] || 0;
export function equiparTitulo(id: string) {
  const e = leer();
  if (id && !e.conseguidos.includes(id)) return;
  e.equipado = id;
  guardar(e);
}

/** Da un título (una sola vez) y su premio en PV. Devuelve true si es nuevo. */
export function darTitulo(id: string): boolean {
  const t = tituloDe(id);
  if (!t) return false;
  const e = leer();
  if (e.conseguidos.includes(id)) return false;
  e.conseguidos.push(id);       // se apunta antes de dar el premio: nunca se repite
  guardar(e);
  if (t.pv) cambiarColeccion(c => { c.pv += t.pv; });
  toast(tr(`¡Nuevo título: «${t.nombre}»!${t.pv ? ` +${t.pv} PV` : ''}`, `New title: "${t.nombre}"!${t.pv ? ` +${t.pv} PV` : ''}`), 4000);
  return true;
}

// ------------------------------------------------------- comprobaciones fijas --
const ETIQUETA_MAESTRO: {[id: string]: string} = {'maestro-kanto': 'Kanto', 'maestro-johto': 'Johto', 'maestro-hoenn': 'Hoenn'};
/** Logros que dependen de tu nivel, rachas o colección (se pueden revisar en cualquier momento) */
export function revisarTitulos() {
  const c = coleccion();
  const del = AVATARES.filter(a => a.origen === 'gacha');
  const conds: {[id: string]: boolean} = {
    'primera-victoria': perfil('online').v >= 1,
    'veterano-online': nivelDe('online') >= 10,
    'as-online': nivelDe('online') >= 20,
    'campeon-online': nivelDe('online') >= 50,
    'tryhard': nivelDe('online') >= 75,
    'cazaholos': perfil('ia').v >= 25,
    'imparable': perfil('online').rachaMax >= 5,
    'leyenda-invicta': perfil('online').rachaMax >= 10,
    'completista': del.length > 0 && del.every(a => c.tengo[a.id]),
    'cliente-vip': AVATARES.filter(a => a.origen === 'tienda' && c.tengo[a.id]).length >= 3,
  };
  for (const [id, et] of Object.entries(ETIQUETA_MAESTRO)) {
    const de = del.filter(a => a.etiquetas.includes(et));
    conds[id] = de.length > 0 && de.every(a => c.tengo[a.id]);
  }
  const ya = new Set(leer().conseguidos);
  for (const [id, ok] of Object.entries(conds)) if (ok && !ya.has(id)) darTitulo(id);
}

// ---------------------------------------------------------- análisis del combate --
const REGIONES: [string, number, number][] = [
  ['kanto', 1, 151], ['johto', 152, 251], ['hoenn', 252, 386], ['sinnoh', 387, 493], ['teselia', 494, 649],
  ['kalos', 650, 721], ['alola', 722, 809], ['galar', 810, 898], ['hisui', 899, 905], ['paldea', 906, 1025],
];
const FORMA_REGION: {[f: string]: string} = {Alola: 'alola', Galar: 'galar', Hisui: 'hisui', Paldea: 'paldea'};
/** Región de una especie (las formas regionales cuentan para su región; Fakemon y Jagara, para ninguna) */
export function regionDe(especie: string): string | null {
  const sp = dex().species.get(especie);
  if (!sp.exists || INFO.custom.has(sp.id)) return null;
  const forma = (sp.forme || '').split('-')[0];
  if (FORMA_REGION[forma]) return FORMA_REGION[forma];
  const r = REGIONES.find(([, a, b]) => sp.num >= a && sp.num <= b);
  return r ? r[0] : null;
}
const esRegional = (especie: string) => {
  const sp = dex().species.get(especie);
  return sp.exists && (INFO.regionales.has(sp.id) || !!FORMA_REGION[(sp.forme || '').split('-')[0]]);
};
const esCustom = (especie: string) => INFO.custom.has(dex().species.get(especie).id);

/** Qué cuenta un combate ganado para los logros de estilo (se usa también en las pruebas) */
export function contarCombate(especies: string[], tamanoRival: number, poderes: string[], debilitados: number, remontada: boolean, individual: boolean): string[] {
  const k: string[] = [];
  if (!especies.length) return k;
  if (especies.every(esRegional)) k.push('maestro-regional');
  if (especies.every(esCustom)) k.push('orgullo-jagara');
  if (!especies.some(esCustom)) k.push('purista');
  const regiones = new Set(especies.map(regionDe));
  if (regiones.size === 1) { const r = [...regiones][0]; if (r) k.push('orgullo-' + r); }
  if (especies.length === 6) {
    const tipos = especies.map(e => dex().species.get(e).types);
    if (tipos[0].some(t => tipos.every(ts => ts.includes(t)))) k.push('monotipo');
  }
  if (remontada) k.push('#remontada');
  if (individual && especies.length === 6 && tamanoRival === 6 && debilitados === 0) k.push('#intocable');
  for (const p of poderes) k.push('poder:' + p);
  return k;
}
const OBJETIVO: {[id: string]: number} = {'maestro-regional': 5, 'orgullo-jagara': 5, 'purista': 5, 'monotipo': 3};

/**
 * Al terminar un combate válido (3+ turnos). gano: si lo has ganado.
 * Cada combate cuenta una sola vez (idCombate).
 */
export function titulosCombate(tipo: TipoNivel, gano: boolean, estado: Estado | undefined, idCombate: string) {
  const e = leer();
  if (idCombate && e.premiados.includes(idCombate)) return;
  if (idCombate) e.premiados.push(idCombate);
  if (gano && estado) {
    const yo = estado.yo, rival = estado.rival;
    const mio = estado.lados[yo];
    const debilitados = mio.equipo.filter(m => m.fainted).length;
    const claves = contarCombate(estado.especiesIniciales.length ? estado.especiesIniciales : mio.equipo.map(m => m.species),
      estado.lados[rival].tamano, [...estado.poderes[yo]], debilitados, estado.remontada, estado.gametype === 'singles');
    for (const k of claves) {
      if (k.startsWith('poder:')) { const p = k.slice(6); if (!e.poderes.includes(p)) e.poderes.push(p); }
      else if (!k.startsWith('#')) e.contadores[k] = (e.contadores[k] || 0) + 1;
    }
    guardar(e);
    for (const k of claves) {
      if (k.startsWith('#')) darTitulo(k.slice(1));
      else if (!k.startsWith('poder:') && (e.contadores[k] || 0) >= (OBJETIVO[k] || 5)) darTitulo(k);
    }
    if (['mega', 'z', 'dynamax', 'tera'].every(p => e.poderes.includes(p))) darTitulo('poder-total');
  } else guardar(e);
  revisarTitulos();
}

/** Al ganar una serie (al mejor de 3 o draft). idSerie evita contarla dos veces. */
export function titulosSerie(draft: boolean, idSerie: string) {
  const e = leer();
  if (e.premiados.includes(idSerie)) return;
  e.premiados.push(idSerie);
  const k = draft ? 'series-draft' : 'series-bo3';
  e.contadores[k] = (e.contadores[k] || 0) + 1;
  // Una serie de draft también es una serie al mejor de 3
  if (draft) e.contadores['series-bo3'] = (e.contadores['series-bo3'] || 0) + 1;
  guardar(e);
  if ((e.contadores['series-draft'] || 0) >= 3) darTitulo('estratega');
  if ((e.contadores['series-bo3'] || 0) >= 5) darTitulo('al-mejor-de-tres');
}

/** Progreso de un logro de contador, para enseñarlo en el perfil ("3/5") */
export function progresoTitulo(id: string): string {
  const e = leer();
  if (OBJETIVO[id] || id.startsWith('orgullo-')) return `${Math.min(e.contadores[id] || 0, OBJETIVO[id] || 5)}/${OBJETIVO[id] || 5}`;
  if (id === 'estratega') return `${Math.min(e.contadores['series-draft'] || 0, 3)}/3`;
  if (id === 'al-mejor-de-tres') return `${Math.min(e.contadores['series-bo3'] || 0, 5)}/5`;
  if (id === 'poder-total') return `${e.poderes.length}/4`;
  if (id === 'cazaholos') return `${Math.min(perfil('ia').v, 25)}/25`;
  return '';
}

/** Selector de título para el perfil */
export function selectorTitulo(alCambiar?: () => void) {
  const e = leer();
  const sel = h('select', {class: 'select select-sm', 'aria-label': tr('Título que se enseña', 'Title shown')},
    h('option', {value: ''}, tr('Sin título', 'No title')),
    ...TITULOS.filter(t => e.conseguidos.includes(t.id)).map(t => h('option', {value: t.id, selected: e.equipado === t.id}, t.nombre)));
  sel.addEventListener('change', () => { equiparTitulo(sel.value); alCambiar?.(); });
  return sel;
}
