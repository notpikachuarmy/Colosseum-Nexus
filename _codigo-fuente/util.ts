// Utilidades de interfaz: sprites, nombres en español, colores de tipo.
import {toID} from 'pkmn-sim';
import {INFO, buildMod} from './mod';
import {EN} from './idioma';

export const dex = () => buildMod();

export const TIPOS_ES: {[t: string]: string} = {
  Normal: 'Normal', Fire: 'Fuego', Water: 'Agua', Grass: 'Planta', Electric: 'Eléctrico', Ice: 'Hielo',
  Fighting: 'Lucha', Poison: 'Veneno', Ground: 'Tierra', Flying: 'Volador', Psychic: 'Psíquico',
  Bug: 'Bicho', Rock: 'Roca', Ghost: 'Fantasma', Dragon: 'Dragón', Dark: 'Siniestro', Steel: 'Acero',
  Fairy: 'Hada', Stellar: 'Astral', '???': '???',
};
export const TIPO_COLOR: {[t: string]: string} = {
  Normal: '#9fa19f', Fire: '#e62829', Water: '#2980ef', Grass: '#3fa129', Electric: '#d6a800', Ice: '#3dcef3',
  Fighting: '#ff8000', Poison: '#9141cb', Ground: '#915121', Flying: '#81b9ef', Psychic: '#ef4179',
  Bug: '#91a119', Rock: '#afa981', Ghost: '#704170', Dragon: '#5060e1', Dark: '#624d4e', Steel: '#60a1b8',
  Fairy: '#ef70ef', Stellar: '#40b5a5', '???': '#68a090',
};
export const STATS_ES: {[s: string]: string} = {
  hp: 'PS', atk: 'Ataque', def: 'Defensa', spa: 'At. Esp.', spd: 'Def. Esp.', spe: 'Velocidad',
  accuracy: 'Precisión', evasion: 'Evasión',
};
export const STATS_CORTO: {[s: string]: string} = {hp: 'PS', atk: 'Atq', def: 'Def', spa: 'AtE', spd: 'DfE', spe: 'Vel'};
export const STATS_LARGO: {[s: string]: string} = {
  atk: 'el Ataque', def: 'la Defensa', spa: 'el Ataque Especial', spd: 'la Defensa Especial',
  spe: 'la Velocidad', accuracy: 'la Precisión', evasion: 'la Evasión',
};
export const CATEGORIA_ES: {[c: string]: string} = {Physical: 'Físico', Special: 'Especial', Status: 'Estado'};
export const ESTADOS_ES: {[s: string]: string} = {
  brn: 'QUE', par: 'PAR', slp: 'DOR', frz: 'CON', psn: 'ENV', tox: 'GRA',
};
export const ESTADO_COLOR: {[s: string]: string} = {
  brn: '#e2621f', par: '#c9a300', slp: '#8a8a9a', frz: '#3dcef3', psn: '#9141cb', tox: '#6c2a96',
};

export const NATURALEZAS: [string, string, string, string][] = [
  // [inglés, español, sube, baja]
  ['Hardy', 'Fuerte', '', ''], ['Lonely', 'Huraña', 'atk', 'def'], ['Brave', 'Audaz', 'atk', 'spe'],
  ['Adamant', 'Firme', 'atk', 'spa'], ['Naughty', 'Pícara', 'atk', 'spd'], ['Bold', 'Osada', 'def', 'atk'],
  ['Docile', 'Dócil', '', ''], ['Relaxed', 'Plácida', 'def', 'spe'], ['Impish', 'Agitada', 'def', 'spa'],
  ['Lax', 'Floja', 'def', 'spd'], ['Timid', 'Miedosa', 'spe', 'atk'], ['Hasty', 'Activa', 'spe', 'def'],
  ['Serious', 'Seria', '', ''], ['Jolly', 'Alegre', 'spe', 'spa'], ['Naive', 'Ingenua', 'spe', 'spd'],
  ['Modest', 'Modesta', 'spa', 'atk'], ['Mild', 'Afable', 'spa', 'def'], ['Quiet', 'Mansa', 'spa', 'spe'],
  ['Bashful', 'Tímida', '', ''], ['Rash', 'Alocada', 'spa', 'spd'], ['Calm', 'Serena', 'spd', 'atk'],
  ['Gentle', 'Amable', 'spd', 'def'], ['Sassy', 'Grosera', 'spd', 'spe'], ['Careful', 'Cauta', 'spd', 'spa'],
  ['Quirky', 'Rara', '', ''],
];

export function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]!));
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: {[k: string]: any} = {}, ...children: any[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, String(sv)); else (el.style as any)[sk] = sv;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function tipoBadge(t: string, small = false) {
  return h('span', {class: 'tipo' + (small ? ' tipo-sm' : ''), style: {background: TIPO_COLOR[t] || '#777'}}, TIPOS_ES[t] || t);
}

const fileKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Sprite de un Pokémon. kind: front | back */
export function spriteUrl(species: string, kind: 'front' | 'back' = 'front', shiny = false): {url: string, custom: boolean} {
  const d = dex();
  const sp = d.species.get(species);
  const id = sp.id;
  const custom = INFO.sprites[id];
  if (custom) {
    return {url: `sprites/custom/${kind}${shiny ? '-shiny' : ''}/${fileKey(custom)}.png`, custom: true};
  }
  const sid = sp.exists ? sp.spriteid : toID(species);
  const dir = 'gen5' + (kind === 'back' ? '-back' : '') + (shiny ? '-shiny' : '');
  return {url: `https://play.pokemonshowdown.com/sprites/${dir}/${sid}.png`, custom: false};
}

export function spriteImg(species: string, kind: 'front' | 'back' = 'front', shiny = false, cls = '') {
  const {url, custom} = spriteUrl(species, kind, shiny);
  const img = h('img', {src: url, alt: species, class: `sprite ${custom ? 'sprite-custom' : 'sprite-gen5'} ${cls}`, draggable: 'false'});
  img.addEventListener('error', () => {
    if (img.dataset.fallback) return;
    img.dataset.fallback = '1';
    // Si falla la versión shiny/espalda, prueba la normal de frente
    const alt = spriteUrl(species, 'front', false).url;
    if (alt !== img.src) img.src = alt; else img.src = 'img/missing.png';
  });
  return img;
}

/** Icono pequeño (para listas de equipo) */
export function iconImg(species: string, cls = '') {
  const d = dex();
  const sp = d.species.get(species);
  const custom = INFO.sprites[sp.id];
  if (custom) {
    const el = h('span', {class: 'icono icono-custom ' + cls, title: species});
    el.style.backgroundImage = `url("sprites/custom/icons/${fileKey(custom)}.png")`;
    return el;
  }
  const img = h('img', {class: 'icono icono-gen5 ' + cls, title: species, alt: species,
    src: `https://play.pokemonshowdown.com/sprites/gen5/${sp.exists ? sp.spriteid : toID(species)}.png`});
  img.addEventListener('error', () => { img.src = 'img/missing.png'; }, {once: true});
  return img;
}

export function itemIcon(item: string) {
  const id = toID(item);
  const d = dex();
  const it = d.items.get(id);
  if (!it.exists) return null;
  if (INFO.spritesObjeto[id]) {
    return h('img', {class: 'item-icono', src: `sprites/custom/items/${fileKey(INFO.spritesObjeto[id])}.png`, title: it.name, alt: ''});
  }
  if (INFO.objetos.has(id)) return h('span', {class: 'item-icono item-custom', title: it.name}, '✦');
  const n = (it as any).spritenum || 0;
  const el = h('span', {class: 'item-icono item-sheet', title: it.name});
  el.style.backgroundPosition = `-${(n % 16) * 24}px -${Math.floor(n / 16) * 24}px`;
  return el;
}

export function nombreVisible(species: string) {
  const d = dex();
  const sp = d.species.get(species);
  return INFO.nombresForma[sp.id] ? `${sp.baseSpecies} (${INFO.nombresForma[sp.id]})` : sp.name;
}

export function calcStat(stat: string, base: number, iv: number, ev: number, level: number, nature?: string) {
  if (stat === 'hp') {
    if (base === 1) return 1;
    return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
  }
  let v = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
  const n = NATURALEZAS.find(x => x[0] === nature);
  if (n && n[2] === stat) v = Math.floor(v * 1.1);
  if (n && n[3] === stat) v = Math.floor(v * 0.9);
  return v;
}

export function toast(msg: string, ms = 2600) {
  const t = h('div', {class: 'toast'}, msg);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('visible'));
  setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 400); }, ms);
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const storage = {
  get<T>(k: string, def: T): T {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; }
  },
  set(k: string, v: any) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
  },
};

// ------------------------------------------------------------ modo inglés --
if (EN) {
  for (const k of Object.keys(TIPOS_ES)) TIPOS_ES[k] = k;
  Object.assign(STATS_ES, {hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', accuracy: 'Accuracy', evasion: 'Evasion'});
  Object.assign(STATS_CORTO, {hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe'});
  Object.assign(STATS_LARGO, {atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', accuracy: 'accuracy', evasion: 'evasiveness'});
  Object.assign(CATEGORIA_ES, {Physical: 'Physical', Special: 'Special', Status: 'Status'});
  Object.assign(ESTADOS_ES, {brn: 'BRN', par: 'PAR', slp: 'SLP', frz: 'FRZ', psn: 'PSN', tox: 'TOX'});
  for (const n of NATURALEZAS) n[1] = n[0];
}

// ------------------------------------------------------- nombres en español --
const VACIO = {mov: {}, hab: {}, obj: {}};
const G: any = globalThis as any;
/** Datos en inglés de lo personalizado (nombreEN / descEN) para el modo English */
function ingles(tipo: 'mov' | 'hab' | 'obj', nombre: string): {nombreEN?: string, descEN?: string} | null {
  if (!EN) return null;
  if (tipo === 'mov') return G.DATOS_MOVIMIENTOS?.[nombre] || null;
  if (tipo === 'hab') return G.DATOS_HABILIDADES?.[nombre] || null;
  const o = G.DATOS_OBJETOS?.[nombre];
  if (o) return o;
  const mega = (G.DATOS_POKEMON || []).find((p: any) => p.megaPiedra === nombre);
  return mega ? {nombreEN: mega.megaPiedraEN} : null;
}
const TR = (): {mov: any, hab: any, obj: any} => EN ? VACIO : (globalThis as any).TRADUCCION_ES || VACIO;
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
/** id para búsquedas que ignora tildes */
export const idBusqueda = (s: string) => toID(sinTildes(s || ''));

export function nomMov(n: string): string {
  if (!n) return '';
  const mv = dex().moves.get(n);
  const en = ingles('mov', mv.name)?.nombreEN;
  if (en) return en;
  const t = TR().mov[mv.id];
  if (t) return t[0];
  if (/^Hidden Power /.test(n)) return EN ? n : 'Poder Oculto ' + (TIPOS_ES[n.slice(13)] || n.slice(13));
  return mv.exists ? mv.name : n;
}
export function descMov(n: string): string {
  const mv = dex().moves.get(n);
  const en = ingles('mov', mv.name)?.descEN;
  if (en) return en;
  return TR().mov[mv.id]?.[1] || mv.shortDesc || mv.desc || '';
}
export function nomHab(n: string): string {
  if (!n) return '';
  const a = dex().abilities.get(n);
  const en = ingles('hab', a.name)?.nombreEN;
  if (en) return en;
  return TR().hab[a.id]?.[0] || (a.exists ? a.name : n);
}
export function descHab(n: string): string {
  const a = dex().abilities.get(n);
  const en = ingles('hab', a.name)?.descEN;
  if (en) return en;
  return TR().hab[a.id]?.[1] || a.shortDesc || a.desc || '';
}
export function nomObj(n: string): string {
  if (!n) return '';
  const it = dex().items.get(n);
  const en = ingles('obj', it.name)?.nombreEN;
  if (en) return en;
  return TR().obj[it.id]?.[0] || (it.exists ? it.name : n);
}
export function descObj(n: string): string {
  const it = dex().items.get(n);
  const en = ingles('obj', it.name)?.descEN;
  if (en) return en;
  return TR().obj[it.id]?.[1] || it.shortDesc || it.desc || '';
}
/** Traduce efectos del protocolo: "item: Leftovers", "ability: Intimidate", "move: Protect" */
export function nomEfecto(e: string): string {
  if (!e) return '';
  const m = /^(item|ability|move): ?(.*)$/.exec(e);
  if (!m) {
    const mv = dex().moves.get(e);
    if (EN) {
      if (mv.exists) return nomMov(e);
      if (dex().abilities.get(e).exists) return nomHab(e);
      if (dex().items.get(e).exists) return nomObj(e);
      return e;
    }
    if (mv.exists && TR().mov[mv.id]) return TR().mov[mv.id][0];
    const ab = dex().abilities.get(e);
    if (ab.exists && TR().hab[ab.id]) return TR().hab[ab.id][0];
    const it = dex().items.get(e);
    if (it.exists && TR().obj[it.id]) return TR().obj[it.id][0];
    return e;
  }
  if (m[1] === 'item') return nomObj(m[2]);
  if (m[1] === 'ability') return nomHab(m[2]);
  return nomMov(m[2]);
}
