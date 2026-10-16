// Avatares de jugador: colección, tickets de gacha, Puntos Victoria (PV) y pantallas de colección y gacha.
import {tr, EN} from './idioma';
import {h, storage, toast, sleep} from './util';
import {registrarCombate, insignia, TipoNivel} from './nivel';
import {experienciaPase, panelPases, PASES, precioPase, estadoPases} from './pases';
import {titulosCombate, revisarTitulos} from './titulos';
import type {Estado} from './estado';

export type Rareza = 'comun' | 'raro' | 'epico' | 'legendario' | 'base';
export type Origen = 'gacha' | 'tienda' | 'pase' | 'historia' | 'base';
export interface Avatar {id: string; nombre: string; autor: string; rareza: Rareza; etiquetas: string[]; origen: Origen}
/** fichas = tickets de gacha sin abrir · pv = Puntos Victoria · premiados = últimos combates que ya dieron premio (para no darlo dos veces) */
export interface Coleccion {fichas: number; pv: number; tengo: {[id: string]: number}; avatar: string; tiradas: number; premiados: string[]}

const W: any = window;
const clave = (s: string) => s.replace(/^[^\p{L}\p{N}]+/u, '');
/** Todos los avatares, ordenados alfabéticamente */
export const AVATARES: Avatar[] = ((W.DATOS_AVATARES || []) as Avatar[]).map(a => ({...a, origen: a.rareza === 'base' ? 'base' : (a.origen || 'gacha')} as Avatar))
  .sort((a, b) => clave(a.nombre).localeCompare(clave(b.nombre), 'es', {sensitivity: 'base'}) || a.id.localeCompare(b.id));
const POR_ID = new Map(AVATARES.map(a => [a.id, a]));
export const AVATAR_BASE = AVATARES.find(a => a.rareza === 'base')?.id || 'sombra';
export const PROB: {[r: string]: number} = {comun: 60, raro: 28, epico: 10, legendario: 2, ...(W.GACHA_PROBABILIDADES || {})};
/** Economía (datos/economia.js), con valores por defecto si falta algo */
const E = W.ECONOMIA || {};
const num = (x: any, d: number) => Number.isFinite(+x) && +x >= 0 ? Math.floor(+x) : d;
export const ECO = {
  pv: {
    ia: {victoria: num(E.pv?.ia?.victoria, 15), derrota: num(E.pv?.ia?.derrota, 3)},
    online: {victoria: num(E.pv?.online?.victoria, 30), derrota: num(E.pv?.online?.derrota, 8)},
    serieGanada: num(E.pv?.serieGanada, 20),
  },
  ticket: num(E.tickets?.uno, 50),
  pack10: num(E.tickets?.pack10, 450),
  avatarPorRareza: {comun: 150, raro: 250, epico: 400, legendario: 650, ...(E.avatarPorRareza || {})} as {[r: string]: number},
  pase: {base: num(E.pase?.base, 300), porRecompensa: num(E.pase?.porRecompensa, 45), descuentoAntiguo: Math.min(1, Math.max(0, +(E.pase?.descuentoAntiguo ?? 0.7)))},
};
/** Turnos mínimos para que un combate dé premio (evita rendiciones al momento) */
const TURNOS_MINIMOS = 3;

export const RAREZAS: {[r in Rareza]: {nombre: string, color: string, estrellas: string}} = {
  base: {nombre: tr('Inicial', 'Starter'), color: '#9aa0bf', estrellas: '◆'},
  comun: {nombre: tr('Común', 'Common'), color: '#8fd18a', estrellas: '★'},
  raro: {nombre: tr('Raro', 'Rare'), color: '#5bb8ff', estrellas: '★★'},
  epico: {nombre: tr('Épico', 'Epic'), color: '#c77dff', estrellas: '★★★'},
  legendario: {nombre: tr('Legendario', 'Legendary'), color: '#ffcb3d', estrellas: '★★★★'},
};
const ETIQUETAS_EN: {[k: string]: string} = {
  Líderes: 'Gym Leaders', Élite: 'Elite Four', Campeones: 'Champions', Protagonistas: 'Protagonists', Rivales: 'Rivals',
  Profesores: 'Professors', Villanos: 'Villains', Comunidad: 'Community', Hologramas: 'Holograms',
};
export const nomEtiqueta = (t: string) => EN ? (ETIQUETAS_EN[t] || t) : t;
/** Orden de los filtros (las etiquetas que no estén aquí van al final) */
const ORDEN_ETIQUETAS = ['Custom', 'Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea',
  'Protagonistas', 'Rivales', 'Líderes', 'Élite', 'Campeones', 'Profesores', 'Villanos', 'Team Rocket', 'Team Magma', 'Team Aqua',
  'Comunidad', 'Hologramas', 'Wow'];
export function etiquetas(): string[] {
  const todas = new Set(AVATARES.flatMap(a => a.etiquetas));
  const pos = (t: string) => { const i = ORDEN_ETIQUETAS.indexOf(t); return i < 0 ? 999 : i; };
  return [...todas].sort((a, b) => pos(a) - pos(b) || a.localeCompare(b, 'es'));
}

// ------------------------------------------------------------- colección --
const CLAVE = 'cnx.coleccion.v1';
let oyentes: (() => void)[] = [];
/** Avisar cuando cambian las fichas o el avatar. 'el' = el aviso se quita solo cuando el elemento sale de la pantalla */
export function alCambiarColeccion(el: HTMLElement, f: () => void) {
  const g = () => { if (!el.isConnected) { oyentes = oyentes.filter(x => x !== g); return; } f(); };
  oyentes.push(g);
}

export function coleccion(): Coleccion {
  const c = storage.get<Partial<Coleccion>>(CLAVE, {});
  const tengo: {[id: string]: number} = {};
  for (const [id, n] of Object.entries(c.tengo || {})) if (POR_ID.has(id) && +n > 0) tengo[id] = Math.floor(+n);
  tengo[AVATAR_BASE] = Math.max(1, tengo[AVATAR_BASE] || 0);
  const avatar = c.avatar && tengo[c.avatar] ? c.avatar : AVATAR_BASE;
  return {fichas: Math.max(0, Math.floor(+(c.fichas || 0))), pv: Math.max(0, Math.floor(+(c.pv || 0))), tengo, avatar, tiradas: c.tiradas || 0,
    premiados: Array.isArray(c.premiados) ? c.premiados.filter(x => typeof x === 'string').slice(-200) : []};
}
/**
 * Cambia la colección de una sola vez: se lee, se cambia y se guarda seguido, así que
 * dos clics muy rápidos no pueden cobrar dos veces (el segundo ya ve el saldo nuevo).
 * Si f devuelve false, no se guarda nada.
 */
export function cambiarColeccion(f: (c: Coleccion) => boolean | void): boolean {
  const c = coleccion();
  if (f(c) === false) return false;
  c.pv = Math.max(0, Math.floor(c.pv));
  c.fichas = Math.max(0, Math.floor(c.fichas));
  guardar(c);
  return true;
}
let revisando = false;
function guardar(c: Coleccion) {
  storage.set(CLAVE, c);
  // Logros de colección (Maestro de Kanto, Completista...). Evita volver a entrar si un título da PV.
  if (!revisando) { revisando = true; try { revisarTitulos(); } catch (e) { console.error(e); } finally { revisando = false; } }
  for (const f of [...oyentes]) { try { f(); } catch (e) { console.error(e); } }
}

export const avatarActual = () => coleccion().avatar;
export function elegirAvatar(id: string) {
  const c = coleccion();
  if (!c.tengo[id]) return;
  c.avatar = id;
  guardar(c);
}
/** Id válido para mostrar (los de otros jugadores pueden venir mal o de otra versión) */
export const avatarValido = (id: any) => typeof id === 'string' && POR_ID.has(id) ? id : AVATAR_BASE;
export const datosAvatar = (id: string) => POR_ID.get(avatarValido(id))!;
export const avatarUrl = (id: string) => `sprites/avatares/${avatarValido(id)}.png`;

/** Sprite de un avatar. modo 'busto' = recorte de la cabeza y el pecho (como Showdown) */
export function avatarImg(id: string, cls = '', modo: 'entero' | 'busto' = 'entero') {
  const a = datosAvatar(id);
  if (modo === 'busto') {
    return h('span', {class: 'avatar-busto ' + cls, title: a.nombre, role: 'img', 'aria-label': a.nombre, style: {backgroundImage: `url("${avatarUrl(a.id)}")`}});
  }
  const img = h('img', {class: 'avatar-img ' + cls, src: avatarUrl(a.id), alt: a.nombre, title: a.nombre, loading: 'lazy', draggable: 'false'});
  img.addEventListener('error', () => { if (!img.src.endsWith(`/${AVATAR_BASE}.png`)) img.src = `sprites/avatares/${AVATAR_BASE}.png`; }, {once: true});
  return img;
}

/** Avatar al azar para la IA */
export const avatarAleatorio = () => AVATARES[Math.floor(Math.random() * AVATARES.length)]?.id || AVATAR_BASE;
/** Holoentrenador al azar (rivales del combate de práctica): avatares con la etiqueta Hologramas */
export function avatarHolograma(): string {
  const holos = AVATARES.filter(a => a.etiquetas.includes('Hologramas'));
  return (holos[Math.floor(Math.random() * holos.length)] || AVATARES[0])?.id || AVATAR_BASE;
}

// ------------------------------------------------------------- premios --
/** Icono del ticket de gacha */
export const iconoTicket = (cls = '') => h('img', {class: 'icono-ticket ' + cls, src: 'img/ticket.png', alt: tr('ticket', 'ticket'), draggable: 'false'});
export const textoPV = (n: number) => `PV ${n}`;

/**
 * Premio al terminar un combate: experiencia de nivel y Puntos Victoria (ganes o pierdas).
 * idCombate: cada combate da premio UNA vez aunque el aviso de fin llegue dos veces.
 */
export function recompensaCombate(tipo: TipoNivel, turnos: number, gano: boolean, serieGanada = false, idCombate = '', estado?: Estado): HTMLElement | null {
  if (turnos < TURNOS_MINIMOS) return h('div', {class: 'recompensa nada'}, tr('Combate demasiado corto: no da experiencia ni PV.', 'Battle too short: no XP or PV.'));
  if (idCombate && coleccion().premiados.includes(idCombate)) return null;
  const nv = registrarCombate(tipo, gano, serieGanada);
  const pv = (gano ? ECO.pv[tipo].victoria : ECO.pv[tipo].derrota) + (serieGanada ? ECO.pv.serieGanada : 0);
  cambiarColeccion(c => { c.pv += pv; if (idCombate) c.premiados.push(idCombate); });
  const temp = experienciaPase(tipo, gano, serieGanada, idCombate);
  titulosCombate(tipo, gano, estado, idCombate);
  if (nv.subio) toast(tr(`¡Has subido al nivel ${nv.nivel}${tipo === 'ia' ? ' contra la IA' : ' online'}!`, `You reached level ${nv.nivel}${tipo === 'ia' ? ' vs the AI' : ' online'}!`), 3800);
  return h('div', {class: 'recompensa'},
    h('span', {}, `+${nv.xp} XP`),
    insignia(tipo, nv.nivel),
    nv.subio ? h('b', {class: 'sube-nivel'}, tr('¡Subes de nivel!', 'Level up!')) : null,
    h('b', {class: 'premio-pv'}, `+${pv} PV`),
    temp.pase && temp.xp ? h('span', {class: 'premio-pase', title: temp.pase.nombre}, tr(`+${temp.xp} exp. de pase`, `+${temp.xp} pass XP`)) : null);
}

/** PV extra (por ejemplo, el invitado online al ganar una serie). Una vez por id. */
export function darPV(n: number, id: string) {
  if (n <= 0) return false;
  return cambiarColeccion(c => { if (c.premiados.includes(id)) return false; c.pv += n; c.premiados.push(id); });
}

// --------------------------------------------------------------- tienda --
/** ok: si se ha comprado · texto: lo que se enseña al jugador */
export type ResultadoCompra = {ok: boolean, texto: string};
/** Avatares que se compran en la tienda */
export const AVATARES_TIENDA = () => AVATARES.filter(a => a.origen === 'tienda');
export const precioAvatarRareza = (r: Rareza) => ECO.avatarPorRareza[r] ?? ECO.avatarPorRareza.raro;
export const precioAvatar = (a: Avatar) => precioAvatarRareza(a.rareza);

export function comprarTickets(n: 1 | 10): ResultadoCompra {
  const precio = n === 10 ? ECO.pack10 : ECO.ticket;
  let ok = false;
  cambiarColeccion(c => { if (c.pv < precio) return false; c.pv -= precio; c.fichas += n; ok = true; });
  return ok ? {ok: true, texto: tr(`+${n} ticket${n > 1 ? 's' : ''}`, `+${n} ticket${n > 1 ? 's' : ''}`)} : {ok: false, texto: tr('No tienes PV suficientes', 'Not enough PV')};
}

export function comprarAvatar(id: string): ResultadoCompra {
  const a = POR_ID.get(id);
  if (!a || a.origen !== 'tienda') return {ok: false, texto: tr('Este entrenador no está en la tienda', 'This trainer is not in the shop')};
  const precio = precioAvatar(a);
  let motivo = '';
  const ok = cambiarColeccion(c => {
    if (c.tengo[id]) { motivo = tr('Ya lo tienes', 'You already own it'); return false; }
    if (c.pv < precio) { motivo = tr('No tienes PV suficientes', 'Not enough PV'); return false; }
    c.pv -= precio; c.tengo[id] = 1;
  });
  return ok ? {ok: true, texto: tr(`¡${a.nombre} es tuyo!`, `${a.nombre} is yours!`)} : {ok: false, texto: motivo};
}

// ---------------------------------------------------------------- gacha --
/** Lo que aún te puede tocar en el gacha (sin repetidos) */
export const pendientesGacha = (c = coleccion()) => AVATARES.filter(a => a.origen === 'gacha' && !c.tengo[a.id]);

function rarezaAlAzar(quedan: Avatar[]): Exclude<Rareza, 'base'> | null {
  // Solo entran las rarezas de las que aún te falta alguno; su probabilidad se reparte entre ellas
  const rs = (['comun', 'raro', 'epico', 'legendario'] as const).filter(r => quedan.some(a => a.rareza === r));
  if (!rs.length) return null;
  const total = rs.reduce((s, r) => s + Math.max(0, PROB[r] || 0), 0);
  if (total <= 0) return rs[Math.floor(Math.random() * rs.length)];
  let x = Math.random() * total;
  for (const r of rs) { x -= Math.max(0, PROB[r] || 0); if (x < 0) return r; }
  return rs[rs.length - 1];
}

/** Gasta un ticket y da un entrenador que NO tengas. null si no hay tickets o ya lo tienes todo (no se gasta nada). */
export function tirar(): {avatar: Avatar, nuevo: true} | null {
  let premio: Avatar | null = null;
  cambiarColeccion(c => {
    if (c.fichas < 1) return false;
    const quedan = pendientesGacha(c);
    const r = rarezaAlAzar(quedan);
    if (!r) return false;
    const pool = quedan.filter(a => a.rareza === r);
    premio = pool[Math.floor(Math.random() * pool.length)];
    c.fichas--; c.tiradas++; c.tengo[premio.id] = 1;
  });
  return premio ? {avatar: premio, nuevo: true} : null;
}

// -------------------------------------------------------------- rejilla --
/**
 * Buscador + filtros + rejilla de entrenadores. Se usa en dos sitios:
 * - 'coleccion' (perfil): SOLO los que tienes; al tocar uno, lo equipas.
 * - 'gacha': el catálogo completo de lo que puede salir; los que no tienes salen bloqueados.
 */
export function rejillaAvatares(modo: 'coleccion' | 'gacha') {
  const pref = modo === 'coleccion' ? 'cnx.col' : 'cnx.gacha';
  let filtros = storage.get<string[]>(pref + '.filtros', []).filter(t => etiquetas().includes(t));
  let rareza = storage.get<string>(pref + '.rareza', '');
  const buscar = h('input', {class: 'input buscador', placeholder: modo === 'coleccion' ? tr('Buscar en tu colección…', 'Search your collection…') : tr('Buscar entrenador…', 'Search trainer…')});
  const chips = h('div', {class: 'filtros-chips'});
  const filtroIn = h('input', {class: 'input filtro-input', placeholder: tr('Filtrar: Kanto, Líderes, Custom…', 'Filter: Kanto, Gym Leaders, Custom…'), autocomplete: 'off'});
  const sugerencias = h('div', {class: 'filtro-sugerencias', role: 'listbox'});
  const cajaFiltro = h('div', {class: 'filtro-caja'}, filtroIn, sugerencias);
  const sinTilde = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const visibles = () => { const c = coleccion(); return modo === 'coleccion' ? AVATARES.filter(a => c.tengo[a.id]) : AVATARES.filter(a => a.origen === 'gacha'); };
  let marcada = 0;
  const opciones = () => {
    const q = sinTilde(filtroIn.value.trim());
    const base = visibles();
    return etiquetas().filter(t => !filtros.includes(t) && base.some(a => a.etiquetas.includes(t)) && (!q || sinTilde(t + ' ' + nomEtiqueta(t)).includes(q)));
  };
  const cerrarSug = () => { sugerencias.classList.remove('abierta'); };
  const pintarSug = () => {
    const ops = opciones();
    const base = visibles();
    marcada = Math.min(marcada, Math.max(0, ops.length - 1));
    sugerencias.innerHTML = '';
    if (!ops.length) sugerencias.append(h('div', {class: 'sug-vacia'}, tr('No hay más filtros', 'No more filters')));
    ops.forEach((t, i) => {
      const n = base.filter(a => a.etiquetas.includes(t)).length;
      sugerencias.append(h('button', {class: 'sug' + (i === marcada ? ' marcada' : ''), type: 'button', role: 'option',
        onmousedown: (e: Event) => e.preventDefault(), onclick: () => anadirFiltro(t)}, nomEtiqueta(t), h('small', {class: 'tenue'}, String(n))));
    });
    sugerencias.classList.add('abierta');
  };
  const guardarFiltros = () => storage.set(pref + '.filtros', filtros);
  const anadirFiltro = (t: string) => {
    if (!filtros.includes(t)) filtros.push(t);
    guardarFiltros();
    filtroIn.value = ''; marcada = 0;
    pintarChips(); pintar();
    if (document.activeElement === filtroIn) pintarSug(); else cerrarSug();
  };
  filtroIn.addEventListener('focus', pintarSug);
  filtroIn.addEventListener('input', () => { marcada = 0; pintarSug(); });
  filtroIn.addEventListener('blur', () => setTimeout(cerrarSug, 120));
  filtroIn.addEventListener('keydown', e => {
    const ops = opciones();
    if (e.key === 'ArrowDown') { e.preventDefault(); marcada = Math.min(ops.length - 1, marcada + 1); pintarSug(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marcada = Math.max(0, marcada - 1); pintarSug(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (ops[marcada]) anadirFiltro(ops[marcada]); }
    else if (e.key === 'Escape') { cerrarSug(); filtroIn.blur(); }
    else if (e.key === 'Backspace' && !filtroIn.value && filtros.length) { filtros.pop(); guardarFiltros(); pintarChips(); pintar(); pintarSug(); }
  });
  const grid = h('div', {class: 'avatares-grid'});
  const contador = h('span', {class: 'tenue'});
  const selRareza = h('select', {class: 'select select-sm'}, h('option', {value: ''}, tr('Todas las rarezas', 'All rarities')),
    ...(['legendario', 'epico', 'raro', 'comun', 'base'] as Rareza[]).map(r => h('option', {value: r}, RAREZAS[r].estrellas + ' ' + RAREZAS[r].nombre)));
  selRareza.value = rareza;
  selRareza.addEventListener('change', () => { rareza = selRareza.value; storage.set(pref + '.rareza', rareza); pintar(); });

  const pintarChips = () => {
    chips.innerHTML = '';
    if (!filtros.length) return;
    chips.append(...filtros.map(t => h('button', {class: 'chip-filtro activo', title: tr('Quitar filtro', 'Remove filter'),
      onclick: () => { filtros = filtros.filter(x => x !== t); guardarFiltros(); pintarChips(); pintar(); }}, nomEtiqueta(t) + ' ✕')),
      h('button', {class: 'chip-limpiar', onclick: () => { filtros = []; guardarFiltros(); pintarChips(); pintar(); }}, tr('Quitar todos', 'Clear all')));
  };

  const pintar = () => {
    const c = coleccion();
    const q = sinTilde(buscar.value.trim());
    grid.innerHTML = '';
    let n = 0;
    for (const a of visibles()) {
      if (filtros.some(t => !a.etiquetas.includes(t))) continue;
      if (rareza && a.rareza !== rareza) continue;
      const copias = c.tengo[a.id] || 0;
      const texto = sinTilde(a.nombre + ' ' + a.autor + ' ' + a.etiquetas.map(nomEtiqueta).join(' '));
      if (q && !texto.includes(q)) continue;
      n++;
      const r = RAREZAS[a.rareza];
      const elegido = c.avatar === a.id;
      const titulo = !copias ? tr(`Bloqueado · puede salir en el gacha (${r.nombre})`, `Locked · can drop from the gacha (${r.nombre})`)
        : modo === 'gacha' ? tr('Ya lo tienes', 'You own it')
        : elegido ? tr('Avatar actual', 'Current avatar') : tr('Usar este avatar', 'Use this avatar');
      const tarjeta = h('div', {class: 'avatar-carta' + (copias ? '' : ' bloqueado') + (elegido && modo === 'coleccion' ? ' elegido' : '') + (copias && modo === 'gacha' ? ' poseido' : ''),
        style: {'--rc': r.color}, tabindex: '0', title: titulo, 'data-id': a.id},
        h('span', {class: 'avatar-rareza'}, r.estrellas),
        copias && modo === 'gacha' ? h('span', {class: 'avatar-tengo'}, '✓') : null,
        avatarImg(a.id),
        h('div', {class: 'avatar-nombre'}, a.nombre),
        h('small', {class: 'avatar-autor'}, a.autor));
      const usar = () => {
        if (modo === 'gacha') { toast(copias ? tr(`${a.nombre}: ya lo tienes. Equípalo desde tu perfil.`, `${a.nombre}: you own it. Equip it from your profile.`) : tr(`🔒 ${a.nombre}: ${r.nombre}. Puede salir al abrir un ticket.`, `🔒 ${a.nombre}: ${r.nombre}. Can drop from a ticket.`)); return; }
        elegirAvatar(a.id);
      };
      tarjeta.addEventListener('click', usar);
      tarjeta.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); usar(); } });
      grid.append(tarjeta);
    }
    contador.textContent = tr(`${n} entrenador${n === 1 ? '' : 'es'}`, `${n} trainer${n === 1 ? '' : 's'}`);
    if (!n) grid.append(h('p', {class: 'tenue centro'}, tr('Ninguno coincide con la búsqueda.', 'Nothing matches the search.')));
  };
  buscar.addEventListener('input', pintar);
  const el = h('div', {class: 'tarjeta avatares-panel'},
    h('div', {class: 'avatares-herramientas'}, buscar, cajaFiltro, selRareza, contador),
    chips, grid);
  pintarChips(); pintar();
  return {el, pintar};
}

/** Cuántos tienes del total que cuenta para la colección */
export function progresoColeccion() {
  const c = coleccion();
  return {tengo: AVATARES.filter(a => c.tengo[a.id]).length, total: AVATARES.length};
}

// --------------------------------------------------------------- gacha --
export function pantallaAvatares(raiz: HTMLElement, volver: () => void) {
  type Pestana = 'gacha' | 'tienda' | 'pases';
  const guardada = storage.get<string>('cnx.pestanaGacha', 'gacha');
  let pestana: Pestana = guardada === 'tienda' || guardada === 'pases' ? guardada : 'gacha';
  const irA = (p: Pestana) => { pestana = p; storage.set('cnx.pestanaGacha', p); pintarPestanas(); pintarCuerpo(); };
  const saldo = h('div', {class: 'saldo'});
  const pestanas = h('div', {class: 'pestanas', role: 'tablist'});
  const cuerpo = h('div', {class: 'gacha-cuerpo'});
  const catalogo = rejillaAvatares('gacha');
  const cab = h('div', {class: 'gacha-cab'});
  const tienda = h('div', {class: 'tienda'});

  const pintarSaldo = () => {
    const c = coleccion();
    saldo.innerHTML = '';
    saldo.append(h('span', {class: 'saldo-pv', title: tr('Puntos Victoria', 'Victory Points')}, textoPV(c.pv)),
      h('span', {class: 'saldo-tickets', title: tr('Tickets de gacha', 'Gacha tickets')}, iconoTicket(), h('b', {}, String(c.fichas))));
  };
  const pintarPestanas = () => {
    pestanas.innerHTML = '';
    for (const [id, txt] of [['gacha', tr('Gacha', 'Gacha')], ['tienda', tr('Tienda', 'Shop')], ['pases', tr('Pases', 'Passes')]] as const)
      pestanas.append(h('button', {class: 'pestana' + (pestana === id ? ' activa' : ''), role: 'tab', 'aria-selected': String(pestana === id), 'data-pestana': id,
        onclick: () => irA(id)}, txt));
  };

  const pintarCab = () => {
    const c = coleccion();
    const quedan = pendientesGacha(c).length;
    const max = Math.min(10, c.fichas, quedan);
    cab.innerHTML = '';
    cab.append(
      h('div', {class: 'gacha-maquina'},
        h('div', {class: 'gacha-fichas'}, iconoTicket('grande'), h('b', {}, String(c.fichas)), h('small', {}, tr('tickets', 'tickets'))),
        h('div', {class: 'gacha-botones'},
          h('button', {class: 'btn', disabled: c.fichas < 1 || !quedan, onclick: () => abrir(1)}, tr('Abrir 1 ticket', 'Open 1 ticket')),
          max >= 2 ? h('button', {class: 'btn btn-sec', onclick: () => abrir(max)}, tr(`Abrir ${max}`, `Open ${max}`)) : null,
          h('button', {class: 'btn btn-sec', onclick: () => irA('tienda')}, tr('Conseguir tickets', 'Get tickets'))),
        !quedan ? h('b', {class: 'gacha-completo'}, tr('¡Tienes todos los entrenadores del gacha!', 'You have every gacha trainer!')) : null,
        h('small', {class: 'tenue gacha-ayuda'},
          tr(`Cada ticket da un entrenador que todavía no tienes: nunca salen repetidos. Los tickets se compran en la Tienda con PV (Puntos Victoria), que ganas en cada combate.`,
            `Each ticket gives a trainer you don't have yet: no duplicates. Buy tickets in the Shop with PV (Victory Points), earned in every battle.`)),
        h('div', {class: 'gacha-probs'}, ...(['comun', 'raro', 'epico', 'legendario'] as Rareza[]).map(r =>
          h('span', {class: 'prob', style: {'--rc': RAREZAS[r].color}}, `${RAREZAS[r].nombre} ${PROB[r]}%`))),
        h('small', {class: 'gacha-col'}, tr(`Te faltan ${quedan} del gacha`, `${quedan} gacha trainers left`))));
  };

  // Botón de compra en dos pasos (Comprar → Confirmar), sin ventanas emergentes
  const botonCompra = (texto: string, precio: number, puede: boolean, comprar: () => ResultadoCompra) => {
    const b = h('button', {class: 'btn btn-compra', disabled: !puede}, texto);
    let armado = false, t = 0;
    b.addEventListener('click', () => {
      if (b.disabled) return;
      if (!armado) {
        armado = true; b.classList.add('confirmar'); b.textContent = tr(`¿Gastar PV ${precio}?`, `Spend PV ${precio}?`);
        t = window.setTimeout(() => { armado = false; b.classList.remove('confirmar'); b.textContent = texto; }, 3500);
        return;
      }
      clearTimeout(t);
      b.disabled = true;           // evita un segundo clic mientras se procesa
      const r = comprar();
      toast(r.texto);
      if (!r.ok) { b.disabled = false; armado = false; b.classList.remove('confirmar'); b.textContent = texto; }
      // al guardarse, la pantalla se repinta con el saldo nuevo
    });
    return b;
  };

  const pintarTienda = () => {
    const c = coleccion();
    const fila = (icono: HTMLElement, titulo: string, sub: string, precio: number, boton: HTMLElement) =>
      h('div', {class: 'tienda-item'}, h('div', {class: 'tienda-icono'}, icono), h('div', {class: 'tienda-texto'}, h('b', {}, titulo), h('small', {class: 'tenue'}, sub)),
        h('span', {class: 'tienda-precio'}, textoPV(precio)), boton);
    tienda.innerHTML = '';
    tienda.append(
      h('h3', {class: 'seccion-titulo'}, tr('Tickets de gacha', 'Gacha tickets')),
      fila(iconoTicket('grande'), tr('1 ticket', '1 ticket'), tr('Un entrenador nuevo del gacha', 'One new gacha trainer'), ECO.ticket,
        botonCompra(tr('Comprar', 'Buy'), ECO.ticket, c.pv >= ECO.ticket, () => comprarTickets(1))),
      fila(h('span', {class: 'pack-tickets'}, iconoTicket('grande'), h('b', {}, '×10')), tr('Pack de 10 tickets', 'Pack of 10 tickets'),
        tr(`Sale a ${Math.round(ECO.pack10 / 10)} PV cada uno`, `${Math.round(ECO.pack10 / 10)} PV each`), ECO.pack10,
        botonCompra(tr('Comprar', 'Buy'), ECO.pack10, c.pv >= ECO.pack10, () => comprarTickets(10))),
      h('h3', {class: 'seccion-titulo'}, tr('Entrenadores de la tienda', 'Shop trainers')),
      h('small', {class: 'tenue'}, tr('Solo se consiguen aquí, no salen en el gacha. El precio depende de la rareza.', 'Only available here, never in the gacha. Price depends on rarity.')),
      h('div', {class: 'tienda-avatares'}, ...AVATARES_TIENDA().map(a => {
        const precio = precioAvatar(a), r = RAREZAS[a.rareza], tengo = !!c.tengo[a.id];
        return h('div', {class: 'avatar-carta tienda-avatar' + (tengo ? ' poseido' : ''), style: {'--rc': r.color}, 'data-id': a.id},
          h('span', {class: 'avatar-rareza'}, r.estrellas),
          avatarImg(a.id),
          h('div', {class: 'avatar-nombre'}, a.nombre),
          h('small', {style: {color: r.color}}, r.nombre),
          tengo ? h('span', {class: 'tienda-tengo'}, tr('Ya lo tienes', 'Owned'))
            : botonCompra(textoPV(precio), precio, c.pv >= precio, () => comprarAvatar(a.id)));
      })),
      h('h3', {class: 'seccion-titulo'}, tr('Pases', 'Passes')),
      h('small', {class: 'tenue'}, tr('El precio depende de cuánto contenido trae cada pase. Los pases anteriores cuestan menos. Los pases no caducan.', 'Price depends on how much each pass contains. Older passes cost less. Passes never expire.')),
      ...PASES.map(p => fila(p.imagen ? h('img', {class: 'icono-ticket grande', src: p.imagen, alt: ''}) : h('span', {}),
        p.nombre, tr(`${p.niveles.length} recompensas`, `${p.niveles.length} rewards`) + (estadoPases().pases[p.id] ? tr(' · ya lo tienes', ' · owned') : ''), precioPase(p),
        h('button', {class: 'btn btn-sec', onclick: () => irA('pases')}, tr('Ver pase', 'View pass')))));
  };

  const pintarCuerpo = () => {
    cuerpo.innerHTML = '';
    if (pestana === 'gacha') { pintarCab(); cuerpo.append(cab, h('h3', {class: 'seccion-titulo'}, tr('Entrenadores que pueden salir', 'Trainers you can get')), catalogo.el); catalogo.pintar(); }
    else if (pestana === 'tienda') { pintarTienda(); cuerpo.append(tienda); }
    else cuerpo.append(panelPases(botonCompra).el);
  };

  async function abrir(veces: number) {
    const res: NonNullable<ReturnType<typeof tirar>>[] = [];
    for (let i = 0; i < veces; i++) { const r = tirar(); if (!r) break; res.push(r); }
    if (!res.length) return;
    await mostrarResultados(res);
  }

  raiz.innerHTML = '';
  raiz.append(
    h('header', {class: 'barra'}, h('button', {class: 'btn btn-sec', onclick: volver}, tr('← Inicio', '← Home')), h('h2', {}, tr('Gacha, tienda y pases', 'Gacha, shop & passes')), saldo),
    pestanas, cuerpo);
  pintarSaldo(); pintarPestanas(); pintarCuerpo();
  alCambiarColeccion(cuerpo, () => { pintarSaldo(); pintarCuerpo(); });
}

/** Animación de apertura y resultados */
async function mostrarResultados(res: {avatar: Avatar, nuevo: boolean}[]) {
  const orden: Rareza[] = ['comun', 'raro', 'epico', 'legendario'];
  const mejor = res.reduce((m, r) => orden.indexOf(r.avatar.rareza) > orden.indexOf(m) ? r.avatar.rareza : m, 'comun' as Rareza);
  const fondo = h('div', {class: 'gacha-modal', style: {'--rc': RAREZAS[mejor].color}});
  const capsula = h('div', {class: 'gacha-capsula'}, h('span', {class: 'cap-arriba'}), h('span', {class: 'cap-abajo'}), h('span', {class: 'cap-boton'}));
  const caja = h('div', {class: 'gacha-caja'}, capsula, h('div', {class: 'tenue'}, tr('Abriendo…', 'Opening…')));
  fondo.append(caja);
  document.body.append(fondo);
  let saltar = false;
  fondo.addEventListener('click', () => { saltar = true; });
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < 12 && !saltar; i++) await sleep(100);
  }
  caja.innerHTML = '';
  const cerrar = () => fondo.remove();
  const tarjetas = res.map((r, i) => {
    const ra = RAREZAS[r.avatar.rareza];
    return h('div', {class: 'gacha-premio r-' + r.avatar.rareza, style: {'--rc': ra.color, animationDelay: (i * 0.08) + 's'}},
      h('span', {class: 'avatar-rareza'}, ra.estrellas),
      h('span', {class: 'premio-nuevo'}, tr('¡NUEVO!', 'NEW!')),
      avatarImg(r.avatar.id),
      h('div', {class: 'avatar-nombre'}, r.avatar.nombre),
      h('small', {style: {color: ra.color}}, ra.nombre));
  });
  const uno = res.length === 1 ? res[0] : null;
  caja.append(
    h('h3', {}, res.length > 1 ? tr(`¡${res.length} tickets abiertos!`, `${res.length} tickets opened!`) : tr('¡Ticket abierto!', 'Ticket opened!')),
    h('div', {class: 'gacha-premios' + (uno ? ' uno' : '')}, ...tarjetas),
    h('div', {class: 'fin-botones'},
      uno ? h('button', {class: 'btn', onclick: (e: Event) => { e.stopPropagation(); elegirAvatar(uno.avatar.id); cerrar(); }}, tr('Usar ahora', 'Use now')) : null,
      h('button', {class: 'btn btn-sec', onclick: (e: Event) => { e.stopPropagation(); cerrar(); }}, tr('Cerrar', 'Close'))));
  fondo.addEventListener('click', e => { if (e.target === fondo) cerrar(); });
}
