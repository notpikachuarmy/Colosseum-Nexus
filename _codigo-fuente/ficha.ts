// Fichas de información al pasar el ratón (como en Showdown).
import {tr} from './idioma';
import {Pkm} from './estado';
import {
  dex, h, tipoBadge, iconImg, itemIcon, nombreVisible, calcStat,
  TIPOS_ES, CATEGORIA_ES, ESTADOS_ES, ESTADO_COLOR, STATS_CORTO,
  nomMov, descMov, nomHab, descHab, nomObj,
} from './util';

let flotante: HTMLElement | null = null;
let ancla: HTMLElement | null = null;

/** Pantallas táctiles (móvil/tablet): no hay ratón para "pasar por encima" */
export const esTactil = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches;

/** Modo info del móvil: mientras está activo, tocar un ataque o un Pokémon muestra su ficha en vez de elegirlo */
let modoInfo = false;
const oyentesModo: ((v: boolean) => void)[] = [];
export function setModoInfo(v: boolean) { modoInfo = v; for (const f of oyentesModo) f(v); }
export function getModoInfo() { return modoInfo; }
export function alCambiarModoInfo(f: (v: boolean) => void) { oyentesModo.push(f); }

function caja() {
  if (!flotante) {
    flotante = h('div', {class: 'info-flotante', role: 'tooltip'});
    document.body.append(flotante);
    // En el móvil, tocar fuera de la ficha la cierra
    document.addEventListener('touchstart', e => {
      if (!flotante?.classList.contains('visible') || !flotante.classList.contains('hoja')) return;
      const t = e.target as Node;
      if (flotante.contains(t) || (ancla && ancla.contains(t))) return;
      ocultarInfo();
    }, {passive: true});
  }
  return flotante;
}

function colocar(x: number, y: number) {
  const f = caja();
  if (f.classList.contains('hoja')) { f.style.left = ''; f.style.top = ''; return; }
  const r = f.getBoundingClientRect();
  let left = x + 16, top = y - r.height - 12;
  if (left + r.width > window.innerWidth - 8) left = Math.max(8, x - r.width - 16);
  if (top < 8) top = Math.min(window.innerHeight - r.height - 8, y + 18);
  f.style.left = left + 'px';
  f.style.top = top + 'px';
}

export function ocultarInfo() {
  if (flotante) flotante.classList.remove('visible');
  ancla = null;
}

/** Muestra una ficha al pasar el ratón por encima. En el móvil: tocar (o mantener pulsado
 *  en los botones de ataque y cambio) abre la ficha como un panel abajo de la pantalla. */
export function adjuntarInfo(el: HTMLElement, contenido: () => HTMLElement | null) {
  const mostrar = (x: number, y: number, hoja = false) => {
    const c = contenido();
    if (!c) return;
    const f = caja();
    f.innerHTML = '';
    f.classList.toggle('hoja', hoja);
    if (hoja) f.append(h('button', {class: 'hoja-cerrar', 'aria-label': tr('Cerrar', 'Close'), onclick: () => ocultarInfo()}, '✕'));
    f.append(c);
    f.classList.add('visible');
    ancla = el;
    colocar(x, y);
  };
  if (!esTactil()) {
    el.addEventListener('mouseenter', e => mostrar(e.clientX, e.clientY));
    el.addEventListener('mousemove', e => { if (ancla === el) colocar(e.clientX, e.clientY); });
    el.addEventListener('mouseleave', () => { if (ancla === el) ocultarInfo(); });
    return;
  }
  const esAccion = el.tagName === 'BUTTON';
  el.classList.add('con-info');
  // Móvil: mantener pulsado (cualquier elemento)
  let timer: any = null;
  let mostrado = false;
  el.addEventListener('touchstart', () => {
    mostrado = false;
    timer = setTimeout(() => { mostrado = true; mostrar(0, 0, true); try { navigator.vibrate?.(15); } catch { /* */ } }, 400);
  }, {passive: true});
  el.addEventListener('touchend', () => clearTimeout(timer));
  el.addEventListener('touchmove', () => clearTimeout(timer), {passive: true});
  el.addEventListener('click', e => {
    if (mostrado) { e.preventDefault(); e.stopImmediatePropagation(); mostrado = false; return; }
    // Tocar algo que no es un botón, o cualquier cosa con el modo info activo: abrir la ficha
    if (!esAccion || modoInfo) { e.preventDefault(); e.stopImmediatePropagation(); mostrar(0, 0, true); }
  }, true);
  el.addEventListener('contextmenu', e => e.preventDefault());
}

const MULT = (b: number) => b >= 0 ? (2 + b) / 2 : 2 / (2 - b);

export function tiposEfectivos(mon: Pkm): string[] {
  if (mon.tera && mon.tera !== 'Stellar') return [mon.tera];
  return mon.types || dex().species.get(mon.species).types;
}

export function fichaPokemon(mon: Pkm, esYo: boolean): HTMLElement {
  const d = dex();
  const sp = d.species.get(mon.species);
  const pct = mon.maxhp ? Math.round(Math.max(0, mon.hp / mon.maxhp) * 100) : 0;
  const tiposBase = mon.types || sp.types;
  const filas: any[] = [];

  // Cabecera
  filas.push(h('div', {class: 'ficha-cab'}, iconImg(mon.species),
    h('div', {},
      h('div', {class: 'ficha-nombre'}, mon.name !== sp.baseSpecies && mon.name !== sp.name ? `${mon.name} (${nombreVisible(sp.name)})` : nombreVisible(sp.name),
        h('span', {class: 'tenue'}, tr(` Nv. ${mon.level}`, ` Lv. ${mon.level}`))),
      h('div', {class: 'ficha-tipos'},
        ...(mon.tera ? [h('span', {class: 'tenue tachado'}, ...tiposBase.map(t => tipoBadge(t, true))), ' → ', h('b', {}, 'Tera '), tipoBadge(mon.tera, true)]
          : tiposBase.map(t => tipoBadge(t, true)))))));

  // PS y estado
  const ps = esYo && mon.maxhp !== 100 ? `${mon.hp}/${mon.maxhp} (${pct}%)` : `${pct}%`;
  filas.push(h('div', {class: 'ficha-fila'}, h('b', {}, 'PS: '), mon.fainted ? tr('Debilitado', 'Fainted') : ps,
    mon.status ? h('span', {class: 'estado-tag', style: {background: ESTADO_COLOR[mon.status]}}, ESTADOS_ES[mon.status]) : null));

  // Habilidad
  if (mon.ability) {
    filas.push(h('div', {class: 'ficha-fila'}, h('b', {}, tr('Habilidad: ', 'Ability: ')), nomHab(mon.ability),
      h('div', {class: 'ficha-desc'}, descHab(mon.ability))));
  } else {
    const posibles = [...new Set(Object.values(sp.abilities) as string[])].map(nomHab);
    filas.push(h('div', {class: 'ficha-fila'}, h('b', {}, posibles.length > 1 ? tr('Habilidad posible: ', 'Possible ability: ') : tr('Habilidad: ', 'Ability: ')), posibles.join(' / ')));
  }

  // Objeto
  if (mon.item) {
    filas.push(h('div', {class: 'ficha-fila'}, h('b', {}, tr('Objeto: ', 'Item: ')), itemIcon(mon.item), ' ', nomObj(mon.item)));
  } else if (esYo || (mon as any).itemPerdido) {
    filas.push(h('div', {class: 'ficha-fila'}, h('b', {}, tr('Objeto: ', 'Item: ')), (mon as any).itemPerdido ? tr('Ninguno (lo perdió o lo usó)', 'None (lost or used)') : tr('Ninguno', 'None')));
  } else {
    filas.push(h('div', {class: 'ficha-fila'}, h('b', {}, tr('Objeto: ', 'Item: ')), h('span', {class: 'tenue'}, tr('Desconocido', 'Unknown'))));
  }

  // Estadísticas
  const st = (mon as any).stats;
  if (esYo && st) {
    filas.push(h('div', {class: 'ficha-stats'}, ...['atk', 'def', 'spa', 'spd', 'spe'].map(k => {
      const b = mon.boosts[k] || 0;
      const v = st[k];
      return h('span', {}, h('small', {}, STATS_CORTO[k]), ' ', b ? h('b', {class: b > 0 ? 'sube' : 'baja'}, String(Math.floor(v * MULT(b)))) : String(v));
    })));
  } else {
    filas.push(h('div', {class: 'ficha-stats'}, h('small', {class: 'tenue'}, 'Base: '),
      ...Object.entries(sp.baseStats).map(([k, v]) => h('span', {}, h('small', {}, STATS_CORTO[k]), ' ', String(v)))));
    const min = calcStat('spe', sp.baseStats.spe, 0, 0, mon.level);
    const max = Math.floor(calcStat('spe', sp.baseStats.spe, 31, 252, mon.level) * 1.1);
    filas.push(h('div', {class: 'ficha-fila tenue'}, tr(`Velocidad posible: ${min} a ${max}`, `Possible Speed: ${min} to ${max}`)));
  }
  const boosts = Object.entries(mon.boosts).filter(([, v]) => v);
  if (boosts.length) {
    filas.push(h('div', {class: 'ficha-fila'}, h('b', {}, tr('Cambios: ', 'Boosts: ')),
      boosts.map(([k, v]) => `${STATS_CORTO[k] || k} ${v > 0 ? '+' : ''}${v}`).join(' · ')));
  }

  // Movimientos
  const movs: string[] = esYo ? ((mon as any).moves || []) : ((mon as any).movesVistos || []);
  if (movs.length) {
    filas.push(h('div', {class: 'ficha-movs'}, h('b', {}, esYo ? tr('Movimientos:', 'Moves:') : tr('Movimientos vistos:', 'Moves seen:')),
      ...movs.map(m => {
        const mv = d.moves.get(m);
        return h('div', {class: 'ficha-mov'}, mv.exists ? tipoBadge(mv.type, true) : null, nomMov(m));
      })));
  } else if (!esYo) {
    filas.push(h('div', {class: 'ficha-fila tenue'}, tr('Aún no ha usado ningún movimiento.', "Hasn't used any move yet.")));
  }
  return h('div', {class: 'ficha'}, ...filas);
}

export function fichaMovimiento(id: string, extra: {pp?: number, maxpp?: number, nombre?: string, potencia?: number} = {}): HTMLElement {
  const mv = dex().moves.get(id);
  if (!mv.exists) return h('div', {class: 'ficha'}, nomMov(id));
  const datos = [
    h('span', {}, h('small', {}, tr('Categoría ', 'Category ')), CATEGORIA_ES[mv.category]),
    h('span', {}, h('small', {}, tr('Potencia ', 'Power ')), String(extra.potencia ?? (mv.basePower || '—'))),
    h('span', {}, h('small', {}, tr('Precisión ', 'Accuracy ')), mv.accuracy === true ? '—' : mv.accuracy + '%'),
  ];
  if (extra.maxpp) datos.push(h('span', {}, h('small', {}, 'PP '), `${extra.pp}/${extra.maxpp}`));
  if (mv.priority) datos.push(h('span', {}, h('small', {}, tr('Prioridad ', 'Priority ')), (mv.priority > 0 ? '+' : '') + mv.priority));
  return h('div', {class: 'ficha'},
    h('div', {class: 'ficha-cab'}, h('div', {class: 'ficha-nombre'}, extra.nombre || nomMov(mv.name)), tipoBadge(mv.type, true)),
    h('div', {class: 'ficha-stats'}, ...datos),
    mv.flags['contact'] ? h('div', {class: 'ficha-fila tenue'}, tr('Hace contacto', 'Makes contact')) : null,
    h('div', {class: 'ficha-desc'}, descMov(mv.name)));
}

export {TIPOS_ES};
